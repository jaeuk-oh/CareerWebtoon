> **DRAFT — 사용자 인터뷰 반영 전. 최종본 아님.**

# PROJECT INVESTIGATION

## 프로젝트 목적
AI 취업 코파일럿(CareerCraft). 구직자가 자신의 경험을 구조화하고, 채용공고(JD)를 분석한 뒤, AI가 이력서/자기소개서/경력기술서를 자동 생성하고 생성된 문서의 주장(claim)을 증거 기반으로 검증하며, 면접 대비 질문까지 생성하는 풀파이프라인 웹앱.
근거: README.md ("A career document (resume/cover letter) generation tool"), backend/app/main.py (10개 모듈 등록), backend/app/modules/ 전체 구조.

## 문제의 출발점
한국 취업 시장에서 구직자가 이력서·자소서를 작성할 때 ①경험을 어떤 각도로 제시할지 모르고, ②JD에서 요구하는 역량을 정확히 파악하지 못하며, ③작성한 내용이 면접에서 검증 가능한지 알 수 없다는 문제.
근거: backend/app/modules/experience_engine/prompts.py (3C4P 분해 + 증거 추출 + 앵커 생성), backend/app/modules/defense_engine/service.py (flagged claims에 대한 면접 대비 질문 생성).

## 문제를 발견한 계기
근거 없음 — 확인 필요. (commit 메시지, README, 코드 어디에도 문제 발견 계기가 명시되어 있지 않음)

## 기존 방식
근거 없음 — 확인 필요. (기존 방식에 대한 명시적 언급 없음. 추측: 수작업으로 이력서 작성 또는 ChatGPT에 직접 요청하는 방식)

## 기존 방식의 불편/한계
근거 없음 — 확인 필요. 코드에서 추론 가능한 것: evidence_validator 모듈 존재는 "AI가 근거 없는 주장을 생성하는 문제"를 인식했음을 시사함. 프롬프트에 "면접관이 찌를 수 없는 구체적 근거 포함"(document_engine/prompts.py) 명시.

## 왜 해결해야 했는가
근거 없음 — 확인 필요. 코드 구조에서 추론: 취업 문서의 허위/과장 주장이 면접에서 걸렸을 때 발생하는 문제를 예방하고, JD 적합성을 높이기 위한 것으로 추정.

## 왜 AI를 적용했는가
명시적 설명 없음. 코드에서 확인 가능한 의도:
- 3C4P 프레임워크 적용이 사람이 매번 수작업으로 하기 어려움 → AI 위임
- JD에서 explicit/hidden 요구사항 추출 → LLM 판단력 필요
- 경험-JD 매칭의 pilsal/mipsal/bilsal 분류 → LLM 평가 능력 활용
- 생성된 문서의 claim 검증 → 비용 효율적인 자동화

## AI가 실제로 수행하는 역할
구현 확인된 역할 (코드 근거 명시):

1. **경험 3C4P 분해** (`experience_engine/service.py:34`): 사용자가 입력한 경험 텍스트를 Customer/Company/Competitor/Place/Product/Price/Promotion 7개 축으로 분해. Writer 모델(Mistral Medium 3.5) 사용.
2. **증거 추출** (`experience_engine/service.py:38`): 경험에서 주장(claim)과 그 근거를 분리하고 SUPPORTED/UNSUPPORTED/UNKNOWN으로 분류. 정량적(INPUT/OUTPUT/DERIVED) 지표도 추출.
3. **앵커 생성** (`experience_engine/service.py:44`): 동일 경험을 다른 JD에 맞게 2-4개 다른 각도(앵커)로 제시하는 요약문 생성.
4. **JD 분석** (`jd_analyzer/service.py:18`): JD 텍스트에서 explicit/hidden 요구역량, 우선순위, 기업 문화 키워드 추출.
5. **경험-JD 매칭** (`matching_engine/service.py:58`): 사용자 경험과 JD 요구사항을 비교해 pilsal/mipsal/bilsal로 분류하고 match_score 산정. Critic 모델(Nemotron Super 120b) 사용.
6. **전략 생성** (`strategy_engine/service.py:53`): 매칭 결과를 바탕으로 primary/secondary 경험 선택, gap 분석, strategy_text 작성. Critic 모델 사용.
7. **문서 생성** (`document_engine/service.py:31`): 전략+경험+증거를 바탕으로 이력서/자소서/경력기술서 생성. Writer 모델 사용.
8. **Claim 추출** (`document_engine/service.py:35`): 생성된 문서에서 검증 가능한 주장을 자동 추출.
9. **Claim 검증** (`evidence_validator/service.py:36`): 생성된 문서의 각 claim을 사용자의 증거와 대조해 VERIFIED/FLAGGED/UNVERIFIED 분류. Critic 모델 사용.
10. **면접 대비 질문 생성** (`defense_engine/service.py:29`): flagged/weak claim에 대해 기본/압박/심화 난이도의 면접 예상 질문 생성. Writer 모델 사용.

