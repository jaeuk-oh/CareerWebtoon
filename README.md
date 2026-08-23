# CareerCraft

> 경험을 채용공고 요구사항과 대조해 이력서·자소서를 생성하고, 생성된 문서의 주장을 사용자가 실제로 가진 근거와 대조 검증하는 AI 취업 코파일럿.

## 핵심 문제

구직자가 이력서·자소서를 쓸 때 반복적으로 부딪히는 지점을 세 가지로 좁혔다.

### 01. 경험을 어떤 각도로 제시해야 할지 모른다

같은 경험이라도 지원하는 직무에 따라 강조점이 달라야 하는데, 대부분 하나의 버전으로만 정리해 둔다. 경험 하나를 입력하면 `experience_engine`이 Customer/Company/Competitor/Place/Product/Price/Promotion(3C4P) 축으로 분해하고, 같은 경험을 2~4개의 다른 각도(앵커)로 요약해낸다.

실제로 사내 뉴스레터 자동화 경험 1건을 입력해 실행한 결과, `자동화` / `문제_해결` / `데이터_수집_관리` / `효율성_개선` 4개 앵커가 자동 생성됐다.

### 02. JD가 요구하는 역량과 내 경험의 연결이 불분명하다

채용공고를 읽고 "내 경험 중 뭘 앞세워야 하지"를 판단하는 건 매번 새로 하는 작업이다. `jd_analyzer`가 JD에서 명시적/암묵적 요구 역량을 뽑고, `matching_engine`이 각 경험 앵커를 JD 요구사항과 대조해 pilsal(필살기) / mipsal(미살) / bilsal(비살)로 분류하고 점수를 매긴다.

콘텐츠 오퍼레이션 매니저 JD로 실행한 결과, 4개 앵커 중 3개가 pilsal(0.78~0.94점), 1개가 mipsal(0.52점)로 분류됐고 coverage_score는 0.86이었다.

### 03. 자소서에 쓴 내용이 면접에서 검증 가능한지 알 수 없다

AI로 자소서를 생성하면 그럴듯하지만 근거가 빈약한 문장이 섞여 들어가기 쉽다. `document_engine`이 생성한 문서에서 검증 가능한 주장(claim)을 자동 추출하면, `evidence_validator`가 각 주장을 사용자가 등록한 근거와 대조해 VERIFIED/FLAGGED/UNVERIFIED로 분류하고, `defense_engine`이 FLAGGED된 주장에 대해 기본/압박/심화 3단계 예상 면접 질문을 만든다.

실제로 생성한 자소서의 주장 10건 중 1건만 VERIFIED, 9건은 FLAGGED로 분류됐다(overall_score 0.27). 이 9건에 대해 27개(9×3단계)의 예상 질문이 생성됐다.

## 왜 이렇게 설계했는가

### 생성과 평가를 다른 모델에 맡겼다 — 하지만 원칙보다 실측 안정성을 우선했다

하나의 모델에 생성(자소서 작성)과 평가(매칭 점수, 주장 검증)를 같이 맡기면 자기가 쓴 글을 자기가 채점하는 구조가 된다. Writer 모델(생성, temperature 0.3)과 Critic 모델(평가, temperature 0.1~0.2)을 분리했다. `LLMGateway`에 `generate()`/`generate_json()`(Writer)과 `analyze()`/`evaluate_json()`(Critic)을 나눠뒀다.

다만 이 역할 분리를 원칙으로 못박지는 않았다. `document_engine`(자소서/이력서 생성), `jd_analyzer`(JD 요구사항 추출), `defense_engine`(방어질문 생성)은 모두 실제로는 "생성"에 가까운 작업인데, 세 곳 다 Writer 모델이 60초 하드 타임아웃에 반복적으로 걸리는 것을 실행 중 직접 재현했고, 같은 요청을 Critic 모델로 보내면 확연히 빨리(2~3배) 끝나는 것도 함께 확인했다. 그래서 이 셋은 실측 결과에 따라 Critic으로 옮겼다 — `experience_engine`의 3C4P·증거 추출만 여전히 Writer를 쓴다. "생성=Writer, 평가=Critic"이라는 깔끔한 구분보다, 매 모듈마다 실제로 어느 쪽이 안정적인지 확인하고 정했다.

### AI 출력은 코드가 검증한 뒤에만 저장한다

