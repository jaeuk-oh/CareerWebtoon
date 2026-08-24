from pydantic import BaseModel


class WebInsight(BaseModel):
    topic: str
    summary: str
    source_url: str | None = None


class PredictedQuestion(BaseModel):
    question: str
    category: str
    rationale: str
    source_hint: str | None = None


class SourceItem(BaseModel):
    title: str
    url: str


class InterviewResearchResponse(BaseModel):
    job_id: str
    web_insights: list[WebInsight]
    predicted_questions: list[PredictedQuestion]
    keywords: list[str]
    sources: list[SourceItem]
    cached: bool
    created_at: str
