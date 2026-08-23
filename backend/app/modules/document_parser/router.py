from fastapi import APIRouter, Depends, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.services.llm_gateway import get_llm_gateway, LLMGateway
from app.core.security import get_current_user
from app.core.usage import check_usage_quota, record_usage
from .service import DocumentParserService
from .schemas import DocumentUploadResponse

router = APIRouter()

def get_service(db: AsyncSession = Depends(get_db), llm: LLMGateway = Depends(get_llm_gateway)):
    return DocumentParserService(db=db, llm=llm)

@router.post("/upload", response_model=DocumentUploadResponse)
async def upload_document(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
    _quota: None = Depends(check_usage_quota),
    service: DocumentParserService = Depends(get_service),
    db: AsyncSession = Depends(get_db),
):
    """Upload and parse a document (PDF, DOCX, TXT)."""
    result = await service.parse_upload(file, user_id=current_user["sub"])
    await record_usage(db, current_user["sub"], "document_parser")
    return result

@router.get("")
async def list_documents(
    current_user: dict = Depends(get_current_user),
    service: DocumentParserService = Depends(get_service),
):
    """List all uploaded documents for the current user."""
    return await service.get_documents(user_id=current_user["sub"])

@router.get("/{doc_id}")
async def get_document(
    doc_id: str,
    current_user: dict = Depends(get_current_user),
    service: DocumentParserService = Depends(get_service),
):
    """Get a specific document with parsed data."""
    return await service.get_document(doc_id=doc_id, user_id=current_user["sub"])
