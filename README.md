# Funnel & Retention Explorer

이벤트 로그 CSV를 올리면 퍼널 전환, 코호트 리텐션, 세그먼트 비교, 구독 지표를 브라우저에서 계산해 보여 주는 분석 대시보드입니다. React 19 + TypeScript로 만들었고, 로그인·클라우드 저장은 Supabase, 요약 생성은 Gemini를 씁니다.

- 라이브: https://fre-analytics.vercel.app (로그인하지 않아도 분석 화면은 열립니다)
- 바로 써 볼 데이터: [`샘플 데이터/`](샘플%20데이터)의 이커머스·구독 CSV

![퍼널 분석 화면](docs/screenshots/fre-funnel-analysis.png)

## 왜 만들었나

퍼널 전환율이나 코호트 리텐션은 보통 분석 도구가 계산해 준 숫자로만 접합니다. 코호트를 일·주·월 중 무엇으로 묶었는지, 세그먼트 간 전환율 차이가 표본 크기에 비해 의미가 있는지 같은 가정은 화면에 잘 드러나지 않습니다.

이 저장소는 그 계산을 직접 구현하고, SDK 연동 없이 이벤트 로그 CSV만 있으면 쓸 수 있는 웹 제품으로 만든 것입니다. 계산 로직과 함께 로그인, 저장, 접근 제어까지 한 제품 안에서 다룹니다. 같은 주제를 SQL과 Python 노트북으로 분석한 작업도 함께 두었습니다.

## 무엇을 하는가

- **CSV 업로드와 컬럼 자동 매핑**: 헤더 이름으로 먼저 맞추고, 안 맞는 컬럼은 값의 형태를 점수화해 추정합니다. 사용자가 확인하고 고칠 수 있습니다. 처리 뒤에는 유효 행, 제외된 행, 결측률을 담은 품질 리포트를 보여 줍니다.
- **퍼널 분석**: 단계를 직접 구성하면 단계별 사용자 수, 직전 단계 대비 전환율, 이탈 수, 단계 간 소요 시간(중앙값·p10·p90·평균)을 계산합니다.
- **코호트 리텐션**: 코호트 이벤트와 활성 이벤트를 골라 일간(D0~D14), 주간(W0~W12), 월간(M0~M6)으로 봅니다. 구독 데이터에는 유료 리텐션(D0/7/14/30/60/90)이 따로 있습니다.
- **세그먼트 비교**: 플랫폼·채널별 전환율, 전체 대비 차이(%p), p-value를 표시합니다. 두 세그먼트를 골라 비교하는 화면에는 차이의 95% 신뢰구간과 필요 표본 수가 함께 나옵니다.
- **구독 분석**: 이벤트 이름으로 이커머스·구독 데이터를 구분하고, 구독 데이터면 유료 사용자·매출·해지율, 체험→유료 전환, 해지 사유를 계산합니다.
- **인사이트**: 임계값 규칙 13개(최대 이탈 구간, 플랫폼·채널 격차, D1 리텐션, 결제 실패율 등)가 결과를 문장으로 정리합니다. 로그인하면 Gemini가 집계 결과를 요약하고 질문에 답합니다.
- **저장과 내보내기**: 로그인 사용자는 프로젝트, 데이터셋 정보, 분석 스냅샷을 저장합니다. 결과는 CSV·Excel로, 리포트는 PNG·PDF로 내보냅니다.
- **한국어·영어 UI**(i18next)와 PWA 설정을 포함합니다.

### 계산 정의

구현된 그대로 적습니다. 경로는 모두 `funnel-&-retention-explorer frontend/` 기준입니다.

| 지표 | 정의 | 파일 |
|---|---|---|
| 퍼널 | n단계 사용자 = n-1단계 사용자 중 n단계 이벤트가 한 번이라도 있는 사용자. 전환율은 직전 단계 대비 | `lib/funnelEngine.ts` |
| 단계 간 시간 | 사용자별로 앞 단계의 첫 이벤트부터 그 뒤에 나온 첫 다음 단계 이벤트까지(분) | `lib/funnelEngine.ts` |
| 활동 리텐션 | 코호트 이벤트가 발생한 날짜(주·월)별 사용자 집합에서, N기간 뒤 활성 이벤트가 있는 사용자 비율 | `lib/retentionEngine.ts` |
| 유료 리텐션 | 첫 `subscribe` 이벤트 날짜로 코호트를 만들고, 기준일까지 `cancel` 이벤트가 없으면 유지로 계산 | `lib/retentionEngine.ts` |
| 세그먼트 유의성 | 합동 비율(pooled)을 쓰는 두 비율 z-검정, 양측. 세그먼트의 (마지막 단계 사용자 ÷ 첫 단계 사용자)를 전체 데이터의 같은 비율과 비교. 정규분포 누적값은 erf 수치 근사 | `lib/segmentEngine.ts` |
| A/B 비교 | 위와 같은 z-검정, 차이의 95% 신뢰구간(비합동 표준오차, z=1.96), 필요 표본 수(양측 α=0.05, 검정력 0.8) | `lib/abTestEngine.ts` |

