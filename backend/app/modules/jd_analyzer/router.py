from fastapi import APIRouter, Depends
from typing import List
from app.core.security import get_current_user
from app.modules.jd_analyzer.schemas import JDCreateRequest, JDAnalysisResponse, JobResponse
from app.modules.jd_analyzer.service import JDAnalyzerService

router = APIRouter()
service = JDAnalyzerService()

@router.post("", response_model=JDAnalysisResponse)
async def analyze_jd(data: JDCreateRequest, user: dict = Depends(get_current_user)):
    return await service.analyze_jd(data, user["sub"])

@router.get("", response_model=List[JobResponse])
async def list_jobs(user: dict = Depends(get_current_user)):
    return await service.list_jobs(user["sub"])

@router.get("/{job_id}", response_model=JobResponse)
async def get_job(job_id: str, user: dict = Depends(get_current_user)):
    return await service.get_job(job_id, user["sub"])

@router.delete("/{job_id}")
async def delete_job(job_id: str, user: dict = Depends(get_current_user)):
    return await service.delete_job(job_id, user["sub"])
