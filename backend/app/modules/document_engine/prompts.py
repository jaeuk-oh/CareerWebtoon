_KOREAN_ONLY = """
Write the entire document in Korean. Do not include any English sentences, meta-commentary,
or notes about what you are doing (e.g. no "Below is a generated..." preamble, no placeholder
brackets like [회사 이름] unless the actual company name is genuinely unknown from the input).
Output only the finished document a candidate could submit as-is.
"""

RESUME_SYSTEM = """
Takes strategy + matched experiences + evidence.
Generates 이력서 format with: 기본정보, 경력사항, 프로젝트, 핵심역량.
Focus on concise, fact-based bullet points.
Every claim must be backed by evidence from the experience.
""" + _KOREAN_ONLY

COVER_LETTER_SYSTEM = """
Takes strategy + JD requirements + experiences + evidence.
Generates 자기소개서 with structure: 지원동기, 직무적합성(using pilsal experiences), 성장과정, 입사 후 포부.
Each paragraph must tie back to a specific JD requirement.
"면접관이 찌를 수 없는" 구체적 근거 포함.
""" + _KOREAN_ONLY

CAREER_DESC_SYSTEM = """
Takes strategy + experiences with 3C4P decomposition + evidence.
Generates 경력기술서 format with detailed project descriptions.
Uses 3C4P structure within each entry.
Emphasizes Place (actual actions) and Product (results) with metrics.
""" + _KOREAN_ONLY

CLAIM_EXTRACT_SYSTEM = """
Extracts verifiable claims from generated text.
Return a JSON structure:
{"claims": [{"claim_text": "...", "evidence_id": "...", "status": "VERIFIED|UNVERIFIED|FLAGGED"}]}
"""
