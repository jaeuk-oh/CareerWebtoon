from pydantic import BaseModel
from typing import List, Optional, Dict, Any

class StrategyRequest(BaseModel):
    job_id: str

class GapItem(BaseModel):
    competency: str
    gap_type: str  # no_experience/weak_evidence/no_metric
    suggestion: str

class StrategyResponse(BaseModel):
    id: str
    job_id: str
    primary_experience: Optional[Dict[str, Any]] = None
    secondary_experience: Optional[Dict[str, Any]] = None
    gaps: List[GapItem]
    excluded_reasons: List[Dict[str, Any]]
    strategy_text: str
    message: str
