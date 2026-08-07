from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class ParsedSection(BaseModel):
    """A section extracted from a document."""
    section_type: str = Field(description="Type: education, experience, project, skill, certification, activity, award, other")
    title: str
    organization: Optional[str] = None
    period: Optional[str] = None
    description: Optional[str] = None
    details: list[str] = Field(default_factory=list)

class ParsedDocument(BaseModel):
    """Structured result of document parsing."""
    document_type: str = Field(description="Detected type: resume, cover_letter, career_desc, portfolio, other")
    sections: list[ParsedSection] = Field(default_factory=list)
    raw_text: str
    summary: Optional[str] = None

class DocumentUploadResponse(BaseModel):
    """Response after uploading and parsing a document."""
    id: str
    file_name: str
    doc_type: str
    sections_count: int
    message: str

class DocumentResponse(BaseModel):
    """Full document response."""
    id: str
    user_id: str
    doc_type: str
    file_name: Optional[str] = None
    raw_text: Optional[str] = None
    parsed_data: Optional[dict] = None
    created_at: datetime
