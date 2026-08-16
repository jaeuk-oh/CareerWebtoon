from pydantic import BaseModel
from typing import Optional, List

class DefenseRequest(BaseModel):
    generated_document_id: str

class DefenseQuestion(BaseModel):
    id: str
    claim_text: str
    question: str
    difficulty: str
    expected_answer_hint: Optional[str] = None

class DefenseResponse(BaseModel):
    document_id: str
    questions: List[DefenseQuestion]
    flagged_claims_count: int
    message: str

class AnswerFeedbackRequest(BaseModel):
    question: str
    claim_text: str
    expected_answer_hint: Optional[str] = None
    user_answer: str

class AnswerFeedbackResponse(BaseModel):
    feedback: str
    is_strong: bool
    score_delta: int
