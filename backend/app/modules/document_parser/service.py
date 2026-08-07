import io
import json
import logging
from fastapi import UploadFile, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
import pypdf
from docx import Document as DocxDocument
from app.services.llm_gateway import LLMGateway
from .schemas import ParsedDocument, ParsedSection

logger = logging.getLogger(__name__)

SUPPORTED_TYPES = {
    "application/pdf": "pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
    "text/plain": "txt",
}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB

PARSE_SYSTEM_PROMPT = """You are a document parser for Korean job application documents.
Extract structured sections from the provided text.
Return JSON with this exact structure:
{
  "document_type": "resume" | "cover_letter" | "career_desc" | "portfolio" | "other",
  "sections": [
    {
      "section_type": "experience" | "education" | "project" | "skill" | "certification" | "activity" | "award" | "other",
      "title": "section title",
      "organization": "company/school name or null",
      "period": "date range or null",
      "description": "brief description or null",
      "details": ["detail1", "detail2"]
    }
  ],
  "summary": "One-line summary of the document"
}
Be thorough - extract ALL sections. Keep Korean text as-is. Do NOT invent information."""

class DocumentParserService:
    def __init__(self, db: AsyncSession, llm: LLMGateway):
        self.db = db
        self.llm = llm

    def _extract_text_pdf(self, content: bytes) -> str:
        reader = pypdf.PdfReader(io.BytesIO(content))
        pages = [page.extract_text() for page in reader.pages if page.extract_text()]
        return "\n".join(pages)

    def _extract_text_docx(self, content: bytes) -> str:
        doc = DocxDocument(io.BytesIO(content))
        return "\n".join([p.text for p in doc.paragraphs if p.text.strip()])

    async def parse_upload(self, file: UploadFile, user_id: str) -> dict:
        # 1. Validate file type
        content_type = file.content_type or ""
        if content_type not in SUPPORTED_TYPES and not content_type.startswith("text/"):
            raise HTTPException(
                status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
                detail=f"Unsupported file type: {content_type}. Use PDF, DOCX, or TXT."
            )

        # 2. Read and validate size
        content = await file.read()
        if len(content) > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail="File size exceeds 10MB limit."
            )

        # 3. Extract text
        if content_type == "application/pdf":
            raw_text = self._extract_text_pdf(content)
        elif content_type == "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
            raw_text = self._extract_text_docx(content)
        else:
            raw_text = content.decode("utf-8", errors="replace")

        if not raw_text.strip():
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Could not extract text from the uploaded file."
            )

        # 4. LLM parsing
        try:
            parsed = await self.llm.generate_json(
                prompt=f"Parse the following document:\n\n{raw_text[:8000]}",
                system_prompt=PARSE_SYSTEM_PROMPT,
                max_tokens=4096
            )
        except Exception as e:
            logger.error(f"LLM parsing failed: {e}")
            parsed = {"document_type": "other", "sections": [], "summary": None}

        doc_type = parsed.get("document_type", "other")

        # 5. Save to database
        result = await self.db.execute(
            text("""
                INSERT INTO documents (user_id, doc_type, file_name, raw_text, parsed_data)
                VALUES (:user_id, :doc_type, :file_name, :raw_text, :parsed_data)
                RETURNING id, created_at
            """),
            {
                "user_id": user_id,
                "doc_type": doc_type,
                "file_name": file.filename,
                "raw_text": raw_text,
                "parsed_data": json.dumps(parsed, ensure_ascii=False),
            }
        )
        row = result.fetchone()

        return {
            "id": str(row[0]),
            "file_name": file.filename,
            "doc_type": doc_type,
            "sections_count": len(parsed.get("sections", [])),
            "message": f"Document parsed successfully. {len(parsed.get('sections', []))} sections extracted."
        }

    async def get_documents(self, user_id: str) -> list[dict]:
        result = await self.db.execute(
            text("SELECT id, doc_type, file_name, parsed_data, created_at FROM documents WHERE user_id = :user_id ORDER BY created_at DESC"),
            {"user_id": user_id}
        )
        rows = result.fetchall()
        return [
            {
                "id": str(r[0]),
                "doc_type": r[1],
                "file_name": r[2],
                "parsed_data": json.loads(r[3]) if r[3] else None,
                "created_at": r[4].isoformat() if r[4] else None,
            }
            for r in rows
        ]

    async def get_document(self, doc_id: str, user_id: str) -> dict:
        result = await self.db.execute(
            text("SELECT id, user_id, doc_type, file_name, raw_text, parsed_data, created_at FROM documents WHERE id = :id AND user_id = :user_id"),
            {"id": doc_id, "user_id": user_id}
        )
        row = result.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Document not found")
        return {
            "id": str(row[0]),
            "user_id": str(row[1]),
            "doc_type": row[2],
            "file_name": row[3],
            "raw_text": row[4],
            "parsed_data": json.loads(row[5]) if row[5] else None,
            "created_at": row[6].isoformat() if row[6] else None,
        }
