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


class PersonalAngle(BaseModel):
    """One link between what the research says this team cares about and what the
    applicant actually wrote, plus the question that connection invites."""

    company_signal: str
    my_material: str
    interviewer_question: str
    what_i_am_testing: str | None = None
    risk: str | None = None


class SourceItem(BaseModel):
    title: str
    url: str


class CachedResearchItem(BaseModel):
    """A saved research row, for showing the user what's occupying their cache slots."""

    job_id: str
    company_name: str | None = None
    position: str | None = None
    updated_at: str


class InterviewResearchResponse(BaseModel):
    job_id: str
    web_insights: list[WebInsight]
    predicted_questions: list[PredictedQuestion]
    keywords: list[str]
    personal_angles: list[PersonalAngle] = []
    sources: list[SourceItem]
    cached: bool
    created_at: str
