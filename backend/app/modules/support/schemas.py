from pydantic import BaseModel, Field


class ContactInquiryCreate(BaseModel):
    message: str = Field(min_length=1, max_length=4000)
    email: str | None = Field(default=None, max_length=320)


class ContactInquiryResponse(BaseModel):
    id: str
    created_at: str