## 구조

```
브라우저 (React SPA, Vercel)
  CSV 파일 → Web Worker(PapaParse) → 컬럼 매핑·정제 → 분석 엔진(lib/*.ts) → 화면(Recharts)
     │        원본 행은 브라우저 메모리에만 있습니다
     │
     ├─ Supabase Auth ........ 이메일 로그인, 세션 토큰
     ├─ Supabase Postgres .... 프로젝트 · 데이터셋 정보 · 분석 스냅샷 (RLS: 소유자만 접근)
     └─ Edge Function ai-proxy → 세션 확인 · 일일 호출 한도 → Gemini (gemini-2.0-flash)
                                 보내는 내용: 사용자 수, 이벤트 이름, 전환율, D1/D7, 구독 KPI, 인사이트 문장
```

퍼널·리텐션·세그먼트·구독·인사이트 계산은 전부 브라우저에서 끝납니다. 서버로 가는 것은 로그인, 저장을 눌렀을 때의 결과 스냅샷, AI 요약 요청입니다.

| 경로 | 내용 |
|---|---|
| [`funnel-&-retention-explorer frontend/`](funnel-%26-retention-explorer%20frontend) | 현재 버전(React). `lib/` 계산·데이터 접근, `hooks/` 상태 연결, `pages/`·`components/` 화면, `context/` 전역 상태, `__tests__/`·`e2e/` 테스트 |
| `funnel-&-retention-explorer frontend/supabase/` | Edge Function 7개(Deno)와 마이그레이션 SQL. 기본 테이블은 같은 폴더 상위의 `supabase-migration.sql` |
| 루트의 `index.html`, `app.js`, `charts.js`, `styles.css` | 예전 Vanilla JS 버전. 빌드 단계가 없고, React 버전의 분석 엔진은 여기서 옮겨 왔습니다. 지금은 갱신하지 않습니다 |
| `n8n-workflow-template.json`, `N8N_QUICKSTART.md` | 예전 버전에서 리포트를 메일로 보내던 n8n 워크플로 템플릿과 안내 |
| [`sql-analysis/`](sql-analysis/README.md) | BigQuery 공개 데이터(Google Merchandise Store)로 퍼널·리텐션·세그먼트를 분석한 SQL 5개와 노트북 5개. 앱과 독립된 분석 작업입니다 |
| [`ml-analysis/`](ml-analysis/README.md) | RFM 세그멘테이션(K-Means)과 이탈 예측 모델링 노트북 5개. 앱과 독립이며 데이터 파일은 저장소에 없습니다 |
| `docs/` | 화면 캡처(`screenshots/`)와 인증 메일 템플릿(`email-templates/`) |

## 설계 결정

경로는 `funnel-&-retention-explorer frontend/` 기준입니다.

