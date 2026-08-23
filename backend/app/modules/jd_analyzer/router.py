from fastapi import APIRouter, Depends
from typing import List
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.security import get_current_user
from app.core.usage import check_usage_quota, record_usage
from app.db.session import get_db
from app.modules.jd_analyzer.schemas import JDCreateRequest, JDAnalysisResponse, JobResponse
from app.modules.jd_analyzer.service import JDAnalyzerService

router = APIRouter()
service = JDAnalyzerService()

@router.post("", response_model=JDAnalysisResponse)
async def analyze_jd(
    data: JDCreateRequest,
    user: dict = Depends(get_current_user),
    _quota: None = Depends(check_usage_quota),
    db: AsyncSession = Depends(get_db),
):
    result = await service.analyze_jd(data, user["sub"])
    await record_usage(db, user["sub"], "jd_analyzer")
    return result

@router.get("", response_model=List[JobResponse])
async def list_jobs(user: dict = Depends(get_current_user)):
    return await service.list_jobs(user["sub"])

@router.get("/{job_id}", response_model=JobResponse)
async def get_job(job_id: str, user: dict = Depends(get_current_user)):
    return await service.get_job(job_id, user["sub"])

@router.delete("/{job_id}")
async def delete_job(job_id: str, user: dict = Depends(get_current_user)):
    return await service.delete_job(job_id, user["sub"])
