from pydantic import BaseModel
from typing import Optional

class GenerateRequest(BaseModel):
    job_id: str
    doc_type: str
    options: Optional[dict] = None

class GeneratedDocResponse(BaseModel):
    id: str
    job_id: str
    doc_type: str
    content: str
    version: int
    claims_count: int
    created_at: str

class DocumentListResponse(BaseModel):
    id: str
    job_id: str
    doc_type: str
    version: int
    created_at: str