LLM이 반환하는 JSON은 형식과 값 모두 신뢰할 수 없다. `claims.status`처럼 DB에 CHECK 제약이 걸린 값은 LLM 출력을 그대로 넣지 않고, 화이트리스트(`VERIFIED`/`UNVERIFIED`/`FLAGGED`)에 없으면 `UNVERIFIED`로 강제한다. `evidence_id`처럼 FK가 걸린 값도 실제 UUID 형식인지 확인한 뒤에만 저장하고, 아니면 NULL로 둔다(`document_engine/service.py`의 `_normalize_claim_status`, `_as_uuid_or_none`).

### Gemini에서 NVIDIA API Catalog로 바꾼 이유

비용이었다. 무료 크레딧 안에서 Writer/Critic 두 모델 구조를 유지할 수 있어 전환했고, 생성 품질을 비교하지는 않았다.

### 브랜드 색과 상태 색을 분리했다

primary 액션 색(slate-900)과 "검증됨" 상태 색(emerald)이 같은 초록 계열을 공유하고 있었다. 그 결과 모든 주요 버튼의 hover가 검정→초록으로 색상 자체가 바뀌어, hover가 "톤을 한 단계 진하게"가 아니라 "다른 의미로 전환"되는 것처럼 읽혔다. primary를 별도 색(indigo, `brand-600`)으로 분리하고 emerald는 verified/success 의미 전용으로 되돌렸다.

## 실제 검증

README를 다시 쓰기 전까지 이 파이프라인은 코드만 작성돼 있었고, 처음부터 끝까지 실제로 실행해본 적이 없었다. 이번에 실제 Supabase 계정으로 회원가입하고, 실제 NVIDIA API 키로 10개 모듈(회원가입 → 경험 등록 → 3C4P 분해 → JD 분석 → 매칭 → 전략 → 문서 생성 → 검증 → 방어질문)을 순서대로 호출해 끝까지 실행했다.

- 회원가입: Supabase Auth로 발급받은 JWT로 모든 API를 인증
- 경험 1건 → 3C4P 분해 + 증거 2건 + 앵커 4건 자동 생성
- JD 1건 분석 → 명시적 요구사항 5개, 암묵적 요구사항 3개 추출
- 매칭 → coverage_score 0.86, pilsal 3건 / mipsal 1건
- 전략 생성 → primary/secondary 경험 선정, gap 1건 식별
- 문서 생성 → 자소서 생성, claim 10건 자동 추출
- 검증 → 10건 중 1건 VERIFIED, 9건 FLAGGED, overall_score 0.27
- 방어질문 → FLAGGED 9건에 대해 27개(3단계×9) 질문 생성

검증에 쓴 테스트 사용자와 데이터는 종료 후 삭제했다. 정확도나 품질을 수치로 평가하는 eval은 만들지 않았다 — 이번 실행은 "10단계가 실제로 끝까지 도는가"를 확인한 것이지, "결과물이 얼마나 좋은가"를 측정한 것은 아니다.

### 두 번째 실행 (UI/UX 개편 + 편집·재작성 루프 추가 이후)

프론트엔드를 전면 개편(디자인 시스템, 상시 사이드바, 본문 인라인 하이라이트, 문장 재작성, 면접 방어 전체화면, 피드백 리포트)한 뒤, 새 익명 계정으로 같은 10단계를 다시 실행하며 이번에 추가된 기능(편집 저장, claim 재추출, 문장 재작성, 3C4P 수동 저장, 스트리밍 생성)까지 포함해 검증했다.

- **claim이 실제로 본문에서 하이라이트된다**: 검증된 claim 8건이 생성 문서에서 전부 정확히 위치를 찾았고(무손실 재구성 확인), 재추출 후 17건도 전부 위치를 찾았다.
- **문장 재작성 → 적용 → 재검증 루프가 실제로 돈다**: FLAGGED 문장 하나를 재작성해 본문에 적용하고, 서버에 저장한 뒤 claim을 재추출하고 재검증까지 완주했다.
- **사용자가 직접 입력한 3C4P가 기기를 바꿔도 유지된다**: AI decompose 없이 수동으로 입력한 customer/problem/action/product가 서버에 저장된 뒤, 별도 세션에서 조회했을 때 원본과 정확히 일치했다.
- **문서 생성 스트리밍이 실제로 체감을 바꾼다**: 본문 생성 자체는 5초 안에 화면에 다 뜨고, 이어지는 claim 추출까지 합쳐 최종 완료까지는 수십 초가 더 걸린다 — 예전에는 이 전체 시간 동안 스피너만 보였다.
- **IDOR 방어가 실제로 동작한다**: 별도 익명 계정으로 다른 사용자의 문서 UUID를 넣어 검증/방어질문 생성/수정 3건을 시도했고 전부 404로 막혔으며, 원본 문서 내용도 훼손되지 않았다.

