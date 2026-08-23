"""
Regression tests for the claim-handling helpers in document_engine.

These guard three failures that actually happened in this codebase:

- The editor highlights a validated claim by locating it in the document with an exact
  string match, so a claim that differs by a newline or stray whitespace silently never
  lights up. `_snap_claim_to_document` maps it back onto the real span.
- `claims.status` has a CHECK constraint, and the model has returned free text like
  "VERIFIED (조건부)" — which killed the insert. `_normalize_claim_status` whitelists it.
- `claims.evidence_id` is a foreign key, and the model has no way to know a real
  evidence UUID at extraction time. `_as_uuid_or_none` refuses anything that isn't one.
"""
import pytest

from app.modules.document_engine.service import (
    _as_uuid_or_none,
    _normalize_claim_status,
    _snap_claim_to_document,
)

DOC = "저는 뉴스레터 발송을 자동화하여\n반복 업무 시간을 주 4시간 줄였습니다. 다음 문장입니다."


def test_exact_substring_is_returned_unchanged():
    assert _snap_claim_to_document("다음 문장입니다.", DOC) == "다음 문장입니다."


def test_surrounding_whitespace_is_trimmed_to_a_real_span():
    assert _snap_claim_to_document("  다음 문장입니다.  ", DOC) == "다음 문장입니다."


def test_claim_spanning_a_line_break_snaps_onto_the_document_span():
    # The model returns one tidy line; the document has a newline in the middle of it.
    snapped = _snap_claim_to_document("뉴스레터 발송을 자동화하여 반복 업무 시간을", DOC)

    assert snapped == "뉴스레터 발송을 자동화하여\n반복 업무 시간을"
    assert snapped in DOC, "the whole point is that the result is locatable"


def test_claim_absent_from_the_document_is_kept_not_dropped():
    # Still worth validating and generating defence questions from — it just cannot be
    # highlighted in place.
    absent = "문서에 없는 주장입니다"
    assert _snap_claim_to_document(absent, DOC) == absent


@pytest.mark.parametrize("empty", ["", "   ", None])
def test_empty_claim_text_collapses_to_empty(empty):
    assert _snap_claim_to_document(empty, DOC) == ""


def test_regex_metacharacters_in_a_claim_do_not_blow_up():
    doc = "매출이 (전년 대비) +30%\n상승했습니다."
    assert _snap_claim_to_document("매출이 (전년 대비) +30% 상승했습니다.", doc) == doc


@pytest.mark.parametrize("value", ["VERIFIED", "verified", "  Flagged  ", "UNVERIFIED"])
def test_known_statuses_are_upper_cased(value):
    assert _normalize_claim_status(value) in {"VERIFIED", "FLAGGED", "UNVERIFIED"}


@pytest.mark.parametrize(
    "value",
    ["VERIFIED (조건부: 추가 증거 필요)", "PARTIAL", "", None, 3, {"status": "VERIFIED"}],
)
def test_anything_outside_the_check_constraint_falls_back_to_unverified(value):
    # The column has a CHECK constraint; a value outside it aborts the whole insert.
    assert _normalize_claim_status(value) == "UNVERIFIED"


def test_real_uuid_is_normalised():
    assert _as_uuid_or_none("AAAAAAAA-BBBB-4CCC-8DDD-EEEEEEEEEEEE") == (
        "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee"
    )


@pytest.mark.parametrize("value", ["", None, "evidence_1", "not-a-uuid", 0])
def test_non_uuid_evidence_ids_become_null(value):
    # claims.evidence_id is a foreign key — a bogus value would fail the constraint.
    assert _as_uuid_or_none(value) is None
