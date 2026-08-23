import uuid

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import AppException


async def assert_generated_document_owner(db: AsyncSession, document_id: str, user_id: str) -> None:
    """
    Refuse to act on a generated document that does not belong to the caller.

    Several engines take a `generated_document_id` straight from the request body and
    then fan out to the claims hanging off it. `claims` has no `user_id` of its own —
    ownership only exists on the parent `generated_documents` row — so without this
    check any authenticated user could pass someone else's document id and read that
    person's claim text, or write rows against their claims.

    Raises 404 rather than 403 so the response does not confirm that a document with
    that id exists.
    """
    try:
        doc_uuid = str(uuid.UUID(str(document_id)))
    except (ValueError, AttributeError, TypeError):
        raise AppException(status_code=404, detail="Document not found")

    res = await db.execute(
        text("SELECT 1 FROM generated_documents WHERE id = :doc_id AND user_id = :user_id"),
        {"doc_id": doc_uuid, "user_id": user_id},
    )
    if not res.first():
        raise AppException(status_code=404, detail="Document not found")
