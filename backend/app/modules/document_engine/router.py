from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
from app.db.session import get_db
from app.core.security import get_current_user
from .schemas import GenerateRequest, GeneratedDocResponse, DocumentListResponse
from .service import DocumentEngineService

router = APIRouter(prefix="/documents", tags=["documents"])

@router.post("/generate", response_model=GeneratedDocResponse)
async def generate_document(
    data: GenerateRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    service = DocumentEngineService(db)
    return await service.generate_document(data, current_user["sub"])

@router.get("/{job_id}/list", response_model=List[DocumentListResponse])
async def list_documents(
    job_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    service = DocumentEngineService(db)
    return await service.list_documents(job_id, current_user["sub"])

@router.get("/{doc_id}", response_model=GeneratedDocResponse)
async def get_document(
    doc_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    service = DocumentEngineService(db)
    doc = await service.get_document(doc_id, current_user["sub"])
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return doc
