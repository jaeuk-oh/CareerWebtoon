from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class ExperienceCreate(BaseModel):
    """Create a new experience."""
    title: str = Field(min_length=1, max_length=255)
    company: Optional[str] = None
    role: Optional[str] = None
    period: Optional[str] = None
    description: Optional[str] = None
    skills: list[str] = Field(default_factory=list)
    source_document_id: Optional[str] = None

class ExperienceUpdate(BaseModel):
    """Update an existing experience."""
    title: Optional[str] = None
    company: Optional[str] = None
    role: Optional[str] = None
    period: Optional[str] = None
    description: Optional[str] = None
    skills: Optional[list[str]] = None

class ExperienceResponse(BaseModel):
    """Experience response."""
    id: str
    user_id: str
    title: str
    company: Optional[str] = None
    role: Optional[str] = None
    period: Optional[str] = None
    description: Optional[str] = None
    skills: list[str] = Field(default_factory=list)
    source_document_id: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

class ExperienceExtractRequest(BaseModel):
    """Request to extract experiences from a document."""
    document_id: str

class ExperienceExtractResponse(BaseModel):
    """Response after extracting experiences."""
    extracted_count: int
    experiences: list[ExperienceResponse]
    message: str

class VaultSummary(BaseModel):
    """Summary of the candidate vault."""
    total_experiences: int
    total_documents: int
    skills: list[str]
