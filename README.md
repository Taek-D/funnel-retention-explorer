# Funnel & Retention Explorer

CSV 기반 퍼널/리텐션/세그먼트/구독 분석 SaaS 대시보드입니다. 이커머스와 구독 서비스 데이터를 자동 감지하여 전환 퍼널, 코호트 리텐션, 세그먼트 비교, AI 인사이트를 제공합니다.

**Live**: https://fre-analytics.vercel.app

## 프로젝트 구조

이 프로젝트는 두 가지 버전으로 구성되어 있습니다:

| | Vanilla JS (Legacy) | React Frontend (Active) |
|---|---|---|
| **위치** | 루트 (`app.js`, `index.html`) | `funnel-&-retention-explorer frontend/` |
| **스택** | HTML/CSS/JS + Chart.js (CDN) | React 19 + TypeScript + Vite 6 + Recharts |
| **인증** | - | Supabase Auth (이메일/게스트) |
| **AI** | - | Gemini 2.0 Flash |
| **배포** | - | Vercel (자동 배포) |
| **상태** | 유지보수 모드 | 활성 개발 |

## 주요 기능

### SaaS 기능
- **회원 인증**: Supabase Auth 기반 회원가입/로그인/게스트 모드
- **클라우드 저장**: 프로젝트/데이터셋/분석 스냅샷 클라우드 저장 (Supabase)
- **AI 인사이트**: Gemini 2.0 Flash API로 한국어 데이터 분석 요약 및 질의응답
- **Protected Routes**: 인증 상태에 따른 페이지 접근 제어 (게스트 허용)
- **리포트 내보내기**: 분석 결과를 PNG 리포트로 내보내기 (AI 요약 포함, 자동 페이지 분할)
- **알림 시스템**: 분석 완료, AI 처리, 내보내기 등 활동 알림
- **글로벌 검색**: Cmd+K 단축키로 페이지/인사이트/이벤트 통합 검색

### 데이터 업로드 (3단계)
1. **Step 1** — CSV 파일 드래그 앤 드롭 업로드
2. **Step 2** — AI 기반 자동 컬럼 매핑 + 데이터 미리보기 + 품질 리포트
3. **Step 3** — 매핑 확인 및 데이터 처리 완료

- 이커머스/구독 서비스 데이터 유형 자동 감지
- 최근 파일 기록 (최대 5개, localStorage)
- 상위 이벤트 분포 표시

### 퍼널 분석
- 데이터 유형별 자동 템플릿 (이커머스/구독/생애주기)
- 다단계 퍼널 구성 (이벤트 드롭다운으로 스텝 추가/제거)
- 각 단계별 사용자 수, 전환율, 이탈 수 계산
- 단계 간 중간 소요 시간 측정
- Recharts 기반 인터랙티브 바 차트 시각화

### 리텐션 코호트 분석
- **Activity Retention**: 코호트 이벤트 + 활성 이벤트 기반 D0~D14 리텐션
- **Paid Retention** (구독 데이터): 구독일 기준 D0/D7/D14/D30/D60/D90 유료 리텐션
- 코호트 히트맵 테이블 (색상 강도로 리텐션율 표현)
- D1/D7/D14 핵심 지표 카드
- 평균 리텐션 커브 차트

### 세그먼트 비교
- 플랫폼별 (iOS, Android, Web 등) 전환율 비교
- 채널별 (Google, Facebook, Organic 등) 전환율 비교
- 통계적 유의성 검정 (p-value 계산)
- 평균 대비 Uplift 표시
- Top Performer 하이라이트

### 자동 인사이트 엔진
데이터 업로드 시 자동으로 최대 13가지 인사이트 생성:

**일반 인사이트 (7가지)**
- 최대 이탈 지점 감지
- 플랫폼 성과 격차 (10%p 이상 차이 경고)
- 채널 성과 편차 (15%p 이상 차이 경고)
- D1 리텐션 경고 (25% 미만)
- 리텐션 급락 지점
- 모범 사례 세그먼트
- 전체 전환율 요약

**구독 인사이트 (6가지)**
- 낮은 Trial 전환율 (40% 미만)
- 느린 전환 시간 (72시간 이상)
- 높은 결제 실패율 (5% 이상)
- 높은 해지율 (10% 이상)
- 해지 사유별 맞춤 개선안
- 낮은 Paid Retention (D7 70% 미만, D30 50% 미만)

### AI 분석 (Gemini 2.0 Flash)
- **AI 분석 요약**: 데이터 기반 종합 분석 요약 (한국어)
- **AI 질의응답**: 데이터에 대해 자유롭게 질문
- **상태 유지**: 탭 전환 시에도 AI 요약 결과가 유지됨

