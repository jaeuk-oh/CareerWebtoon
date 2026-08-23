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


class UpdateDocumentRequest(BaseModel):
    content: str
    # Re-deriving claims costs an LLM call, so the editor autosaves with this off and
    # only turns it on right before validating.
    reextract_claims: bool = False


class RewriteRequest(BaseModel):
    claim_text: str
    instruction: Optional[str] = None


class RewriteResponse(BaseModel):
    original: str
    rewritten: str
    rationale: str
