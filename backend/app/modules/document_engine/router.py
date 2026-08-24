from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
from app.db.session import get_db
from app.core.security import get_current_user
from app.core.usage import check_usage_quota, record_usage
from .schemas import (
    GenerateRequest,
    GeneratedDocResponse,
    DocumentListResponse,
    UpdateDocumentRequest,
    RewriteRequest,
    RewriteResponse,
)
from .service import DocumentEngineService

router = APIRouter(prefix="/documents", tags=["documents"])

@router.post("/generate", response_model=GeneratedDocResponse)
async def generate_document(
    data: GenerateRequest,
    current_user: dict = Depends(get_current_user),
    _quota: None = Depends(check_usage_quota),
    db: AsyncSession = Depends(get_db)
):
    service = DocumentEngineService(db)
    result = await service.generate_document(data, current_user["sub"])
    await record_usage(db, current_user["sub"], "document_engine")
    return result

@router.post("/generate/stream")
async def generate_document_stream(
    data: GenerateRequest,
    current_user: dict = Depends(get_current_user),
    _quota: None = Depends(check_usage_quota),
    db: AsyncSession = Depends(get_db)
):
    service = DocumentEngineService(db)
    # Recorded up front, not after the stream ends: once StreamingResponse starts
    # sending bytes there's no later point to hook a "did this actually succeed"
    # check into, and the quota dependency above already confirmed the user had
    # allowance left. The tradeoff is a stream that fails immediately still costs
    # one unit — acceptable next to the alternative of never metering streamed
    # generation at all.
    await record_usage(db, current_user["sub"], "document_engine")
    return StreamingResponse(
        service.generate_document_stream(data, current_user["sub"]),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"}
    )

@router.get("/{job_id}/list", response_model=List[DocumentListResponse])
async def list_documents(
    job_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    service = DocumentEngineService(db)
    return await service.list_documents(job_id, current_user["sub"])

@router.put("/{doc_id}", response_model=GeneratedDocResponse)
async def update_document(
    doc_id: str,
    data: UpdateDocumentRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Only reextract_claims actually calls the LLM (a plain content save doesn't), so
    # the quota check/charge is gated on that flag rather than being an unconditional
    # Depends — the editor's autosave must stay free.
    if data.reextract_claims:
        await check_usage_quota(current_user, db)
    service = DocumentEngineService(db)
    result = await service.update_document(
        doc_id, current_user["sub"], data.content, data.reextract_claims
    )
    if data.reextract_claims:
        await record_usage(db, current_user["sub"], "document_engine")
    return result

@router.post("/{doc_id}/rewrite", response_model=RewriteResponse)
async def rewrite_span(
    doc_id: str,
    data: RewriteRequest,
    current_user: dict = Depends(get_current_user),
    _quota: None = Depends(check_usage_quota),
    db: AsyncSession = Depends(get_db)
):
    service = DocumentEngineService(db)
    result = await service.rewrite_span(doc_id, current_user["sub"], data.claim_text, data.instruction)
    await record_usage(db, current_user["sub"], "document_engine")
    return result

@router.get("/{doc_id}", response_model=GeneratedDocResponse)
async def get_document(
    doc_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    service = DocumentEngineService(db)
    doc = await service.get_document(doc_id, current_user["sub"])
    if not doc:
        raise HTTPException(status_code=404, detail="문서를 찾을 수 없습니다.")
    return doc