### 구독 분석 (Subscription Analytics)
구독 서비스 데이터 감지 시 자동 활성화:
- **KPI 대시보드**: 총 사용자, 유료 사용자, 매출, ARPPU, 해지율
- **Trial 전환 분석**: 무료체험 → 유료 전환율, 체험 기간별 비교
- **이탈 분석**: 해지율, 상위 해지 사유, 해지 시점 분석

### 대시보드
- 데이터 유형에 따른 동적 KPI 카드 (구독 vs 일반)
- 퍼널 드롭오프 바 차트
- 평균 리텐션 커브
- 최근 인사이트 4개 표시
- PNG 리포트 내보내기

## 라우팅 구조

```
/                → LandingPage (소개 페이지)
/login           → LoginPage (로그인)
/signup          → SignupPage (회원가입)
/app/*           → ProtectedRoute → AppShell (사이드바 + 헤더)
  /app/dashboard   → Dashboard (메인 대시보드)
  /app/upload      → DataImport (CSV 업로드)
  /app/funnels     → FunnelAnalysis (퍼널 분석)
  /app/retention   → RetentionAnalysis (리텐션 분석)
  /app/segments    → SegmentComparison (세그먼트 비교)
  /app/insights    → Insights (AI 인사이트)
```

## 기술 스택

### React Frontend (Active)

```
funnel-&-retention-explorer frontend/
├── index.html                 # Tailwind CDN + Vite 엔트리
├── index.tsx                  # AuthProvider > AppProvider > ToastProvider > NotificationProvider > Router
├── router.tsx                 # createBrowserRouter (라우팅 정의)
├── types/
│   └── index.ts               # TypeScript 인터페이스 (20+ 타입)
├── context/
│   ├── AppContext.tsx          # React Context + useReducer (전역 상태)
│   ├── AuthContext.tsx         # Supabase Auth 상태 관리
│   ├── NotificationContext.tsx # 앱 내 알림 상태
│   ├── actions.ts             # Action 타입 정의
│   └── reducer.ts             # Reducer + initialState
├── lib/                       # 순수 TypeScript 모듈 (React 의존성 없음)
│   ├── csvParser.ts           # PapaParse 래퍼
│   ├── dataProcessor.ts       # processData, detectDatasetType, autoDetectColumns
│   ├── funnelEngine.ts        # calculateFunnel, 템플릿, 전환율
│   ├── retentionEngine.ts     # 활동/유료 리텐션 코호트 계산
│   ├── segmentEngine.ts       # 세그먼트 비교, p-value 통계
│   ├── insightsEngine.ts      # 13가지 인사이트 자동 생성
│   ├── subscriptionEngine.ts  # KPI, 트라이얼, 이탈 분석
│   ├── reportEngine.ts        # Canvas 기반 PNG 리포트 생성 (AI 요약 포함)
│   ├── formatters.ts          # formatTime, formatNum, formatPct, formatCurrency
│   ├── constants.ts           # EVENT_PATTERNS, FUNNEL_TEMPLATES
│   ├── recentFiles.ts         # localStorage 최근 파일 관리
│   ├── supabase.ts            # Supabase 클라이언트 초기화
│   ├── supabaseData.ts        # 프로젝트/데이터셋/스냅샷 CRUD
│   └── geminiClient.ts        # Gemini AI API 클라이언트
├── hooks/                     # lib ↔ React 상태 브릿지
│   ├── useCSVUpload.ts        # 파일 업로드 + 전체 파이프라인 오케스트레이션
│   ├── useColumnMapping.ts    # 컬럼 매핑 상태
│   ├── useFunnelAnalysis.ts   # 퍼널 분석 계산
│   ├── useRetentionAnalysis.ts # 리텐션 분석 계산
│   ├── useSegmentComparison.ts # 세그먼트 비교 로직
│   ├── useAIInsights.ts       # Gemini AI 요약/질의 (전역 상태 연동)
│   ├── useExportReport.ts     # PNG 리포트 내보내기
│   ├── useClickOutside.ts     # 외부 클릭 감지 공통 훅
│   └── useEmailSettings.ts    # 이메일 알림 설정
├── pages/
│   ├── Dashboard.tsx          # 메인 대시보드 (KPI + 차트 + 인사이트)
│   ├── DataImport.tsx         # CSV 업로드 + 컬럼 매핑 + 품질 리포트
│   ├── FunnelAnalysis.tsx     # 퍼널 시각화 + 메트릭
│   ├── RetentionAnalysis.tsx  # 코호트 테이블 + 리텐션 커브
│   ├── SegmentComparison.tsx  # 세그먼트 비교 + 통계
│   ├── Insights.tsx           # AI 분석 요약 + 인사이트 카드 + 구독 KPI
│   ├── LandingPage.tsx        # 랜딩/소개 페이지
│   ├── LoginPage.tsx          # 로그인 페이지
│   ├── SignupPage.tsx         # 회원가입 페이지
│   └── ProjectsPage.tsx       # 프로젝트 관리 페이지
├── components/
│   ├── AppShell.tsx           # 앱 레이아웃 (사이드바 + 헤더 + 콘텐츠)
│   ├── Sidebar.tsx            # 아이콘 사이드 네비게이션 (6탭)
│   ├── LandingHeader.tsx      # 랜딩 페이지 헤더
│   ├── ProtectedRoute.tsx     # 인증 가드 (게스트 모드 지원)
│   ├── UserMenu.tsx           # 사용자 드롭다운 메뉴
│   ├── NotificationPanel.tsx  # 알림 패널
│   ├── SearchModal.tsx        # Cmd+K 글로벌 검색 모달
│   ├── SaveAnalysisButton.tsx # 분석 결과 클라우드 저장
│   ├── AskAIPanel.tsx         # Gemini AI 질의 패널
│   ├── Toast.tsx              # 토스트 알림 (Provider + hook)
│   ├── Modal.tsx              # 범용 모달
│   └── Icons.tsx              # Lucide React 아이콘 re-export
├── __tests__/
│   ├── unit/                  # 단위 테스트
│   │   ├── dataProcessor.test.ts
│   │   └── formatters.test.ts
│   ├── integration/           # 통합 테스트
│   │   ├── csv-to-processed.test.ts
│   │   ├── full-pipeline.test.ts
│   │   ├── funnel-pipeline.test.ts
│   │   ├── retention-pipeline.test.ts
│   │   ├── segment-pipeline.test.ts
│   │   ├── subscription-pipeline.test.ts
│   │   └── insights-pipeline.test.ts
│   ├── fixtures/              # 테스트 데이터 (이커머스/구독)
│   └── helpers/               # 테스트 유틸리티
├── vite.config.ts
├── vitest.config.ts
├── tsconfig.json
└── package.json
```

