"""
Regression tests for the document ownership gate.

`evidence_validator.validate()` and `defense_engine.generate_defense()` both used to
accept a `generated_document_id` from the request body and fan out to the `claims`
hanging off it without ever using the `user_id` they were handed. `claims` has no
`user_id` column — ownership lives only on the parent `generated_documents` row — so any
authenticated user could read another person's claim text, and defense could write rows
against their claims.
"""
import pytest

from app.core.exceptions import AppException
from app.core.ownership import assert_generated_document_owner

OWNER = "11111111-1111-1111-1111-111111111111"
DOC = "22222222-2222-2222-2222-222222222222"


class _Result:
    def __init__(self, row):
        self._row = row

    def first(self):
        return self._row


class _FakeDB:
    """Minimal stand-in for AsyncSession: records what it was asked, returns a fixed row."""

    def __init__(self, row):
        self._row = row
        self.params = []

    async def execute(self, _stmt, params=None):
        self.params.append(params)
        return _Result(self._row)


async def test_owner_passes_and_scopes_query_to_both_ids():
    db = _FakeDB(row=(1,))
    await assert_generated_document_owner(db, DOC, OWNER)

    assert len(db.params) == 1
    # Both halves must be in the predicate: matching on document id alone is the bug.
    assert db.params[0] == {"doc_id": DOC, "user_id": OWNER}


async def test_document_owned_by_someone_else_is_404():
    db = _FakeDB(row=None)  # the WHERE ... AND user_id = :user_id matched nothing

    with pytest.raises(AppException) as exc:
        await assert_generated_document_owner(db, DOC, "33333333-3333-3333-3333-333333333333")

    # 404 rather than 403 so the response doesn't confirm the document exists.
    assert exc.value.status_code == 404
    assert exc.value.detail == "문서를 찾을 수 없습니다."


@pytest.mark.parametrize("bad_id", ["", "not-a-uuid", "1; DROP TABLE claims", None])
async def test_malformed_id_is_rejected_before_reaching_the_database(bad_id):
    db = _FakeDB(row=(1,))

    with pytest.raises(AppException) as exc:
        await assert_generated_document_owner(db, bad_id, OWNER)

    assert exc.value.status_code == 404
    assert db.params == [], "a malformed id must never be sent to the database"


async def test_uuid_is_normalised_before_the_lookup():
    db = _FakeDB(row=(1,))
    await assert_generated_document_owner(db, DOC.upper(), OWNER)

    assert db.params[0]["doc_id"] == DOC
