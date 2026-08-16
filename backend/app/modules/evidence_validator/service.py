import json
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from .schemas import ValidationResponse
from .prompts import VALIDATION_SYSTEM
from app.services.llm_gateway import LLMGateway

_VALID_CLAIM_STATUSES = {"VERIFIED", "UNVERIFIED", "FLAGGED"}


def _normalize_claim_status(value) -> str:
    if isinstance(value, str) and value.strip().upper() in _VALID_CLAIM_STATUSES:
        return value.strip().upper()
    return "UNVERIFIED"

class EvidenceValidatorService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.llm = LLMGateway()

    async def validate(self, generated_document_id: str, user_id: str) -> dict:
        # 1. Fetch generated document + claims
        res_claims = await self.db.execute(
            text("SELECT id, claim_text FROM claims WHERE generated_document_id = :doc_id"),
            {"doc_id": generated_document_id}
        )
        claims = [{"id": r.id, "text": r.claim_text} for r in res_claims.fetchall()]
        
        # 2. Fetch all user evidence (evidence rows hang off experiences, which carry user_id)
        res_evidence = await self.db.execute(
            text("""
            SELECT e.id, e.claim, e.evidence_text
            FROM evidence e
            JOIN experiences ex ON ex.id = e.experience_id
            WHERE ex.user_id = :user_id
            """),
            {"user_id": user_id}
        )
        evidence = [
            {"id": r.id, "content": f"{r.claim}: {r.evidence_text or ''}"}
            for r in res_evidence.fetchall()
        ]
        
        # 3. Call LLM to validate each claim. Give this real JSON (not a Python
        # dict repr) and enough max_tokens headroom — with several claims, each
        # needing its own status/score/issues, the default budget was truncating
        # the output mid-string and breaking json.loads.
        context = {"claims": claims, "evidence": evidence}
        validation = await self.llm.evaluate_json(
            system_prompt=VALIDATION_SYSTEM,
            prompt=json.dumps(context, ensure_ascii=False, default=str),
            max_tokens=4096
        )
        
        validated_claims = validation.get("claims", [])
        claim_text_by_id = {str(c["id"]): c["text"] for c in claims}

        verified = flagged = unverified = 0
        total_score = 0.0
        response_claims = []

        for vc in validated_claims:
            claim_id = vc.get("claim_id")
            status = _normalize_claim_status(vc.get("status"))
            score = vc.get("defense_score", 0.0)

            if status == "VERIFIED": verified += 1
            elif status == "FLAGGED": flagged += 1
            else: unverified += 1
            total_score += score

            # 4. Update claims table
            await self.db.execute(
                text("""
                UPDATE claims
                SET status = :status, defense_score = :score
                WHERE id = :claim_id
                """),
                {"status": status, "score": score, "claim_id": claim_id}
            )

            response_claims.append({
                "claim_id": claim_id,
                "claim_text": claim_text_by_id.get(str(claim_id), ""),
                "status": status,
                "evidence_text": vc.get("evidence_text"),
                "defense_score": score,
                "issues": vc.get("issues", [])
            })

        await self.db.commit()

        total = len(validated_claims)
        overall_score = total_score / total if total > 0 else 0.0

        # 5. Return ValidationResponse
        return {
            "document_id": generated_document_id,
            "total_claims": total,
            "verified": verified,
            "flagged": flagged,
            "unverified": unverified,
            "overall_score": overall_score,
            "claims": response_claims,
            "message": "Validation complete."
        }

    async def get_validation(self, generated_document_id: str, user_id: str) -> dict:
        # Reconstructs the last validation result from the claims table itself
        # (status/defense_score are persisted there by validate()) rather than
        # requiring a fresh LLM call — lets a returning session resume a
        # document's validation state without re-running it.
        doc_check = await self.db.execute(
            text("SELECT 1 FROM generated_documents WHERE id = :doc_id AND user_id = :user_id"),
            {"doc_id": generated_document_id, "user_id": user_id}
        )
        if not doc_check.first():
            raise ValueError("Document not found or not owned by user")

        res_claims = await self.db.execute(
            text("SELECT id, claim_text, status, defense_score FROM claims WHERE generated_document_id = :doc_id"),
            {"doc_id": generated_document_id}
        )
        rows = res_claims.fetchall()

        verified = flagged = unverified = 0
        total_score = 0.0
        response_claims = []

        for r in rows:
            status = _normalize_claim_status(r.status)
            score = r.defense_score or 0.0
            if status == "VERIFIED": verified += 1
            elif status == "FLAGGED": flagged += 1
            else: unverified += 1
            total_score += score
            response_claims.append({
                "claim_id": str(r.id),
                "claim_text": r.claim_text,
                "status": status,
                "evidence_text": None,
                "defense_score": score,
                "issues": []
            })

        total = len(rows)
        overall_score = total_score / total if total > 0 else 0.0

        return {
            "document_id": generated_document_id,
            "total_claims": total,
            "verified": verified,
            "flagged": flagged,
            "unverified": unverified,
            "overall_score": overall_score,
            "claims": response_claims,
            "message": "Validation retrieved successfully." if total > 0 else "No validation has been run yet."
        }
