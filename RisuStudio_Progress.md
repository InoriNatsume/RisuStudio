# RisuStudio 진행 현황

> **최종 업데이트**: 2026-01-25
> **현재 단계**: Phase 2 (편집기 UI 개발 - 탭 컴포넌트 완성)

---

## 📊 전체 진행률

```
Phase 0: 설계 및 준비     ████████████████████ 100%
Phase 1: 핵심 기반        ████████████████████ 100% ✅
Phase 2: 편집기           ██████░░░░░░░░░░░░░░  30%
Phase 3: 시뮬레이터       ░░░░░░░░░░░░░░░░░░░░   0%
Phase 4: 통합 & AI        ░░░░░░░░░░░░░░░░░░░░   0%
Phase 5: 완성도           ░░░░░░░░░░░░░░░░░░░░   0%
─────────────────────────────────────────────────
전체 진행률              ██████████░░░░░░░░░░  46%
```

---

## 🎯 다음 작업 (Next Actions)

> **현재 해야 할 일**: Phase 2 - 편집기 페이지 통합

### Phase 2 진행 상황
1. [x] CodeMirror 6 의존성 추가 (package.json)
2. [x] EditorScreen.svelte 메인 컴포넌트 ✅
3. [x] 탭 UI 구조 (정보/로어북/Regex/Trigger/에셋) ✅
4. [x] 모든 탭 컴포넌트 완성 ✅

### 다음 목표
1. [ ] `npm install` 실행 (CodeMirror 6 설치)
2. [ ] +page.svelte에 EditorScreen 통합
3. [ ] 파일 로드 → 편집 모드 연결
4. [ ] CBS용 CodeMirror 하이라이트

### 테스트 현황 (105개 통과)
- CBS 테스트: 56개 ✅
- Binary 테스트: 16개 ✅
- Risum 테스트: 6개 ✅
- Crypto 테스트: 7개 ✅
- RPack 테스트: 5개 ✅
- Parser Snapshot 테스트: 15개 ✅

---

## ⚙️ 개발 환경

| 항목 | 설정 |
|------|------|
| **패키지 매니저** | npm (통일) |
| **lockfile** | package-lock.json |
| **Node.js** | 18+ |

> ⚠️ pnpm-lock.yaml이 있으면 삭제하고 `npm install` 실행

---

## ✅ 최근 완료 (2026-01-25)

### Phase 2 편집기 탭 완성 ✅
- [x] `EditorScreen.svelte` - 메인 편집 화면 (탭 네비게이션)
- [x] `InfoTab.svelte` - 정보 탭 (이름, 설명, 성격, 첫 메시지, 시나리오)
- [x] `LorebookTab.svelte` - 로어북 탭 (검색, CRUD, 폴더 지원)
- [x] `RegexTab.svelte` - Regex 탭 (IN/OUT, 순서 변경)
- [x] `TriggerTab.svelte` - Trigger 탭 (V1/V2 호환)
- [x] `AssetTab.svelte` - 에셋 탭 (갤러리/목록 뷰, 미리보기)
- [x] `+page.svelte` EditorScreen 통합 (드롭 → 파싱 → 편집 모드)
- [x] 다운로드 기능 구현 (exportCharx/Risum/Risup)