## 실패와 수정

실제로 돌려보기 전까지는 몰랐던 문제가 파이프라인 전 구간에서 나왔다.

**LLM 호출 자체가 깨져 있었다.** `document_engine`, `evidence_validator`, `defense_engine` 세 모듈이 `LLMGateway.generate_json()`/`evaluate_json()`을 호출하면서 실제 시그니처에 없는 `user_prompt` 인자를 쓰고 있었다. 이 상태로는 세 모듈 모두 호출 즉시 TypeError로 죽는다. `prompt`로 고쳤다.

**Writer 모델이 이미 서비스 종료 상태였다.** `mistralai/mistral-medium-3.5-128b`는 2026-08-07에 EOL 처리되어 무엇을 보내도 410을 반환했다. 이 NVIDIA 계정에서는 Mistral 계열 모델 전체가 404(계정에 배포되지 않음)였고, 결국 `nvidia/llama-3.3-nemotron-super-49b-v1`로 교체했다.

**코드와 DB 스키마가 어긋나 있었다.**
- `experience_anchors.skills`는 Postgres `TEXT[]`인데 코드가 JSON 문자열로 인코딩해 넣고 있었다(DataError).
- `application_strategies` 테이블에는 `gap_analysis`(JSONB) 컬럼 하나만 있는데, 코드는 존재하지 않는 `gaps`/`excluded_reasons` 컬럼에 INSERT를 시도하고 있었다.
- `jobs.jd_analysis`는 JSONB라 SQLAlchemy가 이미 dict로 반환하는데, 코드는 여기에 다시 `json.loads()`를 호출해 TypeError를 냈다(matching_engine, strategy_engine 2곳).
- asyncpg가 반환하는 UUID 객체를 그대로 `json.dumps()`에 넘겨 "Object of type UUID is not JSON serializable" 에러가 났다(matching_engine, strategy_engine).

**LLM 출력을 그대로 믿을 수 없었다.**
- `claims.status`에는 `VERIFIED`/`UNVERIFIED`/`FLAGGED`만 허용하는 CHECK 제약이 있는데, LLM이 "VERIFIED (조건부: 추가 증거 필요)" 같은 자유 텍스트를 반환해 제약 위반으로 죽었다. LLM 출력을 화이트리스트로 정규화하도록 고쳤다.
- `evidence_validator`의 프롬프트(`VALIDATION_SYSTEM`)는 다른 모든 프롬프트와 달리 반환할 JSON 키 이름을 명시하지 않고 있었다. 그 결과 LLM이 매번 다른 키로 응답했고, 코드가 기대하는 `"claims"` 키는 항상 비어 있었다 — 에러 없이 조용히 빈 결과만 돌려주고 있었다. 프롬프트에 정확한 스키마를 적어 넣어 고쳤다.
- 같은 모듈의 응답 스키마(`ClaimValidation`)는 `claim_text`/`issues` 필드를 요구하는데, 서비스는 LLM이 반환한 원본 dict를 그대로 응답에 넣고 있어 FastAPI `ResponseValidationError`가 났다. `claim_text`는 원래 조회해 둔 claim 목록에서 채워 넣고, `issues`는 기본값을 두도록 고쳤다.

**모델마다 안정성이 달랐다.** `defense_engine`은 FLAGGED된 주장 9건에 대해 3단계 질문(27개)을 한 번에 생성하는데, Writer 모델(`nvidia/llama-3.3-nemotron-super-49b-v1`)로는 반복적으로 응답이 지연되거나 타임아웃됐다 — 같은 요청을 raw API로 직접 호출해 60초 타임아웃을 재현해 확인했다. 반면 Critic 모델(`nvidia/nemotron-3-super-120b-a12b`)은 같은 요청을 18초 만에 처리했다. FLAGGED 주장을 평가해 질문을 만드는 작업은 창작보다 평가에 가깝다고 보고 `defense_engine`을 Critic 모델로 옮기고, `max_tokens`도 2048 → 8192로 늘렸다(27개 질문을 담기엔 부족했다).

**`jd_analyzer`에도 같은 타임아웃 문제가 남아 있었다.** 위 `defense_engine` 수정 이후에도 `jd_analyzer`는 여전히 Writer 모델(`generate_json`)을 쓰고 있었고, 실제로 3회 연속 타임아웃되는 것을 실행 중에 목격했다. 같은 프롬프트를 raw API로 직접 호출해 재현한 결과 Writer 48초(60초 하드 타임아웃에 위험할 만큼 근접) vs Critic 17초. `jd_analyzer`도 Critic 모델로 옮겼다.

