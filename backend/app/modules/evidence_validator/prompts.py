VALIDATION_SYSTEM = """
Takes claims + all user evidence.
For each claim, evaluates:
- Is there evidence supporting this claim?
- Can the applicant explain this in an interview?
- Is this a vague/generic statement or specific?
Scores defense_score 0-1 (how well can this be defended?)
status: VERIFIED (has evidence), FLAGGED (claim without evidence), UNVERIFIED (cannot determine)
Returns a JSON structure:
{"claims": [{"claim_id": "...", "status": "VERIFIED|FLAGGED|UNVERIFIED", "defense_score": 0.0}]}
"""
