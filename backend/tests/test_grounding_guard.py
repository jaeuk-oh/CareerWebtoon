import pytest

from app.services.grounding_guard import (
    source_is_too_thin,
    strip_ungrounded,
    ungrounded_numbers,
)


class TestSourceIsTooThin:
    def test_description_repeating_the_title_is_thin(self):
        # The exact shape that produced the fabricated "50건": the vault form falls
        # back to the title when the description is left blank.
        assert source_is_too_thin("보건소 상담업무", "보건소 상담업무") is True

    def test_blank_description_is_thin(self):
        assert source_is_too_thin("보건소 상담업무", "") is True

    def test_real_description_is_not_thin(self):
        assert (
            source_is_too_thin(
                "민원 응대 매뉴얼 도입",
                "보건소 만성질환팀에서 암·희귀질환 의료비 지원 민원을 담당했다. 처리 기준이 "
                "흩어져 있어 하루 15건 처리에 그쳤고, 유형별로 분석해 매뉴얼을 만들었다.",
            )
            is False
        )

    def test_structured_fields_count_toward_the_source(self):
        """A short description is fine when the STAR fields carry the content."""
        assert (
            source_is_too_thin(
                "민원 처리",
                "민원 처리",
                "처리 기준이 흩어져 있어 매번 개별 확인해야 했고, 유형별 체크리스트를 만들어 "
                "처리 기준을 통합했다. 하루 처리량이 늘었다.",
            )
            is False
        )


class TestUngroundedNumbers:
    def test_flags_a_number_absent_from_the_source(self):
        assert ungrounded_numbers("일일 평균 상담 건수 50건 처리", {"15", "21"}) == {"50"}

    def test_accepts_numbers_present_in_the_source(self):
        assert ungrounded_numbers("하루 15건에서 21건으로", {"15", "21", "40"}) == set()

    def test_thousands_separators_compare_equal(self):
        assert ungrounded_numbers("1,500건 처리", {"1500"}) == set()

    def test_text_without_numbers_is_always_grounded(self):
        assert ungrounded_numbers("민원 처리 기준을 통합했다", set()) == set()


class TestStripUngrounded:
    SOURCE = "하루 15건 처리에 그쳤고 개선 후 21건으로 늘었다."

    def test_drops_a_fabricated_figure_from_a_dict_field(self):
        payload = {"product": {"result": "일일 평균 상담 건수 50건 처리"}}
        assert strip_ungrounded(payload, self.SOURCE) == {"product": {"result": None}}

    def test_keeps_a_grounded_figure(self):
        payload = {"product": {"result": "하루 15건에서 21건으로 향상"}}
        assert strip_ungrounded(payload, self.SOURCE) == payload

    def test_drops_only_the_fabricated_item_from_a_list(self):
        payload = {
            "place": {
                "actual_actions": [
                    "유형별로 분석해 체크리스트를 만듦",
                    "상담 500건을 분석함",  # 500 never appears in the source
                    "하루 21건까지 처리 범위를 넓힘",
                ]
            }
        }
        assert strip_ungrounded(payload, self.SOURCE)["place"]["actual_actions"] == [
            "유형별로 분석해 체크리스트를 만듦",
            "하루 21건까지 처리 범위를 넓힘",
        ]

    def test_prose_without_numbers_is_untouched(self):
        payload = {"company_context": {"problem": "처리 기준이 흩어져 있었음", "cause": None}}
        assert strip_ungrounded(payload, self.SOURCE) == payload

    def test_walks_deeply_nested_structures(self):
        payload = {"a": {"b": [{"c": "무려 999건"}]}}
        assert strip_ungrounded(payload, self.SOURCE) == {"a": {"b": [{"c": None}]}}

    @pytest.mark.parametrize("value", [None, 42, True, []])
    def test_non_strings_pass_through(self, value):
        assert strip_ungrounded({"k": value}, self.SOURCE) == {"k": value}

    def test_percentages_derived_from_the_source_still_need_grounding(self):
        """40% is not in the source even though it follows from 15 -> 21."""
        payload = {"headline": "처리량 40% 향상"}
        assert strip_ungrounded(payload, self.SOURCE) == {"headline": None}