### Extract CLI 완성
- [x] `scripts/extract.ts` - 모든 파일 포맷 추출 CLI
  - [x] .charx 파싱 (ZIP, embeded:// URI)
  - [x] .jpg/.jpeg 파싱 (CharX-JPEG)
  - [x] .png 파싱 (tEXt 청크, __asset:N URI)
  - [x] .risum 파싱 (RPack WASM)
  - [x] .risup/.risupreset 파싱 (AES-GCM)
  - [x] 중복 이름 에셋 처리 (`{{숫자}}` 접미사)
  - [x] 확장자 중복 방지 (`splitNameAndExt()`)

### CBS 기초 런타임 ✅ (2026-01-25)
- [x] `src/lib/core/cbs/types.ts` - CBS 타입 정의
- [x] `src/lib/core/cbs/parser.ts` - CBS 파서 (AST 변환)
- [x] `src/lib/core/cbs/commands.ts` - 내장 명령어 (60+ 명령어)
- [x] `src/lib/core/cbs/runtime.ts` - 실행 엔진
- [x] `src/lib/core/cbs/cbs.test.ts` - 단위 테스트 (56개 통과)

### 문서 정리
- [x] `RisuAI_Format_Specification.md` → 프로젝트 루트로 이동
- [x] 설계문서에서 파일 포맷 상세 제거, 사양문서 참조로 대체
- [x] charx → charactercard 명칭 변경
- [x] 체리픽 문서와 충돌 검토 완료 (충돌 없음)

---

## 📁 프로젝트 구조

```
새 폴더 (9)/
├── RisuStudio_Specification.md    ← 메인 설계 문서
├── RisuStudio_Progress.md         ← 개발 진행 현황 (이 문서)
├── RisuAI_Format_Specification.md ← 파일 포맷 사양서 (★)
├── risustudio/                    ← 프로젝트 소스 코드
│   ├── scripts/extract.ts         ← Extract CLI (완성)
│   ├── src/lib/components/editor/ ← 편집기 컴포넌트 (★ NEW)
│   │   ├── EditorScreen.svelte
│   │   └── tabs/
│   │       ├── InfoTab.svelte
│   │       ├── LorebookTab.svelte
│   │       ├── RegexTab.svelte
│   │       ├── TriggerTab.svelte
│   │       └── AssetTab.svelte
│   └── ... (개발 중)
└── reference/                     ← 참조 문서 및 코드
    └── ... (개발 완료 후 삭제 가능)
```

---

## Phase 0: 설계 및 준비 ✅ 완료

### 문서 작성
- [x] RisuStudio_Specification.md - 메인 사양서
- [x] RisuAI_Format_Specification.md - 파일 포맷 사양서 (루트로 이동)
- [x] ModuleManager_Analysis.md - UI 패턴 분석 → `reference/`로 이동
- [x] EXIF_Extraction_Comparison.md - AI 이미지 메타데이터 → `reference/`로 이동
- [x] charx_cherrypick.md - 캐릭터 카드 상세 → `reference/`로 이동
- [x] risum_cherrypick.md - .risum 형식 상세 → `reference/`로 이동
- [x] risup_cherrypick.md - .risup 형식 상세 → `reference/`로 이동

### 참조 코드 분석
- [x] module-manager-v3_2.0.6.js 분석 → `reference/`로 이동
- [x] PresetManager1.4.js 분석 → `reference/`로 이동
- [x] OrganizeGod_v3.js 분석 → `reference/`로 이동
- [x] AssetGod_v3.js 분석 → `reference/`로 이동
- [x] RisuExtractUtil 분석 → `reference/`로 이동
- [x] RisuAI 소스 분석 → `reference/Risuai-2026.1.184/`로 이동

### 설계 완료 항목
- [x] UI 와이어프레임 (4개 화면)
- [x] 아키텍처 설계 (Core/Service/UI 레이어)
- [x] 프로젝트 구조 정의
- [x] 개발 로드맵 (5 Phase)
- [x] 테스트 전략 수립
- [x] 로깅 시스템 설계
- [x] 유효성 검증 스키마 설계

---

## Phase 1: 핵심 기반 (예상 2주)

> **참조**: `RisuAI_Format_Specification.md` (프로젝트 루트)

### Core Layer - 파일 포맷

#### RPack 코덱
- [x] `src/lib/core/formats/rpack.ts` 생성
- [x] 256바이트 테이블 정의
- [x] `rpackEncode()` 구현
- [x] `rpackDecode()` 구현
- [x] 단위 테스트 작성 (`tests/rpack.test.ts`)

#### Binary Helper
- [x] `src/lib/core/formats/binary.ts` 생성
- [x] `BinaryReader` 클래스 구현
- [x] `BinaryWriter` 클래스 구현
- [x] 단위 테스트 작성 (`tests/binary.test.ts` - 16개)

#### AES-GCM 암호화
- [x] `src/lib/core/formats/crypto.ts` 생성
- [x] `encrypt()` 구현 (Web Crypto API)
- [x] `decrypt()` 구현
- [x] 키/IV 상수 정의 ('risupreset', 12-byte zeros)
- [x] 단위 테스트 작성 (`tests/crypto.test.ts`)

#### charactercard 파서 (캐릭터 카드)
- [x] `src/lib/core/formats/charx.ts` 생성
- [x] `parseCharx()` 구현 (fflate unzip)
- [x] `exportCharx()` 구현
- [x] card.json + assets 추출
- [x] 스냅샷 테스트 작성 (`tests/parser.snapshot.test.ts`)

#### risum 파서
- [x] `src/lib/core/formats/risum.ts` 생성
- [x] 매직넘버/버전 파싱
- [x] RPack 해제 → JSON
- [x] 에셋 블록 파싱
- [x] `parseRisum()` 구현
- [x] `exportRisum()` 구현
- [x] 단위 테스트 작성 (`tests/risum.test.ts`)

#### risup 파서
- [x] `src/lib/core/formats/risup.ts` 생성
- [x] 풀체인 구현: RPack → fflate → MsgPack → AES
- [x] `parseRisup()` 구현
- [x] `parseRisupreset()` 구현 (레거시)
- [x] `exportRisup()` 구현
- [x] 스냅샷 테스트 작성 (`tests/parser.snapshot.test.ts`)

### Core Layer - 타입 정의

- [x] `src/lib/core/types/character.ts` - CCv3 인터페이스
- [x] `src/lib/core/types/module.ts` - RisuModule 인터페이스
- [x] `src/lib/core/types/preset.ts` - Preset 인터페이스
- [x] `src/lib/core/types/index.ts` - 통합 export
- [x] `src/lib/core/logger.ts` - 로깅 시스템

### Core Layer - CBS 기초 ✅

- [x] `src/lib/core/cbs/types.ts` - CBS 타입 정의
- [x] `src/lib/core/cbs/parser.ts` - CBS 파서 (AST)
- [x] `src/lib/core/cbs/commands.ts` - 내장 명령어 (60+)
- [x] `src/lib/core/cbs/runtime.ts` - 실행 엔진
- [x] `src/lib/core/cbs/cbs.test.ts` - 단위 테스트 (56개)

### UI 기반

- [x] 프로젝트 생성 (Svelte + Vite + TypeScript)
- [x] 기본 레이아웃 (`src/routes/+layout.svelte`)
- [ ] 탭 네비게이션
- [x] 파일 드래그앤드롭 로더 (`src/routes/+page.svelte`)
- [x] 파일 타입 자동 감지

### 테스트 환경 ✅

- [x] Vitest 설정 (`vite.config.ts`)
- [x] 테스트 fixtures 수집 (`tests/test_file/`)
  - [x] Sae Uraguchi.charx
  - [x] test_bot.png, test_bot2.jpeg
  - [x] 테스트.risum, 🍄제논 dlc.risum 외
  - [x] 🔭 망원경.risup, 🦋PSYCHE.risup
- [x] 스냅샷 테스트 작성 (`tests/parser.snapshot.test.ts` - 15개)

### Phase 1 완료 조건 ✅
- [x] .charx 파일 로드 → JSON 트리 표시
- [x] .risum 파일 로드 → JSON 트리 표시
- [x] .risup 파일 로드 → JSON 트리 표시
- [x] 모든 파서 테스트 통과 (105개 테스트 통과)

---

## Phase 2: 편집기 (예상 2주)

> **참조**: `ModuleManager_Analysis.md`, `module-manager-v3_2.0.6.js`

### 편집 화면 구조

- [x] `EditorScreen.svelte` 메인 컴포넌트 ✅
- [x] 탭 UI (정보/로어북/Regex/Trigger/에셋) ✅
- [ ] 북마크 패널 (좌측 사이드바)

### CodeMirror 통합

- [x] CodeMirror 6 의존성 추가 (package.json) ✅
- [ ] `npm install` 실행 필요
- [ ] CBS 언어 정의 (하이라이트)
- [ ] 자동완성 (`{{`, `<`, `::` 트리거)
- [ ] 커스텀 테마 (RisuAI 스타일)

### 정보 탭

- [x] `InfoTab.svelte` ✅
- [x] 기본 정보 편집 (이름, 설명)
- [x] 성격, 시나리오, 첫 메시지
- [x] 확장 필드 (namespace, cjs 등)

### 로어북 탭

- [x] `LorebookTab.svelte` ✅
- [x] 로어북 리스트 (폴더 구조)
- [x] CRUD 기능
- [x] 검색/필터
- [x] 폴더 관리

### Regex 탭

- [x] `RegexTab.svelte` ✅
- [x] 스크립트 리스트
- [x] IN/OUT 편집기 (기본 textarea)
- [x] 타입/플래그 설정
- [x] 활성/비활성 토글
- [x] 순서 변경

### Trigger 탭

- [x] `TriggerTab.svelte` ✅
- [x] Trigger 리스트
- [x] V1/V2 구조 편집 (조건/효과)
- [x] Lua 코드 편집기 (기본 textarea)

### 에셋 탭

- [x] `AssetTab.svelte` ✅
- [x] 갤러리 뷰
- [x] 리스트 뷰
- [x] 업로드/삭제
- [x] 미리보기 (이미지/오디오/비디오)

### 서비스 레이어

- [ ] `src/lib/services/editor.ts`
- [ ] CRUD 작업 캡슐화
- [ ] 변경 감지
- [ ] 저장/다운로드

### 페이지 통합

- [ ] +page.svelte에 EditorScreen 통합
- [ ] 파일 로드 → 편집 모드 연결
- [ ] 내보내기 기능 연결

### Phase 2 완료 조건
- [ ] 캐릭터 카드 편집 가능
- [ ] 모듈 편집 가능
- [ ] 프리셋 편집 가능
- [ ] 편집 후 저장/다운로드 작동

---

## Phase 3: 시뮬레이터 (예상 3주)

> **참조**: `Risuai-2026.1.184/src/ts/process/cbs.ts`, `triggers.ts`

### CBS 런타임 확장

- [ ] RisuAI cbs.ts에서 명령어 추출
- [ ] 모든 CBS 명령어 구현
- [ ] 실행 추적 (Trace) 기능
- [ ] 에러 처리

### Regex 엔진

- [ ] `src/lib/core/regex/engine.ts`
- [ ] IN/OUT 패턴 적용
- [ ] 점진적 디버거 (캡처 그룹 표시)
- [ ] 에러 하이라이트

### Trigger 엔진

- [ ] `src/lib/core/trigger/v2Engine.ts`
- [ ] V2 조건 평가 로직
- [ ] V2 효과 실행 로직
- [ ] Lua 런타임 (wasmoon)

### 시뮬레이터 UI

- [ ] `SimulatorScreen.svelte`
- [ ] CBS 패널
- [ ] Regex 패널
- [ ] Trigger 패널
- [ ] HTML/CSS 패널
- [ ] 변수 패널 (chatVar/globalVar)
- [ ] 실행 추적 표시

### 채팅 시뮬레이터

- [ ] 가상 채팅 인터페이스
- [ ] 메시지 입력/출력
- [ ] Trigger 이벤트 발생

### Phase 3 완료 조건
- [ ] CBS 코드 실행 및 결과 표시
- [ ] Regex 테스트 및 디버깅
- [ ] Trigger 조건/효과 테스트
- [ ] 변수 실시간 조작

---

## Phase 4: 통합 & AI (예상 2주)

> **참조**: `EXIF_Extraction_Comparison.md`

### 통합 테스트 기능

- [ ] `IntegratedScreen.svelte`
- [ ] 다중 파일 로드
- [ ] Regex 체인 분석
- [ ] Trigger 체인 분석
- [ ] 충돌 감지 (중복 패턴)
- [ ] 변수 충돌 감지

### AI 헬퍼

- [ ] `src/lib/services/aiHelper.ts`
- [ ] Copy for AI 기능
- [ ] CBS 레퍼런스 자동 포함
- [ ] 컨텍스트 조합

### 에셋 메타데이터

- [ ] NAI 스테가노그래피 추출
- [ ] ComfyUI 노드 검색
- [ ] A1111 parameters 파싱
- [ ] 정규화된 뷰어

### Phase 4 완료 조건
- [ ] 프리셋+캐릭터+모듈 조합 분석
- [ ] Copy for AI 작동
- [ ] AI 이미지 메타데이터 표시

---

## Phase 5: 완성도 (예상 1주)

> **참조**: `RisuExtractUtil/src/preset.ts`

### 추가 파일 지원

- [ ] PNG 캐릭터 카드 (tEXt 청크)
- [ ] NAI 프리셋 변환 임포트
- [ ] ST 프리셋 변환 임포트

### 유효성 검증 통합

- [ ] 실시간 검증 UI
- [ ] 저장 전 검증
- [ ] 검증 결과 Copy for AI

### 설정 화면

- [ ] `SettingsScreen.svelte`
- [ ] API 키 설정
- [ ] 에디터 설정
- [ ] CBS 레퍼런스 선택

### 배포 준비

- [ ] 반응형 (모바일)
- [ ] PWA 설정
- [ ] GitHub Pages 배포
- [ ] README 작성

### Phase 5 완료 조건
- [ ] 모든 파일 포맷 지원
- [ ] 프로덕션 배포 완료
- [ ] 문서화 완료

---

## 🐛 알려진 이슈

> 개발 중 발견된 문제들을 여기에 기록

| # | 상태 | 설명 | 관련 파일 |
|---|------|------|----------|
| - | - | 아직 없음 | - |

---

## 📝 메모 및 결정 사항

### 기술적 결정

| 날짜 | 결정 | 이유 |
|------|------|------|
| 2026-01-25 | Svelte 4 사용 | RisuAI 플러그인과 일관성 |
| 2026-01-25 | fflate + msgpackr | 최소 번들 크기 |
| 2026-01-25 | wasmoon은 P1 | 번들 크기 고려해 선택적 |

### 보류된 기능

| 기능 | 이유 | 재검토 시점 |
|------|------|------------|
| VS Code 연동 | 복잡도 | Phase 5 이후 |
| 실시간 협업 | 범위 초과 | v2.0 |

---

## 📅 작업 로그

> 날짜별 작업 내용 기록

### 2026-01-25
- [x] 설계 문서 최종 정리
- [x] 테스트 및 로깅 전략 추가
- [x] OrganizeGod/AssetGod 분석
- [x] 진행 현황 문서 생성

### 2026-01-24
- [x] RisuAI_Format_Specification.md 작성
- [x] risup 처리 체인 설계
- [x] 문서 참조 가이드 추가

---

## 🔗 빠른 참조

### 핵심 문서
- [RisuStudio_Specification.md](RisuStudio_Specification.md) - 메인 사양서
- [RisuAI_Format_Specification.md](RisuAI_Format_Specification.md) - 파서 구현 코드

### 구현 순서
1. `rpack.ts` → `binary.ts` → `crypto.ts`
2. `charactercard.ts` → `risum.ts` → `risup.ts`
3. 타입 정의 → CBS 기초 → UI 기반

### 명령어
```bash
# 프로젝트 생성
pnpm create svelte@latest risustudio

# 의존성 설치
pnpm add fflate msgpackr
pnpm add -D vitest @vitest/coverage-v8

# 테스트 실행
pnpm test
pnpm test:coverage

# 개발 서버
pnpm dev

# 빌드
pnpm build
```
