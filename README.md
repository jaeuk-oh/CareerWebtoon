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

### 생성과 평가를 다른 모델에 맡겼다

하나의 모델에 생성(자소서 작성)과 평가(매칭 점수, 주장 검증)를 같이 맡기면 자기가 쓴 글을 자기가 채점하는 구조가 된다. Writer 모델(생성, temperature 0.3)과 Critic 모델(평가, temperature 0.1~0.2)을 분리했다. `experience_engine`의 3C4P·증거 추출은 Writer가, `matching_engine`/`strategy_engine`/`evidence_validator`의 채점·분류는 Critic이 맡는다. `LLMGateway`에 `generate()`/`generate_json()`(Writer)과 `analyze()`/`evaluate_json()`(Critic)을 나눠뒀다.

### AI 출력은 코드가 검증한 뒤에만 저장한다

LLM이 반환하는 JSON은 형식과 값 모두 신뢰할 수 없다. `claims.status`처럼 DB에 CHECK 제약이 걸린 값은 LLM 출력을 그대로 넣지 않고, 화이트리스트(`VERIFIED`/`UNVERIFIED`/`FLAGGED`)에 없으면 `UNVERIFIED`로 강제한다. `evidence_id`처럼 FK가 걸린 값도 실제 UUID 형식인지 확인한 뒤에만 저장하고, 아니면 NULL로 둔다(`document_engine/service.py`의 `_normalize_claim_status`, `_as_uuid_or_none`).

### Gemini에서 NVIDIA API Catalog로 바꾼 이유

비용이었다. 무료 크레딧 안에서 Writer/Critic 두 모델 구조를 유지할 수 있어 전환했고, 생성 품질을 비교하지는 않았다.

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

## 결과

- Supabase Auth로 발급된 실제 JWT 인증으로 10개 백엔드 모듈 전체가 한 사용자의 실제 데이터로 끝까지 실행되는 것을 확인했다.
- `evidence_validator`가 자소서 주장 10건 중 9건을 근거 부족으로 FLAGGED 처리했다 — 생성된 문서를 무비판적으로 통과시키지 않는다는 것을 실제 결과로 확인했다.
- 위 과정에서 실행 시점 버그 11곳(파라미터 불일치, 스키마 불일치, 프롬프트 스키마 누락, 모델 신뢰성 차이)을 찾아 고쳤다.

## 한계

- 자동화된 테스트가 없다. 이번 검증은 한 사용자, 한 세트의 데이터로 1회 수동 실행한 것이고 회귀 테스트로 남아 있지 않다.
- LLM 출력 품질을 정량 평가하는 기준(eval)이 없다. 생성된 문서나 검증 결과가 "얼마나 좋은가"는 측정하지 않았다.
- 문서 생성 프롬프트가 회사명·JD 원문을 명시적으로 포함하지 않는다. 생성된 자소서에 `[회사 이름]`, `[JD Requirement N]` 같은 플레이스홀더가 남는다.
- `claims.evidence_id`는 사실상 항상 비어 있다. LLM이 claim을 추출하는 시점에는 실제 evidence 행의 UUID를 알 방법이 없어서다. 검증은 이 FK가 아니라 `evidence_validator`가 매번 새로 판단하는 방식으로 이뤄진다.
- Postgres RLS가 14개 테이블에 적용돼 있지만, 백엔드가 쓰는 DB 역할은 BYPASSRLS로 설정돼 있다(`DATABASE_URL`에 연결하는 role의 권한 기준). 실제 사용자 격리는 RLS가 아니라 각 쿼리에 손으로 넣은 `WHERE user_id = :user_id`에 의존한다. 이번 검증에서 격리 자체를 별도로 프로브하지는 않았다.
- `evidence_validator.get_validation()`, `defense_engine.get_defense()`는 여전히 placeholder다. 생성 직후 응답은 확인했지만 이후 재조회 API는 동작하지 않는다.
- Pipeline 화면(프론트엔드)의 매칭 단계는 "94% Match"처럼 고정된 텍스트를 보여준다 — 실제 매칭은 `createPipeline()`이 백그라운드에서 호출하지만, 화면에 표시되는 점수·문구 자체는 API 응답과 연결돼 있지 않다.
- 이번 검증은 API 레벨에서만 이뤄졌다. 프론트엔드 화면에서 같은 플로우를 직접 눌러보며 확인하지는 않았다.

## 기술 스택

**Backend**
- FastAPI(Python 3.11+, async) + SQLAlchemy async + asyncpg
- NVIDIA API Catalog — Writer(`nvidia/llama-3.3-nemotron-super-49b-v1`, 생성) / Critic(`nvidia/nemotron-3-super-120b-a12b`, 평가) 역할 분리
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