## 내가 직접 판단한 부분
근거 없음 — 확인 필요. 코드에서 추론 가능한 것:
- 경험 입력/수정: 사용자가 직접 경험을 입력하거나 문서를 업로드
- 앵커 선택: 여러 앵커 중 어느 것을 사용할지 선택 (UI에 Pipeline 뷰 존재)
- JD 입력: 사용자가 직접 JD 텍스트를 붙여넣기
- 최종 문서 검토/수정: Editor 뷰 존재 (Editor.tsx)
- 전략 승인: 근거 없음

## AI에게 위임한 부분
코드로 확인된 위임:
- 경험의 3C4P 구조화 전체 (`experience_engine/`)
- JD 분석 전체 (`jd_analyzer/`)
- 경험-JD 매칭 판단 (`matching_engine/`)
- 지원 전략 수립 (`strategy_engine/`)
- 문서 초안 생성 (`document_engine/`)
- 생성된 문서의 claim 검증 (`evidence_validator/`)
- 면접 예상 질문 생성 (`defense_engine/`)

## 핵심 Workflow
근거: backend/app/main.py (라우터 등록 순서), 각 service.py 로직

```
[사용자] 경험 입력 or 문서 업로드
    → document_parser: PDF/DOCX 파싱
    → candidate_vault: 경험 저장
    → experience_engine: 3C4P + 증거 + 앵커 생성
    → [사용자] JD 입력
    → jd_analyzer: JD 분석 (explicit + hidden 요구사항)
    → matching_engine: 경험-JD 매칭 (pilsal/mipsal/bilsal)
    → strategy_engine: 지원 전략 수립 (primary/secondary 선택, gap 분석)
    → document_engine: 문서 생성 + claim 추출
    → evidence_validator: claim 검증 (VERIFIED/FLAGGED/UNVERIFIED)
    → defense_engine: flagged claim에 대한 면접 예상 질문 생성
    → [사용자] 문서 검토 + 면접 준비
```

## 핵심 기술
근거: pyproject.toml, llm_gateway.py, schema.sql, package.json

**Backend:**
- FastAPI (Python 3.11+, async)
- NVIDIA API Catalog — 2모델 구조:
  - Writer: `mistralai/mistral-medium-3.5-128b` (생성 작업)
  - Critic: `nvidia/nemotron-3-super-120b-a12b` (평가/매칭/전략 작업)
- SQLAlchemy async + asyncpg (DB 접근)
- Supabase (PostgreSQL + Auth + RLS)
- pypdf + python-docx (문서 파싱)
- tenacity (LLM 호출 retry: 3회, exponential backoff)

**Frontend:**
- React 19 + TypeScript + Vite
- Tailwind CSS v4
- Framer Motion (애니메이션)
- Supabase-js (인증/DB)

**Infrastructure:**
- Vercel (프론트엔드 + Python serverless via api/index.py)
- Supabase (linked 실제 프로젝트 확인: backend/supabase/.temp/linked-project.json 존재)

**주목할 설계 선택:**
- Writer/Critic 역할 분리: 생성(낮은 온도=0.3)과 평가(낮은 온도=0.1~0.2)에 다른 모델 사용
- `response_format={"type": "json_object"}` — structured output 강제
- 모든 LLM 호출에 retry 3회 (tenacity)
- Supabase RLS 모든 테이블에 적용 (사용자 데이터 격리)

## 검증 방법
근거 없음 — 확인 필요. 코드 내 자동화 테스트 없음(사용자 작성 테스트 파일 0개). 
evidence_validator 모듈이 파이프라인 내 "self-validation" 역할을 하나, 이는 검증이 아니라 기능.

