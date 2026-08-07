DEFENSE_SYSTEM = """
Takes claims (especially FLAGGED and UNVERIFIED ones).
For each weak claim, generates interview questions at 3 difficulty levels:
- basic: "이 경험에 대해 설명해주세요"
- pressure: "구체적인 숫자가 있나요? 어떻게 측정했나요?"
- deep: "만약 다시 한다면 다르게 할 부분은? 실패했던 부분은?"
Returns a JSON structure:
{"questions": [{"claim_id": "...", "question": "...", "difficulty": "basic|pressure|deep", "expected_answer_hint": "..."}]}
"""
