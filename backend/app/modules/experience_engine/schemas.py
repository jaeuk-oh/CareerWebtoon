from pydantic import BaseModel, Field
from typing import Optional

# --- 3C4P Schemas ---
class CustomerTier(BaseModel):
    """One layer of beneficiary. Work usually serves an end user (primary) and an
    internal colleague who handles it (secondary); naming both is what separates a
    real customer analysis from a restatement of the task."""

    who: Optional[str] = None
    needs: Optional[str] = None

class CustomerAnalysis(BaseModel):
    primary: Optional[CustomerTier] = None
    secondary: Optional[CustomerTier] = None

class CompanyContext(BaseModel):
    organization: Optional[str] = None
    team: Optional[str] = None
    role: Optional[str] = None
    goal: Optional[str] = Field(None, description="What the applicant set out to achieve")
    problem: Optional[str] = Field(None, description="The situation that made this necessary")
    cause: Optional[str] = Field(None, description="Why the problem existed — kept apart from the problem itself")

class CompetitorAnalysis(BaseModel):
    researched: Optional[str] = Field(None, description="What was studied — prior art, a predecessor's material, current guidelines")
    findings: list[str] = Field(default_factory=list, description="What the research turned up")

class PlaceActions(BaseModel):
    actual_actions: list[str] = Field(default_factory=list, description="Concrete actions taken, step by step")

class ProductResults(BaseModel):
    result: Optional[str] = Field(None, description="The outcome, with figures where they exist")
    significance: list[str] = Field(default_factory=list, description="Why that outcome mattered")

class PriceEfficiency(BaseModel):
    productivity: list[str] = Field(default_factory=list, description="What got cheaper — repeated checks, judgement calls, cost")

class PromotionSpread(BaseModel):
    sharing: Optional[str] = Field(None, description="How the result was shared, spread, or handed over")

class ThreeCFourPResponse(BaseModel):
    id: str
    experience_id: str
    headline: Optional[str] = Field(None, description="One line: what was done and what it produced")
    customer: Optional[CustomerAnalysis] = None
    company_context: Optional[CompanyContext] = None
    competitor: Optional[CompetitorAnalysis] = None
    place: Optional[PlaceActions] = None
    product: Optional[ProductResults] = None
    price: Optional[PriceEfficiency] = None
    promotion: Optional[PromotionSpread] = None

# --- Evidence Schemas ---
class EvidenceItem(BaseModel):
    id: Optional[str] = None
    claim: str
    evidence_text: Optional[str] = None
    source: Optional[str] = None
    status: str = "UNKNOWN"  # SUPPORTED, UNSUPPORTED, UNKNOWN
    is_quantitative: bool = False

class MetricItem(BaseModel):
    id: Optional[str] = None
    metric_type: str = "INPUT"  # INPUT, OUTPUT, DERIVED
    before_value: Optional[str] = None
    after_value: Optional[str] = None
    unit: Optional[str] = None
    raw_number: bool = True

# --- Anchor Schemas ---
class AnchorItem(BaseModel):
    id: Optional[str] = None
    anchor_type: str
    summary: Optional[str] = None
    skills: list[str] = Field(default_factory=list)

# --- Request/Response ---
class SaveThreeCFourPRequest(BaseModel):
    """
    Persists a user's own 3C4P breakdown, entered by hand rather than produced by
    decompose(). Same shape as ThreeCFourPResponse minus the row identifiers, so a
    manual entry and an AI decomposition are indistinguishable once saved.
    """
    headline: Optional[str] = None
    customer: Optional[CustomerAnalysis] = None
    company_context: Optional[CompanyContext] = None
    competitor: Optional[CompetitorAnalysis] = None
    place: Optional[PlaceActions] = None
    product: Optional[ProductResults] = None
    price: Optional[PriceEfficiency] = None
    promotion: Optional[PromotionSpread] = None


class DecomposeRequest(BaseModel):
    experience_id: str

class DecomposeResponse(BaseModel):
    three_c_four_p: ThreeCFourPResponse
    evidence: list[EvidenceItem]
    anchors: list[AnchorItem]
    experience_grade: Optional[str] = None  # pilsal, mipsal, bilsal (initial classification without JD)
    message: str