1. **계산은 브라우저에서 하고 원본 CSV는 서버에 올리지 않습니다.** 업로드한 로그를 다른 곳에 보내지 않고도 분석할 수 있게 하려는 선택입니다. 저장 기능도 파일 이름, 행 수, 컬럼 매핑, 품질 리포트와 결과 스냅샷만 남깁니다. 대신 브라우저 메모리가 한계라 파일 50MB, 100,000행으로 입력을 제한했습니다. (`lib/csvParser.ts`, `supabase-migration.sql`)
2. **계산 로직을 컴포넌트 밖 함수로 분리했습니다.** `lib/`의 엔진은 데이터 배열을 받아 결과를 돌려주는 함수이고, `hooks/`가 이를 화면 상태에 연결합니다. 그래서 화면을 띄우지 않고 CSV 텍스트에서 엔진 결과까지를 테스트합니다. 같은 데이터·같은 설정의 재계산은 데이터 참조를 키로 하는 캐시로 건너뜁니다. (`lib/funnelEngine.ts`, `lib/engineCache.ts`, `__tests__/integration/`)
3. **Gemini 키는 브라우저에 두지 않습니다.** 브라우저는 Supabase 세션 토큰으로 Edge Function을 호출하고, 함수가 사용자를 확인한 뒤 계정별 일일 호출 수를 세고, 허용한 필드만 골라 Gemini에 전달합니다. 출력 길이 상한도 서버에서 정합니다. (`lib/geminiClient.ts`, `supabase/functions/ai-proxy/index.ts`)
4. **접근 제어는 라우트와 데이터베이스 두 곳에 둡니다.** 분석 화면은 게스트에게 열어 두고, 계정에 묶인 화면(팀, 웹훅, 예약 리포트, 커넥터, 알림)만 로그인을 요구합니다. 저장 버튼은 로그인 상태에서만 보입니다. 프로젝트·데이터셋·스냅샷 테이블은 RLS 정책으로 소유자 본인의 행만 읽고 쓸 수 있게 정의했습니다. Supabase 환경 변수가 없으면 클라이언트를 만들지 않아, 분석 기능만 있는 상태로 앱이 뜹니다. (`router.tsx`, `components/ProtectedRoute.tsx`, `lib/supabase.ts`, `supabase-migration.sql`)
5. **컬럼 매핑은 이름 → 값 순서의 두 단계입니다.** 내보내는 도구마다 헤더 이름이 달라서, 한국어·영어 후보 이름으로 먼저 찾고 남은 컬럼은 표본 값의 날짜 형식, 고유값 비율, ID 패턴 등으로 점수를 매깁니다. 숫자만 있는 컬럼이 날짜로 잘못 잡히지 않도록 날짜 해석은 숫자가 아닌 값에만 적용합니다. (`lib/dataProcessor.ts`, `lib/columnValueDetector.ts`)

## 검증

2026-10-13 로컬에서 직접 실행한 결과입니다.

| 항목 | 결과 |
|---|---|
| `vitest run` | 테스트 파일 36개, 테스트 317개 모두 통과 |
| `tsc --noEmit` | 오류 없음 |
| Playwright E2E | 스펙 4개에 테스트 13개(랜딩, 업로드, 퍼널, 리텐션). PR의 CI에서 실행하도록 구성되어 있고, 통과 건수는 이 표에 적지 않습니다 |

Vitest 317개의 구성은 다음과 같습니다.

| 위치 | 파일 | 테스트 | 대상 |
|---|---|---|---|
| `__tests__/unit` | 13 | 135 | CSV 파서, 컬럼 감지, 데이터 정제, 퍼널·리텐션 엔진, 리듀서, 내보내기 |
| `__tests__/integration` | 7 | 40 | 픽스처 데이터로 파싱부터 퍼널·리텐션·세그먼트·구독·인사이트까지 |
| `__tests__/hooks` | 9 | 69 | 분석 훅, 대시보드 레이아웃, 내보내기 |
| `__tests__/components`, `pages`, `lib` | 7 | 73 | 공용 컴포넌트, 대시보드 화면, 캐시 |

- CI([`.github/workflows/ci.yml`](.github/workflows/ci.yml))는 `main`으로 가는 PR에서 `npm ci` → `vitest run` → `vite build` → Playwright(Chromium) 순으로 실행합니다. push에는 돌지 않고, 현재 Actions 실행 기록은 없습니다.
- 세그먼트 p-value는 값이 0~1 범위인지만 테스트합니다. 기준값과 대조하는 테스트는 없습니다.
- Edge Function과 RLS 정책에는 자동 테스트가 없습니다.

## 기술 스택

`funnel-&-retention-explorer frontend/package.json` 기준입니다.

| 구분 | 사용 |
|---|---|
| UI | React 19.2, TypeScript 5.8, react-router-dom 7.13, Tailwind CSS(CDN 스크립트), lucide-react 0.563 |
| 차트·데이터 | Recharts 3.7, PapaParse 5.5, xlsx 0.18, jsPDF 4.1, @tanstack/react-virtual 3.13 |
| 빌드 | Vite 6.2, vite-plugin-pwa 1.2 |
| 백엔드 | Supabase(@supabase/supabase-js 2.95): Auth, Postgres + RLS, Edge Functions(Deno) |
| AI | Gemini `gemini-2.0-flash` (Edge Function 경유) |
| 다국어 | i18next 25.8, react-i18next 16.5 |
| 테스트 | Vitest 4.0, Testing Library(React 16.3), jsdom 26, Playwright 1.58 |
| 관측 | @sentry/react 10.38, @vercel/analytics 1.6, @vercel/speed-insights 1.3 |
| 배포 | Vercel(`vercel.json`에 보안 헤더 정의) |

