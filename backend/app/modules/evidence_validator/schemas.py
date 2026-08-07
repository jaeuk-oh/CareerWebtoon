from pydantic import BaseModel
from typing import Optional, List

class ValidateRequest(BaseModel):
    generated_document_id: str

class ClaimValidation(BaseModel):
    claim_id: str
    claim_text: str
    status: str
    evidence_text: Optional[str] = None
    defense_score: float
    issues: List[str]

class ValidationResponse(BaseModel):
    document_id: str
    total_claims: int
    verified: int
    flagged: int
    unverified: int
    overall_score: float
    claims: List[ClaimValidation]
    message: str