## 반복 개선 과정
Git history 근거 (3 commits):
1. `6614eea` (Aug 3, 2026): "Initial commit: CareerCraft MVP" — 전체 구조 일괄 커밋
2. `2beb68a` (Aug 11-12, 2026): "Vercel deployment setup and Gemini leftover cleanup" — **원래 Gemini를 사용했으나 NVIDIA API로 전환**했음을 시사
3. `ca463b7` (Aug 15, 2026): "Add confirm dialogs, keyboard/ARIA accessibility, and responsive layout polish" — UX 개선 (destructive 작업에 ConfirmDialog, ARIA 접근성, 반응형 레이아웃)

**주목: AI 모델 전환 결정 — Gemini → NVIDIA API.** 이 결정의 이유는 코드에 명시 없음.

## 실제 결과
근거 없음 — 확인 필요. 코드는 동작 가능한 구조이며 Supabase linked 프로젝트 있음. 실제 사용자가 생성된 문서를 사용해 취업에 성공했다는 증거 없음.

## 실제 사용 여부
근거 없음 — 확인 필요. Vercel 배포 설정 있고 Supabase 실 프로젝트 linked이므로 배포 준비는 됨. 실제 사용자가 있었는지는 코드에서 확인 불가.

## 현재 상태
Git 기준 최신 커밋 2026-08-15. 동작 가능한 전체 파이프라인 구현 완료. 미완성으로 보이는 부분:
- `defense_engine/service.py:33`: `user_prompt` 파라미터를 사용하나 `LLMGateway.generate_json()`의 시그니처는 `prompt`임 — 버그 가능성
- `defense_engine/service.py:74`: `get_defense()` 메서드가 placeholder ("Placeholder for fetch logic")
- `evidence_validator/service.py:84`: `get_validation()` 메서드가 placeholder
- 테스트 없음
- `strategy_engine/service.py:65`: `excluded_reasons` 생성 로직이 고정 문자열 ("Not selected as primary or secondary, or classified as bilsal.")

## 한계
코드에서 확인된 한계:
1. 테스트 없음 — 파이프라인 각 단계의 정확성을 자동으로 검증하는 수단 없음
2. Placeholder 메서드 다수 — `get_defense()`, `get_validation()` 미구현
3. NVIDIA API 의존 — API 장애 시 서비스 전체 중단 (fallback 없음)
4. LLM 출력 품질에 대한 평가 지표 없음 (생성된 자소서가 좋은지 측정 불가)
5. 문서 파싱(document_parser) 서비스 코드 확인 안 됨 — 실제 구현 여부 불명확

## Git history에서 발견한 변화
근거: `git log --oneline --all`
- 3 commits (Aug 3 ~ Aug 15, 2026), 약 12일 개발 기간
- "Gemini leftover cleanup" commit: 초기에 Google Gemini를 LLM으로 사용하려 했으나 NVIDIA API Catalog로 전환. 전환 이유 불명확
- 최종 commit에서 UX 세부 개선(접근성, 확인 다이얼로그, 반응형) — 기능보다 완성도에 집중

## 이 프로젝트에서 드러나는 역량
1. **파이프라인 설계**: 10단계 AI 파이프라인을 명확한 모듈 경계로 분리 (각 모듈이 독립적 라우터/스키마/서비스/프롬프트 보유)
2. **AI 역할 분리 설계**: Writer(생성)와 Critic(평가)을 서로 다른 모델에 할당하는 의도적 설계
3. **증거 기반 검증 루프**: 생성된 문서의 claim을 사용자 증거와 대조 검증하는 loop — 환각 방지 설계
4. **도메인 지식**: 한국 취업 문화의 3C4P, pilsal/mipsal/bilsal 개념, 경력기술서/자소서 형식 이해
5. **Full-stack 실행**: React + FastAPI + Supabase + Vercel 스택 전체를 혼자 구현
6. **모델 전환 결정**: Gemini → NVIDIA API 전환 (이유는 인터뷰 필요)

## 아직 알 수 없는 정보
- 이 문제를 왜, 어떤 계기로 만들기 시작했는가?
- 실제로 사용한 사람이 있는가? 있다면 몇 명? 어떤 피드백을 받았는가?
- Gemini → NVIDIA API 전환 이유는 무엇인가?
- 3C4P, pilsal/mipsal/bilsal 프레임워크는 직접 설계한 것인가, 기존 방법론을 차용했는가?
- document_parser 모듈이 실제로 잘 동작하는가? (service.py 미확인)
- 내가 직접 판단·개입한 부분은 무엇인가? (UI 흐름 상 어느 단계에서 사용자가 검토·수정하는가)
- Supabase 실 프로젝트에 실제 데이터가 있는가?

