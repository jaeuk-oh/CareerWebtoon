from pydantic import BaseModel
from typing import List, Optional

class MatchRequest(BaseModel):
    job_id: str

class MatchItem(BaseModel):
    experience_id: str
    experience_title: str
    anchor_id: Optional[str] = None
    anchor_type: Optional[str] = None
    match_score: float
    match_type: str  # pilsal/mipsal/bilsal
    rationale: str

class MatchResponse(BaseModel):
    job_id: str
    matches: List[MatchItem]
    coverage_score: float
    message: str
