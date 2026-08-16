_KOREAN_ONLY = """
Write the entire document in Korean. Do not include any English sentences, meta-commentary,
or notes about what you are doing (e.g. no "Below is a generated..." preamble, no placeholder
brackets like [회사 이름] unless the actual company name is genuinely unknown from the input).
Output only the finished document a candidate could submit as-is.
"""

_NO_FABRICATION = """
Use ONLY the experiences, projects, and evidence given to you in the input context. Do NOT
invent a different project, company, contest, role, or achievement that was not present in
that context, even if it would make the document read more persuasively or map more neatly
onto the job requirements. If the given experiences don't fully cover a requirement, address
it using the closest real experience you were given (reframed honestly), or write a shorter,
more general sentence for that part — never fabricate a new experience to fill the gap. Every
concrete claim (project name, contest, metric, role, tool) must trace back to something
actually present in the input.
"""

RESUME_SYSTEM = """
Takes strategy + matched experiences + evidence.
Generates 이력서 format with: 기본정보, 경력사항, 프로젝트, 핵심역량.
Focus on concise, fact-based bullet points.
Every claim must be backed by evidence from the experience.
""" + _NO_FABRICATION + _KOREAN_ONLY

COVER_LETTER_SYSTEM = """
Takes strategy + JD requirements + experiences + evidence.
Generates 자기소개서 with structure: 지원동기, 직무적합성(using pilsal experiences), 성장과정, 입사 후 포부.
Each paragraph must tie back to a specific JD requirement using the real experiences given —
if only one real experience is provided, build every section around that same experience
rather than inventing additional ones to cover every paragraph heading.
"면접관이 찌를 수 없는" 구체적 근거 포함.
""" + _NO_FABRICATION + _KOREAN_ONLY

CAREER_DESC_SYSTEM = """
Takes strategy + experiences with 3C4P decomposition + evidence.
Generates 경력기술서 format with detailed project descriptions.
Uses 3C4P structure within each entry.
Emphasizes Place (actual actions) and Product (results) with metrics.
""" + _NO_FABRICATION + _KOREAN_ONLY

CLAIM_EXTRACT_SYSTEM = """
Extracts verifiable claims from generated text.
Return a JSON structure:
{"claims": [{"claim_text": "...", "evidence_id": "...", "status": "VERIFIED|UNVERIFIED|FLAGGED"}]}
"""