**핵심 의존성:**

| 패키지 | 버전 | 용도 |
|--------|------|------|
| React | 19.2 | UI 프레임워크 |
| TypeScript | 5.8 | 타입 안전성 |
| Vite | 6.2 | 빌드 도구 + 개발 서버 |
| Recharts | 3.7 | 차트 시각화 (BarChart, AreaChart) |
| PapaParse | 5.5 | CSV 파싱 |
| Lucide React | 0.563 | 아이콘 |
| @supabase/supabase-js | 2.95 | 인증 + 데이터베이스 |
| react-router-dom | 7.13 | SPA 라우팅 |
| Tailwind CSS | CDN | 유틸리티 CSS (다크 테마) |
| Vitest | 4.0 | 테스트 프레임워크 |

**아키텍처:**

```
CSV File → csvParser → dataProcessor → AppContext (useReducer)
                                              ↓
                    hooks (useFunnelAnalysis, useRetentionAnalysis, ...)
                                              ↓
                    pages (Dashboard, FunnelAnalysis, RetentionAnalysis, ...)
                                              ↓
                    lib engines (funnelEngine, retentionEngine, ...)

Supabase Auth → AuthContext → ProtectedRoute → AppShell → pages
Gemini API → geminiClient → useAIInsights → AppState (aiSummary) → Insights / Report
Supabase DB → supabaseData → SaveAnalysisButton / ProjectsPage
NotificationContext → NotificationPanel → Toast
```

- `lib/`: 순수 TypeScript 모듈 (React 의존성 없음) - 테스트 및 재사용 용이
- `context/`: React Context + useReducer로 전역 상태 관리, Supabase Auth, 알림
- `hooks/`: lib 함수와 React 상태를 연결하는 브릿지
- `pages/`: hooks를 소비하는 UI 컴포넌트

### Vanilla JS (Legacy)

```
├── index.html              # 메인 HTML (한국어 UI, SPA)
├── app.js                  # 핵심 로직 3,373줄 (상태관리, 분석 엔진)
├── charts.js               # Chart.js 차트 렌더링
├── styles.css              # 다크 테마 CSS
└── pdf_font_noto_sans_kr.js # PDF 한글 폰트 (7.9MB)
```

