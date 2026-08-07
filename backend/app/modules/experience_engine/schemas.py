from pydantic import BaseModel, Field
from typing import Optional

# --- 3C4P Schemas ---
class CustomerAnalysis(BaseModel):
    target: Optional[str] = Field(None, description="Who was the work for?")
    problem: Optional[str] = Field(None, description="What was the customer's problem?")
    needs: Optional[str] = Field(None, description="What were the customer's needs?")

class CompanyContext(BaseModel):
    organization: Optional[str] = None
    team: Optional[str] = None
    role: Optional[str] = None
    situation: Optional[str] = Field(None, description="Context/challenges at the time")
    opportunity: Optional[str] = None

class CompetitorAnalysis(BaseModel):
    research: Optional[str] = Field(None, description="What was researched?")
    references: Optional[str] = Field(None, description="What was referenced?")
    alternatives: Optional[str] = Field(None, description="What alternatives were compared?")

class PlaceActions(BaseModel):
    actual_actions: list[str] = Field(default_factory=list, description="Concrete actions taken")

class ProductResults(BaseModel):
    deliverables: list[str] = Field(default_factory=list, description="Outputs/deliverables")
    results: list[str] = Field(default_factory=list, description="Outcomes/effects")

class PriceEfficiency(BaseModel):
    time_invested: Optional[str] = None
    cost_saved: Optional[str] = None
    efficiency_gain: Optional[str] = None

class PromotionSpread(BaseModel):
    sharing: Optional[str] = Field(None, description="How results were shared/communicated")
    impact: Optional[str] = Field(None, description="Wider impact or reach")

class ThreeCFourPResponse(BaseModel):
    id: str
    experience_id: str
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
class DecomposeRequest(BaseModel):
    experience_id: str

class DecomposeResponse(BaseModel):
    three_c_four_p: ThreeCFourPResponse
    evidence: list[EvidenceItem]
    anchors: list[AnchorItem]
    experience_grade: Optional[str] = None  # pilsal, mipsal, bilsal (initial classification without JD)
    message: str