**배치 크기가 커지면 Critic 모델도 60초로는 부족했다.** claim이 8건에서 17건으로 늘어난 문서를 재검증했더니 이번엔 Critic 모델조차 60초 타임아웃을 3회 연속 소진하고 실패했다(RetryError). 새 요청으로 재시도하니 106초 만에 성공 — 모델이나 로직 문제가 아니라 **배치 크기에 비례해 소요 시간이 늘어나는데 타임아웃은 고정값**이었던 것이 원인이었다. `LLMGateway`의 모든 메서드에 호출별 `timeout` 파라미터를 추가하고, 입력 크기에 비례해 비용이 커지는 두 배치 호출(`evidence_validator.validate()`, `defense_engine.generate_defense()`)에 120초를 적용했다.

**문서 소유권 검사가 아예 없는 엔드포인트가 2개 있었다.** `evidence_validator.validate()`와 `defense_engine.generate_defense()`는 `user_id`를 인자로 받으면서도 실제로 사용하지 않았다. `claims` 테이블에는 `user_id`가 없고 소유권은 부모 `generated_documents`에만 있어서, 인증된 아무 사용자나 남의 문서 UUID를 넘기면 그 사람의 claim 내용을 읽거나(`validate`) 남의 claim에 방어질문 행을 쓸 수 있었다(`generate_defense`). 소유권 검사 헬퍼를 만들어 두 진입점에 넣었고, 실제로 두 번째 익명 계정을 만들어 세 가지 엔드포인트(검증/방어질문 생성/수정)에 대해 직접 시도해 전부 404로 막히는 것을 확인했다.

**AI 문장 재작성이 문서의 다른 미검증 문장에서 근거를 빌려왔다.** FLAGGED 문장을 재작성시키자 "슬랙", "편집/디자인/HR" 같은 구체적 명사가 추가되며 "구체성을 보강했다"는 설명이 붙었는데, 등록된 evidence 어디에도 그 단어들이 없었다. 재작성 모델에 문서 전체를 컨텍스트로 줬더니, 그 안의 **다른 FLAGGED(마찬가지로 근거 없는) 문장**에서 디테일을 끌어온 것이었다. 프롬프트에 "document 필드는 문체 참고용일 뿐이며, 문서의 다른 부분에 있는 디테일이라도 evidence에 없으면 스스로 지어낸 것과 동일하게 취급하라"를 명시해 고쳤다. 재시도 결과 같은 claim에 대해 "근거가 없어 표현을 약화시켰다"는 재작성이 나왔다.

## 결과

- Supabase Auth로 발급된 실제 JWT 인증으로 10개 백엔드 모듈 전체가 한 사용자의 실제 데이터로 끝까지 실행되는 것을 확인했다.
- `evidence_validator`가 자소서 주장 10건 중 9건을 근거 부족으로 FLAGGED 처리했다 — 생성된 문서를 무비판적으로 통과시키지 않는다는 것을 실제 결과로 확인했다.
- 위 과정에서 실행 시점 버그 11곳(파라미터 불일치, 스키마 불일치, 프롬프트 스키마 누락, 모델 신뢰성 차이)을 찾아 고쳤다.
- 프론트엔드 UI/UX를 전면 개편했다: 디자인 토큰 통일, 상시 사이드바 도입, 에디터 본문에 검증 결과를 직접 밑줄로 표시(클릭 시 우측 카드와 연동), JD 인사이트·면접 방어 전체화면·피드백 리포트 3개 화면 신설.
- 이전에는 존재하지 않던 두 개의 루프를 완성했다: **편집 → 서버 저장 → claim 재추출 → 재검증**, 그리고 **FLAGGED 문장 → AI 재작성 → 적용 → 재검증**. 둘 다 실제 생성 문서로 끝까지 실행해 확인했다.
- 사용자가 손으로 입력한 3C4P가 이제 서버에 저장된다(`experience_3c4p`). 이전에는 localStorage에만 있어 기기를 바꾸면 사라졌다.
- 문서 생성에 스트리밍을 붙였다. 본문은 수 초 안에 화면에 다 뜨고, claim 추출까지 포함한 전체 저장은 그 뒤에 이어진다.
- 소유권 검사가 빠져 있던 IDOR 취약점 2건을 찾아 고치고, 실제 두 번째 계정으로 재현·재확인했다.
- 백엔드 회귀 테스트 31건을 추가했다(소유권 검사, claim 정규화/정착 로직).

