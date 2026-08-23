import asyncio
import json
import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from app.services.llm_gateway import LLMGateway
from app.modules.experience_engine.schemas import DecomposeResponse, ThreeCFourPResponse, EvidenceItem, AnchorItem
from app.modules.experience_engine.prompts import THREE_C_FOUR_P_SYSTEM, EVIDENCE_SYSTEM, ANCHOR_SYSTEM

class ExperienceEngineService:
    def __init__(self, db: AsyncSession, llm_gateway: LLMGateway):
        self.db = db
        self.llm_gateway = llm_gateway
        
    async def decompose(self, experience_id: str, user_id: str) -> DecomposeResponse:
        # Fetch the experience
        query = text("SELECT * FROM experiences WHERE id = :id AND user_id = :user_id")
        result = await self.db.execute(query, {"id": experience_id, "user_id": user_id})
        experience = result.mappings().first()
        
        if not experience:
            raise ValueError("Experience not found or not owned by user")

        content_to_analyze = f"Title: {experience.get('title', '')}\nDescription: {experience.get('description', '')}"
        if experience.get('situation'):
            content_to_analyze += f"\nSituation: {experience['situation']}"
        if experience.get('task'):
            content_to_analyze += f"\nTask: {experience['task']}"
        if experience.get('action'):
            content_to_analyze += f"\nAction: {experience['action']}"
        if experience.get('result'):
            content_to_analyze += f"\nResult: {experience['result']}"

        # The 3C4P/evidence/anchor extractions are independent reads of the same
        # source text, so running them concurrently cuts wall-clock time (and the
        # window for a retry-exhausting LLM timeout) roughly 3x versus sequential calls.
        three_c_four_p_res, evidence_res, anchors_res = await asyncio.gather(
            self.llm_gateway.generate_json(prompt=content_to_analyze, system_prompt=THREE_C_FOUR_P_SYSTEM),
            self.llm_gateway.generate_json(prompt=content_to_analyze, system_prompt=EVIDENCE_SYSTEM),
            self.llm_gateway.generate_json(prompt=content_to_analyze, system_prompt=ANCHOR_SYSTEM),
        )
        
        # Ensure 3C4P Response matches Schema
        three_c_four_p_id = str(uuid.uuid4())
        
        insert_3c4p_query = text("""
            INSERT INTO experience_3c4p (id, experience_id, customer, company_context, competitor, place, product, price, promotion)
            VALUES (:id, :exp_id, :customer, :company_context, :competitor, :place, :product, :price, :promotion)
        """)
        
        await self.db.execute(insert_3c4p_query, {
            "id": three_c_four_p_id,
            "exp_id": experience_id,
            "customer": json.dumps(three_c_four_p_res.get('customer', {})),
            "company_context": json.dumps(three_c_four_p_res.get('company_context', {})),
            "competitor": json.dumps(three_c_four_p_res.get('competitor', {})),
            "place": json.dumps(three_c_four_p_res.get('place', {})),
            "product": json.dumps(three_c_four_p_res.get('product', {})),
            "price": json.dumps(three_c_four_p_res.get('price', {})),
            "promotion": json.dumps(three_c_four_p_res.get('promotion', {}))
        })
        
        # Insert Evidence and Metrics
        evidence_items = []
        insert_evidence_query = text("""
            INSERT INTO evidence (id, experience_id, claim, evidence_text, source, status, is_quantitative)
            VALUES (:id, :exp_id, :claim, :evidence_text, :source, :status, :is_quantitative)
        """)
        
        evidence_list = evidence_res.get("evidence", [])
        for ev in evidence_list:
            ev_id = str(uuid.uuid4())
            await self.db.execute(insert_evidence_query, {
                "id": ev_id,
                "exp_id": experience_id,
                "claim": ev.get("claim"),
                "evidence_text": ev.get("evidence_text"),
                "source": ev.get("source"),
                "status": ev.get("status", "UNKNOWN"),
                "is_quantitative": ev.get("is_quantitative", False)
            })
            evidence_items.append({
                "id": ev_id,
                "claim": ev.get("claim"),
                "evidence_text": ev.get("evidence_text"),
                "source": ev.get("source"),
                "status": ev.get("status", "UNKNOWN"),
                "is_quantitative": ev.get("is_quantitative", False)
            })
            
        # Note: metrics are linked to a specific evidence row (metrics.evidence_id is NOT NULL),
        # but the LLM's metrics extraction isn't tied to a particular evidence item, so there's
        # no reliable evidence_id to attach here. Skipping persistence rather than guessing a link.

        # Insert Anchors
        anchor_items = []
        insert_anchor_query = text("""
            INSERT INTO experience_anchors (id, experience_id, anchor_type, summary, skills)
            VALUES (:id, :exp_id, :anchor_type, :summary, :skills)
        """)
        
        anchors_list = anchors_res.get("anchors", [])
        for anc in anchors_list:
            anc_id = str(uuid.uuid4())
            await self.db.execute(insert_anchor_query, {
                "id": anc_id,
                "exp_id": experience_id,
                "anchor_type": anc.get("anchor_type"),
                "summary": anc.get("summary"),
                "skills": anc.get("skills", [])
            })
            anchor_items.append({
                "id": anc_id,
                "anchor_type": anc.get("anchor_type"),
                "summary": anc.get("summary"),
                "skills": anc.get("skills", [])
            })
            
        await self.db.commit()
        
        three_c_four_p_res["id"] = three_c_four_p_id
        three_c_four_p_res["experience_id"] = experience_id
        
        return DecomposeResponse(
            three_c_four_p=ThreeCFourPResponse(**three_c_four_p_res),
            evidence=[EvidenceItem(**ev) for ev in evidence_items],
            anchors=[AnchorItem(**anc) for anc in anchor_items],
            message="Decomposition complete"
        )
        
    async def save_3c4p(self, experience_id: str, user_id: str, data) -> dict:
        """
        Persists a user-entered 3C4P breakdown against the same experience_3c4p table
        decompose() writes to, so a manual entry survives a device change exactly like
        an AI-generated one — until now, ExperienceModal only cached this in
        localStorage, which meant it vanished on a different browser or device.

        experience_3c4p has no unique constraint on experience_id (decompose() can be
        called more than once, leaving multiple rows and making a plain SELECT
        nondeterministic about which one comes back). Replacing the existing row(s)
        outright avoids adding to that ambiguity and keeps "one experience, one 3C4P
        breakdown" true going forward.
        """
        query_check = text("SELECT 1 FROM experiences WHERE id = :id AND user_id = :user_id")
        check_res = await self.db.execute(query_check, {"id": experience_id, "user_id": user_id})
        if not check_res.first():
            raise ValueError("Experience not found or not owned by user")

        await self.db.execute(
            text("DELETE FROM experience_3c4p WHERE experience_id = :exp_id"),
            {"exp_id": experience_id}
        )

        new_id = str(uuid.uuid4())
        await self.db.execute(
            text("""
                INSERT INTO experience_3c4p (id, experience_id, customer, company_context, competitor, place, product, price, promotion)
                VALUES (:id, :exp_id, :customer, :company_context, :competitor, :place, :product, :price, :promotion)
            """),
            {
                "id": new_id,
                "exp_id": experience_id,
                "customer": json.dumps(data.customer.model_dump() if data.customer else {}),
                "company_context": json.dumps(data.company_context.model_dump() if data.company_context else {}),
                "competitor": json.dumps(data.competitor.model_dump() if data.competitor else {}),
                "place": json.dumps(data.place.model_dump() if data.place else {}),
                "product": json.dumps(data.product.model_dump() if data.product else {}),
                "price": json.dumps(data.price.model_dump() if data.price else {}),
                "promotion": json.dumps(data.promotion.model_dump() if data.promotion else {})
            }
        )
        await self.db.commit()

        return await self.get_3c4p(experience_id, user_id)

    async def get_3c4p(self, experience_id: str, user_id: str) -> dict:
        # Verify ownership
        query_check = text("SELECT 1 FROM experiences WHERE id = :id AND user_id = :user_id")
        check_res = await self.db.execute(query_check, {"id": experience_id, "user_id": user_id})
        if not check_res.first():
            raise ValueError("Experience not found or not owned by user")
            
        query = text("SELECT * FROM experience_3c4p WHERE experience_id = :exp_id")
        result = await self.db.execute(query, {"exp_id": experience_id})
        row = result.mappings().first()
        return dict(row) if row else None
        
    async def get_evidence(self, experience_id: str, user_id: str) -> list[dict]:
        # Verify ownership
        query_check = text("SELECT 1 FROM experiences WHERE id = :id AND user_id = :user_id")
        check_res = await self.db.execute(query_check, {"id": experience_id, "user_id": user_id})
        if not check_res.first():
            raise ValueError("Experience not found or not owned by user")
            
        query = text("SELECT * FROM evidence WHERE experience_id = :exp_id")
        result = await self.db.execute(query, {"exp_id": experience_id})
        return [dict(row) for row in result.mappings().all()]
        
    async def get_anchors(self, experience_id: str, user_id: str) -> list[dict]:
        # Verify ownership
        query_check = text("SELECT 1 FROM experiences WHERE id = :id AND user_id = :user_id")
        check_res = await self.db.execute(query_check, {"id": experience_id, "user_id": user_id})
        if not check_res.first():
            raise ValueError("Experience not found or not owned by user")
            
        query = text("SELECT * FROM experience_anchors WHERE experience_id = :exp_id")
        result = await self.db.execute(query, {"exp_id": experience_id})
        rows = [dict(row) for row in result.mappings().all()]
        for row in rows:
            if isinstance(row.get('skills'), str):
                row['skills'] = json.loads(row['skills'])
        return rows
