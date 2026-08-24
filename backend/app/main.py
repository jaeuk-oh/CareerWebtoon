from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError

from app.core.config import get_settings
from app.core.exceptions import (
    AppException,
    app_exception_handler,
    generic_exception_handler,
    validation_exception_handler
)
from app.modules.health.router import router as health_router
from app.modules.document_parser.router import router as document_router
from app.modules.candidate_vault.router import router as vault_router
from app.modules.experience_engine.router import router as experience_engine_router
from app.modules.jd_analyzer.router import router as jd_router
from app.modules.matching_engine.router import router as matching_router
from app.modules.strategy_engine.router import router as strategy_router
from app.modules.document_engine.router import router as document_engine_router
from app.modules.evidence_validator.router import router as evidence_validator_router
from app.modules.defense_engine.router import router as defense_engine_router
from app.modules.billing.router import router as billing_router
from app.modules.support.router import router as support_router
from app.modules.interview_research.router import router as interview_research_router

settings = get_settings()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup logic here
    yield
    # Shutdown logic here

app = FastAPI(
    title="CareerCraft API",
    version="0.1.0",
    description="AI 취업 코파일럿 백엔드 API",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_exception_handler(AppException, app_exception_handler)
app.add_exception_handler(Exception, generic_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)

app.include_router(health_router, prefix="/api/v1/health", tags=["health"])
app.include_router(document_router, prefix="/api/v1/documents", tags=["documents"])
app.include_router(vault_router, prefix="/api/v1/experiences", tags=["experiences"])
app.include_router(experience_engine_router, prefix="/api/v1", tags=["experience-engine"])
app.include_router(jd_router, prefix="/api/v1/jobs", tags=["jobs"])
app.include_router(matching_router, prefix="/api/v1/matching", tags=["matching"])
app.include_router(strategy_router, prefix="/api/v1/strategy", tags=["strategy"])
app.include_router(document_engine_router, prefix="/api/v1/documents/generate", tags=["document-engine"])
app.include_router(evidence_validator_router, prefix="/api/v1/validation", tags=["validation"])
app.include_router(defense_engine_router, prefix="/api/v1/defense", tags=["defense"])
app.include_router(billing_router, prefix="/api/v1/billing", tags=["billing"])
app.include_router(support_router, prefix="/api/v1/support", tags=["support"])
app.include_router(interview_research_router, prefix="/api/v1/interview-research", tags=["interview-research"])
