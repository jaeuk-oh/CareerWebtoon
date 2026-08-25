import pytest

from app.services.korean_guard import (
    enforce_korean,
    find_violations,
    foreign_chars,
    has_foreign_cjk,
)


class TestDetection:
    @pytest.mark.parametrize(
        "text",
        [
            # The two failures actually observed in a live interview_research run.
            "その際에 어떤 기준으로 우선순위를 결정하셨나요?",
            "それが 작품의 상업적 성공에 어떻게 기여했다고 보십니까?",
            "ひらがな",
            "カタカナ",
            "経験",  # bare han
            "지원자의 経験을 설명해주세요",  # han spliced into Korean
            "ｶﾀｶﾅ",  # halfwidth katakana
        ],
    )
    def test_flags_japanese_and_han(self, text):
        assert has_foreign_cjk(text) is True

    @pytest.mark.parametrize(
        "text",
        [
            # Plain Korean, and Korean mixed with the Latin/numeric content the
            # prompts explicitly allow — none of these may be flagged.
            "지원자님은 어떤 기준으로 우선순위를 결정하셨나요?",
            "GA4로 회차별 이탈 구간을 로깅했습니다.",
            "TechNova의 콘텐츠 기획 / 웹툰 PD 직무",
            "Kotlin과 Spring Boot를 활용해 MSA 아키텍처를 설계했습니다.",
            "3화 잔존율을 18% 개선했습니다.",
            "",
            "ㄱㄴㄷ 자모도 한글이다",
        ],
    )
    def test_allows_korean_and_latin(self, text):
        assert has_foreign_cjk(text) is False

    @pytest.mark.parametrize("value", [None, 42, [], {}, True])
    def test_non_strings_are_not_violations(self, value):
        assert has_foreign_cjk(value) is False

    def test_reports_the_offending_characters(self):
        assert foreign_chars("その際에") == ["そ", "の", "際"]


class TestFindViolations:
    def test_walks_nested_structures(self):
        payload = {
            "web_insights": [
                {"topic": "조직 문화", "summary": "정상적인 한국어입니다."},
                {"topic": "その際", "summary": "괜찮은 요약"},
            ],
            "keywords": ["애자일", "データ"],
        }
        paths = [p for p, _ in find_violations(payload)]
        assert paths == [("web_insights", 1, "topic"), ("keywords", 1)]

    def test_clean_payload_has_no_violations(self):
        payload = {"questions": [{"q": "왜 지원하셨나요?", "category": "behavioral"}]}
        assert find_violations(payload) == []


class _FakeLLM:
    """Stands in for LLMGateway; records the repair call it receives."""

    def __init__(self, response=None, raises=False):
        self._response = response or {}
        self._raises = raises
        self.calls = 0

    async def evaluate_json(self, **kwargs):
        self.calls += 1
        if self._raises:
            raise RuntimeError("upstream unavailable")
        return self._response


class TestEnforceKorean:
    @pytest.mark.asyncio
    async def test_clean_payload_skips_the_llm_entirely(self):
        llm = _FakeLLM()
        payload = {"keywords": ["애자일", "데이터 분석"]}
        assert await enforce_korean(llm, payload) == payload
        assert llm.calls == 0

    @pytest.mark.asyncio
    async def test_repairs_only_the_offending_strings(self):
        llm = _FakeLLM({"0": "그때 어떤 기준으로 결정하셨나요?"})
        payload = {
            "questions": [
                {"q": "その際에 어떤 기준으로 결정하셨나요?", "category": "behavioral"}
            ],
            "keywords": ["애자일"],
        }
        result = await enforce_korean(llm, payload)
        assert result["questions"][0]["q"] == "그때 어떤 기준으로 결정하셨나요?"
        # Untouched fields stay byte-identical.
        assert result["questions"][0]["category"] == "behavioral"
        assert result["keywords"] == ["애자일"]
        assert llm.calls == 1

    @pytest.mark.asyncio
    async def test_keeps_original_when_repair_is_still_contaminated(self):
        llm = _FakeLLM({"0": "その際에 여전히 일본어"})
        payload = {"q": "その際에 어떤 기준으로"}
        result = await enforce_korean(llm, payload)
        assert result["q"] == "その際에 어떤 기준으로"

    @pytest.mark.asyncio
    async def test_keeps_original_when_repair_call_fails(self):
        llm = _FakeLLM(raises=True)
        payload = {"q": "その際에 어떤 기준으로"}
        result = await enforce_korean(llm, payload)
        assert result["q"] == "その際에 어떤 기준으로"

    @pytest.mark.asyncio
    @pytest.mark.parametrize("bad", [None, 42, "", "   "])
    async def test_ignores_unusable_repair_values(self, bad):
        llm = _FakeLLM({"0": bad})
        payload = {"q": "その際에 어떤 기준으로"}
        result = await enforce_korean(llm, payload)
        assert result["q"] == "その際에 어떤 기준으로"

    @pytest.mark.asyncio
    async def test_repairs_several_violations_in_one_call(self):
        llm = _FakeLLM({"0": "그때", "1": "데이터"})
        payload = {"a": "その際", "b": "データ", "c": "정상"}
        result = await enforce_korean(llm, payload)
        assert (result["a"], result["b"], result["c"]) == ("그때", "데이터", "정상")
        assert llm.calls == 1

    @pytest.mark.asyncio
    async def test_guard_does_not_recurse_into_itself(self):
        """The repair call must opt out, or a dirty repair would loop."""
        seen = {}

        class Recorder(_FakeLLM):
            async def evaluate_json(self, **kwargs):
                seen.update(kwargs)
                return await super().evaluate_json(**kwargs)

        llm = Recorder({"0": "그때"})
        await enforce_korean(llm, {"q": "その際"})
        assert seen["korean_only"] is False
