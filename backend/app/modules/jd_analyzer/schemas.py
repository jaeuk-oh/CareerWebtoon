from pydantic import BaseModel
from typing import Optional, List

class JDCreateRequest(BaseModel):
    company_name: Optional[str] = None
    position: Optional[str] = None
    jd_raw_text: str

class JobRequirementItem(BaseModel):
    competency: str
    priority: int  # 1-5
    is_explicit: bool
    description: Optional[str] = None

class JDAnalysisResponse(BaseModel):
    id: str
    company_name: Optional[str] = None
    position: Optional[str] = None
    requirements: List[JobRequirementItem]
    hidden_requirements: List[JobRequirementItem]
    culture_keywords: List[str]
    message: str

class JobResponse(BaseModel):
    id: str
    user_id: str
    company_name: Optional[str] = None
    position: Optional[str] = None
    jd_raw_text: str
    jd_analysis: Optional[dict] = None
    created_at: str
