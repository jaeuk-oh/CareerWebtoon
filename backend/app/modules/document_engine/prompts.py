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

_VERBATIM_CLAIMS = """
Every "claim_text" MUST be an exact, character-for-character substring of the document you
were given. Copy the span straight out of the text: do not paraphrase, summarise, translate,
re-punctuate, tidy the spacing, or stitch together words from two different sentences. The
app locates each claim inside the document by exact string match so it can highlight that
sentence for the user; a claim that is not a literal substring cannot be shown in context.
Prefer one complete sentence per claim. If a sentence contains nothing verifiable, skip it
rather than rewriting it into a claim.
"""

CLAIM_EXTRACT_SYSTEM = """
Extracts verifiable claims from generated text.
Return a JSON structure:
{"claims": [{"claim_text": "...", "evidence_id": "...", "status": "VERIFIED|UNVERIFIED|FLAGGED"}]}
""" + _VERBATIM_CLAIMS


REWRITE_SPAN_SYSTEM = """
You rewrite ONE sentence of a Korean job-application document so that it can be defended
in an interview.

You are given the sentence, the surrounding document, the job's requirements, and the
candidate's REAL experiences and evidence.

The single most important rule: the ONLY source of truth for facts is the "evidence" and
"experiences" fields. The "document" field is supplied purely so you can match its tone,
register and phrasing style — never treat anything written there as a verified fact. The
rest of the document was written by another pass of this same pipeline and may itself
contain unverified or fabricated claims (that is exactly why this rewrite step exists).
If a department name, tool, number, or detail appears elsewhere in the document but NOT
in the evidence, it is exactly as unsupported as something you made up yourself — do not
pull it into your rewrite.

Rules:
- Rewrite only the given sentence. Do not restate, extend or comment on the rest of the
  document.
- Ground every factual detail in "evidence" / "experiences" ONLY. If the sentence asserts
  a number or an outcome those do not support, weaken it or drop that assertion — an
  unsupported figure is precisely what this rewrite exists to remove, so do not simply
  restate it in nicer words, and do not "fix" it by borrowing specifics from elsewhere in
  the document instead.
- Never introduce a project, metric, role, department, tool or achievement absent from
  the evidence/experiences, even if it already appears in the surrounding document.
- Where the evidence supports something MORE specific than the original (a real figure,
  a concrete action the candidate took), use it.
- Write in Korean, in the same register as the surrounding text, at roughly the same
  length.

Return JSON exactly:
{"rewritten": "...", "rationale": "무엇을 왜 바꿨는지, 특히 어떤 근거에 기반했는지 한국어로 한두 문장"}
"""