---

## AX 관점 분석 (초안)

**문제 발견력**: 중간. "AI가 생성한 이력서의 claim이 면접에서 검증되지 않을 수 있다"는 구체적 문제 인식이 evidence_validator/defense_engine 설계에서 드러남. 그러나 이 문제를 어떻게 발견했는지 코드에 기록 없음.

**문제 정의력**: 높음. 추상적 "이력서 작성이 어렵다"가 아니라 "경험 → 구조화 → JD 매칭 → 전략 → 생성 → claim 검증 → 면접 대비"라는 구체적 단계별 문제로 분해함. 3C4P, pilsal/mipsal/bilsal 같은 도메인별 세부 프레임워크 적용이 인상적.

**AI 활용 판단**: 높음. 생성(Writer)과 평가(Critic)를 다른 모델에 분리 할당. `response_format=json_object` 강제로 파싱 안정성 확보. 단순히 "ChatGPT에 물어보는" 수준이 아니라 각 단계에 맞는 LLM 역할을 설계함.

**AI 위임 능력**: 높음. 10단계 파이프라인 전체를 AI 호출로 구성하면서도 각 단계의 system prompt를 별도 파일(`prompts.py`)로 분리해 관리. EVIDENCE_SYSTEM 프롬프트에서 "INPUT/OUTPUT/DERIVED 지표를 구분하라"는 세밀한 지시가 인상적.

**인간의 판단/개입**: 추정만 가능. UI에 Pipeline, Editor, Portfolio 뷰가 있어 사용자가 중간 결과를 확인·수정할 수 있는 구조. 그러나 실제로 어떤 단계에서 사람이 개입하는지는 인터뷰 필요.

**실행력**: 높음. 12일 안에 10모듈 백엔드 + 5뷰 프론트엔드 + Supabase 스키마(14개 테이블) + Vercel 배포를 완성. 단, 일부 placeholder 메서드 존재.

**검증 능력**: 낮음. 자동화 테스트 0개. 파이프라인 내 evidence_validator는 동작의 일부이지 테스트가 아님. LLM 출력 품질을 평가하는 지표도 없음.

**개선 능력**: 낮음~중간. 3커밋 기간이 짧아 반복 개선 사이클 확인 어려움. Gemini → NVIDIA 모델 전환이라는 기술 결정 변경 1건 확인. 그 외 UX 개선 1회.

**제품 관점**: 중간~높음. Landing/Dashboard/Pipeline/Editor/Portfolio 5개 뷰 설계, Supabase Auth + RLS 적용, 반응형 레이아웃, ARIA 접근성 — "쓰는 사람이 있다고 가정한" 제품 관점 보임. 그러나 실제 사용자 피드백 없음.

**AX 적합성**: 높음. "AI를 단순 도구로 쓰는 것"이 아니라 AI 파이프라인을 설계하고 각 단계의 AI 역할을 명확히 정의한 프로젝트. 취업 도구라는 도메인에서 AI를 어떻게 책임감 있게 사용할지(claim 검증, 증거 기반 생성)를 고민한 흔적이 있음.

**차별성**: 높음. 단순 "AI 이력서 생성기"가 아니라 "생성 → 검증 → 면접 대비"까지 이어지는 루프가 타 프로젝트와의 차별점. 2모델(Writer/Critic) 구조와 pilsal/mipsal/bilsal 프레임워크 적용도 차별적.

---

## 카테고리 판단 (초안)

**1순위: AI 프로덕트 기획/개발**
이유: 10단계 AI 파이프라인을 설계하고 실제 동작하는 웹앱으로 구현. 사용자 경험 전체를 AI 흐름으로 기획했으며 Writer/Critic 2모델 구조, evidence validation loop 등 AI 활용 설계 결정이 핵심.

**2순위: 바이브코딩으로 앱 제작**
이유: React + FastAPI + Supabase + Vercel 풀스택을 약 12일 내에 혼자 구축한 실행 속도. Claude Code 사용 흔적(.claude/, .agent/rules/) 확인. "AI 코딩 어시스턴트를 활용한 빠른 앱 제작"으로 읽힐 수 있음.
