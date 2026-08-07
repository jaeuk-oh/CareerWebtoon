from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from app.db.session import get_db
from app.services.llm_gateway import get_llm_gateway, LLMGateway
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

@router.get("")
async def health_check():
    return {"status": "ok"}

@router.get("/llm")
async def health_check_llm(llm: LLMGateway = Depends(get_llm_gateway)):
    try:
        response = await llm.generate("Say 'ok'", max_tokens=10)
        return {"status": "ok", "llm_response": response.strip()}
    except Exception as e:
        logger.error(f"LLM health check failed: {e}")
        return {"status": "error", "detail": str(e)}

@router.get("/db")
async def health_check_db(db: AsyncSession = Depends(get_db)):
    try:
        await db.execute(text("SELECT 1"))
        return {"status": "ok"}
    except Exception as e:
        logger.error(f"DB health check failed: {e}")
        return {"status": "error", "detail": str(e)}