## 한계

- 자동화된 테스트는 31건 있지만 전부 유닛 수준이다(소유권 검사 로직, claim 정규화/정착 헬퍼). 10단계 파이프라인 전체를 실행하는 통합 테스트나, LLM 응답을 목킹한 회귀 스위트는 없다 — 이번 두 차례 실행 모두 실제 API를 직접 호출해 수동으로 확인한 것이지 자동화된 스위트로 남지 않았다.
- LLM 출력 품질을 정량 평가하는 기준(eval)이 없다. 생성된 문서나 검증 결과가 "얼마나 좋은가"는 측정하지 않았다.
- `claims.evidence_id`는 사실상 항상 비어 있다. LLM이 claim을 추출하는 시점에는 실제 evidence 행의 UUID를 알 방법이 없어서다. 검증은 이 FK가 아니라 `evidence_validator`가 매번 새로 판단하는 방식으로 이뤄진다.
- Postgres RLS가 14개 테이블에 적용돼 있지만, 백엔드가 쓰는 DB 역할은 BYPASSRLS로 설정돼 있다(`DATABASE_URL`에 연결하는 role의 권한 기준). 실제 사용자 격리는 RLS가 아니라 각 쿼리에 손으로 넣은 `WHERE user_id = :user_id`에 의존한다. 이번 검증에서 격리 자체를 별도로 프로브하지는 않았다(단, 문서 소유권 검사가 빠져 있던 IDOR 2건은 실제로 발견해 고쳤다 — 위 「실패와 수정」 참고).
- `jobs`가 `ON DELETE SET NULL`이라 job을 삭제해도 그 job에 딸렸던 `generated_documents`/`claims`/`defense_questions`는 고아 행으로 남는다. `document_engine`에 문서 삭제 엔드포인트가 없어 API로는 정리할 수 없다.
- claim 재추출은 비결정적이다. 같은 문서에서 한 문장만 바꾼 재추출이 8건 → 17건으로 급증하는 것을 실제로 관찰했다. 추출 자체의 안정성(개수 변동 폭)은 아직 다루지 않았다.
- JD Insights는 여전히 사용자가 붙여넣은 JD 원문만 분석한다. 기업 기술 블로그·인터뷰 등 외부 웹 자료를 참조하는 RAG는 시도하지 않았다 — 웹 검색 API 키를 아직 구성하지 않았다.
- 이번 두 차례 실행 모두 API 레벨 검증이 중심이었다. 두 번째 실행에서 화면 렌더링(대시보드·경험 보관함·JD 인사이트·면접 방어·에디터 빈 상태)은 브라우저로 직접 확인했지만, 실제 생성된 문서로 편집·재작성·재검증 루프를 브라우저에서 클릭으로 끝까지 밟아본 것은 아니다 — 그 부분은 API를 직접 호출해 확인했다.

## 기술 스택

**Backend**
- FastAPI(Python 3.11+, async) + SQLAlchemy async + asyncpg
- NVIDIA API Catalog — Writer(`nvidia/llama-3.3-nemotron-super-49b-v1`) / Critic(`nvidia/nemotron-3-super-120b-a12b`) 두 모델. 원칙은 생성=Writer/평가=Critic이지만 실제 배정은 모듈별 실측 안정성에 따라 다르다(위 「왜 이렇게 설계했는가」 참고)
- Supabase(PostgreSQL + Auth + RLS)
- tenacity로 모든 LLM 호출에 3회 재시도

**Frontend**
- React 19 + TypeScript + Vite 6
- Tailwind CSS v4, motion(Framer Motion)
- Supabase-js(인증)

## 실행 방법

**Prerequisites:** Node.js, Python 3.11+

### Frontend

```
npm install
npm run dev
```

### Backend

```
cd backend
pip install -r ../requirements.txt
uvicorn app.main:app --reload
```

`backend/.env`에 다음 값을 채운다.

```
NVIDIA_API_KEY=
NVIDIA_API_BASE_URL=https://integrate.api.nvidia.com/v1
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
DATABASE_URL=postgresql+asyncpg://<pooler-connection-string>
ALLOWED_CORS_ORIGINS=["http://localhost:3000","http://localhost:5173"]
```

Vite dev 서버가 `/api` 요청을 `http://127.0.0.1:8000`의 백엔드로 프록시한다.
