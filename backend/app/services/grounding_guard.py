"""
Code-level enforcement of "use only what the user wrote".

The decompose prompt has always said not to invent facts. With a thin input it
gets ignored anyway: an experience whose entire content was the title
"보건소 상담업무" came back claiming "일일 평균 상담 건수 50건 처리" — a figure that
exists nowhere in the user's input. A fabricated number is the single worst thing
this product can produce, because it is exactly what collapses under interview
questioning.

So the rule is enforced here rather than requested in the prompt:

- Numbers are checked deterministically. Every number in the output must appear in
  the source text; any string introducing a new one is dropped.
- Sparse inputs are refused up front. If there is nothing to decompose, the honest
  answer is to ask the user for more, not to fill the gap with plausible prose.
"""

import logging
import re

logger = logging.getLogger(__name__)

# An experience whose description adds nothing beyond its title has no material to
# decompose. Below this many characters of real content, the model is guessing.
MIN_SOURCE_CHARS = 60

_NUMBER = re.compile(r"\d+(?:[.,]\d+)*")


def _numbers(text: str) -> set[str]:
    """Numbers in `text`, normalised so 1,500 and 1500 compare equal."""
    return {m.replace(",", "").lstrip("0") or "0" for m in _NUMBER.findall(text or "")}


def source_is_too_thin(title: str, description: str, extra: str = "") -> bool:
    """
    True when the input carries no more information than its own title.

    A description that merely repeats the title is the common case — the vault form
    falls back to the title when the description is left blank.
    """
    title = (title or "").strip()
    description = (description or "").strip()
    body = description if description != title else ""
    return len(f"{body} {extra}".strip()) < MIN_SOURCE_CHARS


def ungrounded_numbers(value: str, source_numbers: set[str]) -> set[str]:
    """Numbers in `value` that never appear in the source."""
    return _numbers(value) - source_numbers


def strip_ungrounded(payload, source_text: str):
    """
    Remove every string in `payload` that cites a number absent from `source_text`.

    Walks nested dicts/lists in place. Strings inside lists are dropped; strings at a
    dict key are set to None, so a fabricated figure never survives into the saved
    breakdown while the surrounding grounded content is kept.
    """
    source_numbers = _numbers(source_text)
    removed: list[str] = []

    def clean(node):
        if isinstance(node, str):
            bad = ungrounded_numbers(node, source_numbers)
            if bad:
                removed.append(f"{sorted(bad)} in {node[:60]!r}")
                return None
            return node
        if isinstance(node, list):
            return [c for c in (clean(v) for v in node) if c is not None]
        if isinstance(node, dict):
            return {k: clean(v) for k, v in node.items()}
        return node

    cleaned = clean(payload)
    if removed:
        logger.warning(
            "Grounding guard: dropped %d string(s) citing numbers absent from the source: %s",
            len(removed),
            removed,
        )
    return cleaned
