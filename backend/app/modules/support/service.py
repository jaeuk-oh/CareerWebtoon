from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession


class SupportService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_inquiry(self, user_id: str, email: str | None, message: str) -> dict:
        res = await self.db.execute(
            text("""
                INSERT INTO contact_inquiries (user_id, email, message)
                VALUES (:user_id, :email, :message)
                RETURNING id, created_at
            """),
            {"user_id": user_id, "email": email, "message": message},
        )
        row = res.first()
        return {"id": str(row[0]), "created_at": row[1].isoformat()}