## 로컬 실행

CI는 Node 20을 쓰고, 위 검증은 Node 24에서 실행했습니다.

```bash
cd "funnel-&-retention-explorer frontend"
npm install
npm run dev          # http://localhost:3000
npm test             # vitest run
npm run test:e2e     # Playwright, 개발 서버를 자동으로 띄웁니다
npm run build
```

Windows에서는 디렉터리 이름의 `&` 때문에 `npx vitest run`이 실패합니다. 그럴 때는 `node node_modules/vitest/vitest.mjs run`, `node node_modules/vite/bin/vite.js`처럼 직접 실행합니다.

환경 변수 없이 실행하면 로그인·저장·AI 없이 CSV 분석만 동작합니다. 전체 기능을 쓰려면 `.env.example`을 복사해 `.env`를 만듭니다.

| 이름 | 위치 | 용도 |
|---|---|---|
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` | 프런트 `.env` | 로그인, 저장, Edge Function 호출 |
| `VITE_GA_MEASUREMENT_ID`, `VITE_SENTRY_DSN` | 프런트 `.env` | 선택. 방문 통계, 오류 수집 |
| `GEMINI_API_KEY`, `FRONTEND_URL` | Edge Function 시크릿 | AI 요약, 허용 출처 |
| `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT` | 빌드 환경 | 선택. 소스맵 업로드 |

`.env.example`에는 `VITE_GEMINI_API_KEY`가 남아 있지만 코드에서는 읽지 않습니다. Supabase 쪽은 `supabase-migration.sql`과 `supabase/migrations/`의 SQL을 적용하고 `supabase/functions/`를 배포해야 합니다.

## 알려진 제한

- **퍼널은 이벤트 순서를 검사하지 않습니다.** 뒤 단계 이벤트가 앞 단계보다 먼저 일어난 사용자도 전환으로 셉니다. 순서는 단계 간 소요 시간 계산에만 반영됩니다.
- **세그먼트 검정의 비교 대상에 세그먼트 자신이 들어 있습니다.** 세그먼트와 전체를 비교하므로 두 표본이 독립이 아닙니다. 여러 세그먼트를 한꺼번에 볼 때의 다중 비교 보정도 없고, 정규 근사라 표본이 작으면 부정확합니다. 세그먼트 전환율은 단계별 이벤트 보유 사용자 수를 첫 단계 사용자 수로 나눈 값이어서 퍼널 화면의 전환율과 정의가 다릅니다.
- **리텐션은 관측 기간이 모자란 코호트를 구분하지 않습니다.** 데이터가 끝난 뒤의 기간은 활동 리텐션에서 0%, 유료 리텐션에서 유지로 표시됩니다. 코호트 이벤트를 여러 날에 한 사용자는 여러 코호트에 들어갑니다. 일간 코호트 날짜는 UTC 기준입니다.
- **입력 형식**: timestamp, user_id, event_name 세 컬럼이 필요하고 파일 50MB, 100,000행까지 받습니다. 데이터 유형 감지와 퍼널 템플릿은 영어 이벤트 이름 패턴(`purchase`, `subscribe` 등)에 의존하며, 구독 분석도 `subscribe`·`cancel`이 들어간 이벤트 이름과 `revenue` 같은 고정 컬럼 이름을 전제로 합니다.
- **AI 요약**은 로그인이 필요하고 계정별 일일 호출 한도가 있습니다. 집계 요약만 받으므로 개별 행 수준의 질문에는 답하지 못합니다.
- **타입 검사는 자동으로 돌지 않습니다.** `tsc --noEmit`은 통과하지만 CI와 빌드에는 타입 검사 단계가 없어 수동으로 실행합니다.
- **결제는 없습니다.** 요금제 컬럼, 결제 스크립트를 불러오는 태그, 화면 문구 일부가 남아 있지만 결제 흐름은 구현되어 있지 않고, 화면 쪽 요금제 제한은 꺼져 있습니다(`hooks/usePlanGate.ts`).
- **이 문서가 다루지 않은 화면**: 외부 데이터 커넥터, 웹훅, 예약 리포트, 팀, 공유 링크, 사용자 여정, 스티키니스 화면과 관련 Edge Function 코드가 저장소에 있으나 위 검증 범위에 들어 있지 않습니다. 알림·저장 퍼널·공유 토큰 관련 테이블 정의는 저장소의 마이그레이션에 없어, 저장소만으로는 전체 스키마를 재현할 수 없습니다.
- Tailwind를 빌드에 포함하지 않고 CDN 스크립트로 불러옵니다.