- Chart.js, PapaParse, jsPDF 모두 CDN 로드
- 빌드 도구/패키지 매니저 없음

## 시작하기

### React Frontend (권장)

```bash
# 프론트엔드 디렉토리로 이동
cd "funnel-&-retention-explorer frontend"

# 의존성 설치
npm install

# 개발 서버 시작 (http://localhost:3000)
npm run dev

# 프로덕션 빌드
npm run build
```

### 환경 변수

`funnel-&-retention-explorer frontend/.env` 파일에 다음 변수를 설정합니다:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_GEMINI_API_KEY=your-gemini-api-key
```

> 환경 변수 없이도 게스트 모드로 CSV 업로드 및 분석 기능을 사용할 수 있습니다. Supabase/Gemini 키가 없으면 인증과 AI 기능만 비활성화됩니다.

### 테스트

```bash
cd "funnel-&-retention-explorer frontend"

# 전체 테스트 실행 (단위 + 통합)
npm test

# Watch 모드
npm run test:watch
```

테스트 구조:
- **단위 테스트**: `dataProcessor`, `formatters` 모듈 검증
- **통합 테스트**: CSV 파싱 → 데이터 처리 → 분석 엔진 파이프라인 전체 검증
- **테스트 픽스처**: 이커머스/구독 샘플 데이터 (소규모 + 풀사이즈)

### Vanilla JS (Legacy)

```bash
# 브라우저에서 index.html 직접 열기
open index.html

# 또는 Python 내장 서버
python -m http.server 8000
```

## 필요한 데이터 형식

CSV 파일에 다음 컬럼이 필요합니다:

### 필수 컬럼

| 컬럼 | 설명 | 예시 |
|------|------|------|
| **timestamp** | 이벤트 발생 시간 | 2024-01-01 10:00:00 |
| **user_id** | 사용자 고유 ID | user_12345 |
| **event_name** | 이벤트 이름 | view_item, purchase |

### 선택 컬럼

| 컬럼 | 설명 | 예시 |
|------|------|------|
| session_id | 세션 ID | session_abc123 |
| platform | 플랫폼 | ios, android, web |
| channel | 유입 채널 | google, facebook, organic |
| trial_days | 무료 체험 기간 (일) | 7, 14, 30 |
| plan | 구독 플랜 | monthly, yearly |
| cancel_reason | 해지 사유 | too_expensive |
| revenue | 매출 금액 | 9.99 |

### CSV 예시

**이커머스:**
```csv
timestamp,user_id,event_name,session_id,platform,channel
2024-01-01 10:00:00,user1,view_item,sess1,ios,google
2024-01-01 10:05:00,user1,add_to_cart,sess1,ios,google
2024-01-01 10:10:00,user1,begin_checkout,sess1,ios,google
2024-01-01 10:15:00,user1,purchase,sess1,ios,google
```

**구독 서비스:**
```csv
timestamp,user_id,event_name,platform,channel,trial_days,plan,cancel_reason,revenue
2024-01-01 09:00:00,user001,app_open,iOS,organic,,,
2024-01-01 09:05:00,user001,signup,iOS,organic,,,
2024-01-01 09:15:00,user001,start_trial,iOS,organic,7,,
2024-01-08 10:00:00,user001,subscribe,iOS,organic,,monthly,19.99
```

### 샘플 데이터

`샘플 데이터/` 폴더에 테스트용 CSV 파일이 포함되어 있습니다:

- `샘플 데이터/sample_ecommerce_events_3000.csv` — 이커머스 샘플 (3,000 이벤트)
- `샘플 데이터/sample_subscription_events_3000.csv` — 구독 서비스 샘플 (3,000 이벤트)

## 배포

Vercel에 자동 배포됩니다. `main` 브랜치에 푸시하면 자동으로 빌드 및 배포가 진행됩니다.

- **플랫폼**: Vercel
- **Root Directory**: `funnel-&-retention-explorer frontend` (Vercel 대시보드에서 설정)
- **Framework**: Vite (자동 감지)
- **환경 변수**: Vercel 대시보드에서 `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_GEMINI_API_KEY` 설정

## 디자인

- 다크 테마 (`#0a0e27` 배경, `#00d4aa` 프라이머리)
- Glassmorphism 효과 (반투명 블러)
- 반응형 레이아웃 (모바일/태블릿/데스크톱)
- 아이콘 기반 사이드바 (6탭) + 툴팁

## 브라우저 호환성

Chrome (권장), Firefox, Safari, Edge

## 라이선스

이 프로젝트는 개인 및 상업적 용도로 자유롭게 사용할 수 있습니다.
