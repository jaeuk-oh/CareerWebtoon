"""
Code-level enforcement of "answer in Korean".

Every prompt in this codebase asks the model to write Korean, and asking is not
enough — a real run of interview_research came back with Japanese connectives
glued onto Korean particles ("その際에 어떤 기준으로", "それが 작품의"). A prompt
is a request; this module is the check.

Detection is deterministic and total: any Japanese kana or han ideograph in the
output is found, every time. Repair is a second, deliberately small LLM call that
rewrites only the offending strings, so a 8k-token synthesis is never re-run just
because one connective slipped.

Latin script is deliberately allowed — company names and technical terms
("TechNova", "GA4", "Spring Boot") are normal in Korean job-application text and
the prompts explicitly permit them. Only CJK-that-isn't-Hangul is a violation.
"""

import json
import logging
import re

logger = logging.getLogger(__name__)

# Hiragana, katakana, halfwidth katakana, and han ideographs (incl. Extension A).
# Hangul syllables/jamo are pointedly absent — those are the wanted output.
_FOREIGN_CJK = re.compile(
    r"["
    r"぀-ゟ"  # hiragana
    r"゠-ヿ"  # katakana
    r"ｦ-ﾝ"  # halfwidth katakana
    r"㐀-䶿"  # CJK Unified Ideographs Extension A
    r"一-鿿"  # CJK Unified Ideographs (한자)
    r"]"
)

_REPAIR_SYSTEM = """
너는 한국어 교정기다. 주어진 문자열들에는 일본어(히라가나·가타카나)나 한자가 잘못 섞여 있다.
각 문자열을 자연스러운 한국어로 고쳐라.

규칙:
- 일본어와 한자를 단 한 글자도 남기지 마라. "その際에" -> "그때", "それが" -> "그것이" 처럼
  같은 뜻의 한국어 표현으로 바꿔라.
- 그 외의 내용은 절대 바꾸지 마라. 문장의 의미, 어조, 인용된 표현, 숫자, 고유명사를 그대로 둬라.
- 영문 고유명사와 기술 용어(TechNova, GA4 등)는 그대로 둬라.

입력은 {"0": "...", "1": "..."} 형태이고, 같은 키에 고친 문자열을 담아 JSON으로만 답해라.
"""


def has_foreign_cjk(text: str) -> bool:
    """True when `text` contains Japanese kana or han characters."""
    return bool(_FOREIGN_CJK.search(text)) if isinstance(text, str) else False


def foreign_chars(text: str) -> list[str]:
    """The offending characters, for logging."""
    return _FOREIGN_CJK.findall(text) if isinstance(text, str) else []


def _walk(obj, path=()):
    """Yield (path, value) for every string in a nested dict/list structure."""
    if isinstance(obj, str):
        yield path, obj
    elif isinstance(obj, dict):
        for k, v in obj.items():
            yield from _walk(v, path + (k,))
    elif isinstance(obj, list):
        for i, v in enumerate(obj):
            yield from _walk(v, path + (i,))


def _set_at(obj, path, value):
    for key in path[:-1]:
        obj = obj[key]
    obj[path[-1]] = value


def find_violations(payload) -> list[tuple[tuple, str]]:
    """Every (path, string) in `payload` that contains non-Hangul CJK."""
    return [(p, s) for p, s in _walk(payload) if has_foreign_cjk(s)]


async def enforce_korean(llm, payload, *, timeout: float = 30.0):
    """
    Return `payload` with any Japanese/han contamination rewritten in Korean.

    Mutates and returns the same object. Clean payloads are returned untouched
    without an LLM call, so this costs nothing in the normal case. If the repair
    call fails or comes back still dirty, the best available version is returned
    rather than discarding the caller's (expensive) generation — a stray
    connective is worth logging, not worth losing the whole result over.
    """
    violations = find_violations(payload)
    if not violations:
        return payload

    logger.warning(
        "Korean guard: %d string(s) contained non-Hangul CJK %s",
        len(violations),
        sorted({c for _, s in violations for c in foreign_chars(s)}),
    )

    indexed = {str(i): s for i, (_, s) in enumerate(violations)}
    try:
        fixed = await llm.evaluate_json(
            prompt=json.dumps(indexed, ensure_ascii=False),
            system_prompt=_REPAIR_SYSTEM,
            max_tokens=2048,
            timeout=timeout,
            korean_only=False,  # this call *is* the guard; don't recurse
        )
    except Exception as e:
        logger.error("Korean guard: repair call failed, returning original: %r", e)
        return payload

    repaired = 0
    for i, (path, original) in enumerate(violations):
        candidate = fixed.get(str(i))
        if not isinstance(candidate, str) or not candidate.strip():
            continue
        if has_foreign_cjk(candidate):
            logger.warning("Korean guard: repair still contaminated at %s", list(path))
            continue
        _set_at(payload, path, candidate)
        repaired += 1

    logger.info("Korean guard: repaired %d/%d string(s)", repaired, len(violations))
    return payload
