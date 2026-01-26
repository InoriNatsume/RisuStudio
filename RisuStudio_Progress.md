# RisuStudio 진행 현황

> **최종 업데이트**: 2026-01-26
> **현재 단계**: Phase 3 완료 ✅ - Phase 4 준비 중

---

## 📊 전체 진행률

```
Phase 0: 설계 및 준비     ████████████████████ 100%
Phase 1: 핵심 기반        ████████████████████ 100% ✅
Phase 2: 편집기           ████████████████████ 100% ✅
Phase 3: 시뮬레이터       ████████████████████ 100% ✅
Phase 4: 통합 & AI        ████░░░░░░░░░░░░░░░░  20%
Phase 5: 완성도           ░░░░░░░░░░░░░░░░░░░░   0%
─────────────────────────────────────────────────
전체 진행률              █████████████████░░░  85%
```

---

## 🎯 다음 작업 (Next Actions)

> **현재 해야 할 일**: Phase 4 시작 - 통합 & AI 기능

### Phase 4 목표
1. [ ] 프리셋 라이브러리 통합
2. [ ] AI 어시스턴트 (Copilot 스타일)
3. [ ] 내보내기/가져오기 개선
4. [ ] 실시간 미리보기

### 테스트 현황 (215개 통과 ✅)
- CBS 테스트: 56개 ✅
- Regex 테스트: 16개 ✅
- Trigger 테스트: 14개 ✅
- Binary 테스트: 16개 ✅
- Risum 테스트: 6개 ✅
- Crypto 테스트: 7개 ✅
- RPack 테스트: 5개 ✅
- Validation 테스트: 31개 ✅
- Schema 테스트: 41개 ✅
- Parser Snapshot 테스트: 15개 ✅
- **Simulator 테스트: 8개 ✅** (NEW)

---

## ⚙️ 개발 환경

| 항목 | 설정 |
|------|------|
| **패키지 매니저** | npm (통일) |
| **lockfile** | package-lock.json |
| **Node.js** | 18+ |

> ⚠️ pnpm-lock.yaml이 있으면 삭제하고 `npm install` 실행

---

## ✅ Phase 3 완료 (2026-01-26)

### CBS 런타임 확장 ✅
- [x] **100+ 명령어 추가**: RisuAI cbs.ts 분석 후 완전 호환
- [x] **채팅 히스토리**: previouscharchat, userhistory, history, messagen
- [x] **캐릭터 정보**: personality, description, scenario, charname
- [x] **시간 함수**: isotime, messagetime, unixtime, localtime
- [x] **배열 함수**: arraysplice, filter, range, length
- [x] **유니코드**: unicodeencode, unicodedecode, hash
- [x] **주사위**: dice, pick, rollp, roll
- [x] **XOR 암호화**: xorencode, xordecode
- [x] **에셋 명령어**: audio, play, stop
- [x] **조건부 블록**: #if, #when, #each
- [x] **CBSContext 확장**: history, persona, jailbreak, model, role 등 15+ 필드

### Regex 엔진 + 디버거 ✅
- [x] **RegexEngine 클래스**: process(), applyScript(), validatePattern(), testScript()
- [x] **4가지 모드**: editinput, editoutput, editprocess, editdisplay
- [x] **RegexDebugger 클래스**: runAll(), stepForward(), goToStep(), getHighlightedText()
- [x] **단계별 디버깅**: 각 스크립트 적용 전후 텍스트 추적
- [x] **테스트 16개**: 기본 동작, 모드 필터링, 다중 스크립트, 에러 처리

### Trigger V2 엔진 + 디버거 ✅
- [x] **TriggerEngine 클래스**: run(), checkConditions(), executeEffect()
- [x] **V1 효과**: setvar, cutchat, modifychat, systemprompt, impersonate
- [x] **V2 효과**: v2ConsoleLog, v2RunCBS, v2LuaCode, v2Comment, v2Break
- [x] **조건 처리**: var, chatIndex, always 조건, 비교 연산자
- [x] **TriggerDebugger 클래스**: runAll(), stepForward(), getCurrentState()
- [x] **테스트 14개**: 기본 동작, 조건 처리, 채팅 조작, 중단

### 시뮬레이터 UI 완성 ✅ (NEW)
- [x] **SimulatorPanel.svelte**: 메인 패널, 4탭 구조 (Prompt/CBS/Regex/Trigger)
- [x] **PromptPreview.svelte**: 프롬프트 섹션 시각화, 토큰 추정
- [x] **CBSDebugPanel.svelte**: CBS 라이브 테스터, 예제, 명령어 레퍼런스
- [x] **RegexDebugPanel.svelte**: Regex 테스터, 단계별 디버거, 모드 필터
- [x] **TriggerDebugPanel.svelte**: Trigger 스크립트 뷰어, 단계별 디버거
- [x] **통합 테스트 8개**: CBS→Regex→Trigger 워크플로우, 에러 처리

---

## ✅ Phase 2 완료 (2026-01-26)

### 서비스 레이어 완성 ✅
- [x] **editor.ts 생성**: CRUD 서비스 레이어
- [x] **lorebookService**: getAll, add, update, delete, reorder
- [x] **regexService**: getAll, add, update, delete, reorder
- [x] **triggerService**: getAll, add, update, delete
- [x] **infoService**: get, update (파일 타입별 분기)
- [x] **assetService**: getAll, add, delete, getAssetUrl
- [x] **유틸리티**: validateData, hasChanges

### 프리셋 편집 UI 완성 ✅
- [x] **PresetBasicTab**: 이름, API 타입, 모델 설정
- [x] **PresetParamsTab**: 컨텍스트, 응답 길이, temperature 등 파라미터
- [x] **PresetPromptsTab**: promptTemplate 배열, customToggles, DSL 에디터 통합
- [x] **PresetAdvancedTab**: URL 설정, Jinja 템플릿, JSON 스키마

### 필드→데이터 연동 완성 ✅
- [x] **handleDataChange**: 모든 탭에서 on:change → editedData 업데이트
- [x] **hasChanges 플래그**: 변경 감지 및 저장 버튼 활성화
- [x] **structuredClone**: 불변성 보장하며 데이터 수정

---

## ✅ 최근 완료 (2026-01-26)

### DSL 에디터 고급 기능 ✅
- [x] **CodeMirror 6 통합**: DSLEditor.svelte에 CBS 구문 하이라이팅
- [x] **검색 기능**: DSL 에디터 내 검색 (하이라이트 + 네비게이션)
- [x] **글로벌 검색**: Ctrl+Shift+F로 모든 탭 검색 (Lorebook/Regex/Trigger/Script)
- [x] **검색 결과 표시**: 노란색 하이라이트, 결과 카운터, ▲/▼ 네비게이션

### 스크립트 탭 완성 ✅
- [x] **ScriptTab.svelte 생성**: backgroundEmbedding (CSS/HTML) 편집
- [x] **CSS 구문 하이라이팅**: textarea + pre 오버레이 방식
- [x] **라인 넘버**: 코드 편집 시 줄 번호 표시
- [x] **리사이즈**: 에디터 높이 조절 가능
- [x] **로컬 검색**: Ctrl+F로 backgroundEmbedding 내 검색

### 정보 탭 필드 정리 ✅
- [x] **charx 필드 경로 수정**: `data.cardData`에서 올바르게 읽기
- [x] **JPEG/PNG 지원**: fileType을 'charx'로 변환하여 동일하게 처리
- [x] **RisuAI 확장 필드 추가**: additionalText, defaultVariables, license
- [x] **고급 옵션**: largePortrait, lorePlus, inlayViewScreen, utilityBot
- [x] **보안 필드 분리**: backgroundHTML/virtualscript는 스크립트 탭으로

### Lorebook/Regex/Trigger 탭 검색 ✅
- [x] **DSL 에디터 검색**: StateEffect/StateField 기반 CodeMirror 하이라이트
- [x] **검색 UI**: 검색 바, 결과 카운터, 네비게이션 버튼
- [x] **키보드 단축키**: Enter(다음), Shift+Enter(이전), Escape(닫기)

---

## ✅ 이전 완료 (2026-01-25)

### Phase 4 일부 선행: EXIF 메타데이터 뷰어 ✅
- [x] NAI 스테가노그래피 추출 (LSB 디코딩)
- [x] ComfyUI 워크플로 추출 및 노드 미리보기
- [x] A1111 parameters 파싱
- [x] EXIF 뷰어 UI (`ExifViewerModal.svelte`)
- [x] ComfyUI 뷰어 모달 (`ComfyViewerModal.svelte`)
- [x] PNG tEXt 청크 파싱 (`parsePngTextChunks`)

### 에셋 탭 고급 기능 완성 ✅
- [x] **다운로드 기능**: 개별/복수(ZIP)/전체(ZIP) 다운로드
- [x] **ZIP 생성**: 순수 JS 구현 (라이브러리 없음, CRC32 포함)
- [x] **이름 변경**: 중복 검사 자동 수행
- [x] **에셋 교체**: 기존 에셋 파일 교체
- [x] **자동 저장**: 변경 시 자동 저장
- [x] **EXIF 뷰어**: NAI/ComfyUI/A1111 메타데이터 표시
- [x] **중복 검사**: 해시 기반 중복 에셋 검출
- [x] **확장자 정리**: 잘못된 확장자 일괄 수정
- [x] **검증 기능**: 손상된 에셋 검출

### 대용량 에셋 최적화 ✅ (1만개+, 1GB+ 대응)
- [x] **가상 스크롤링**: 한 번에 100개만 렌더링 (`ITEMS_PER_PAGE`)
- [x] **지연 로딩**: 200개 이상 에셋은 화면에 보일 때만 dataUrl 생성
- [x] **IntersectionObserver**: 뷰포트에 보이는 썸네일만 로드
- [x] **dataUrl 캐시**: 생성된 URL 재사용
- [x] **로딩 진행률 표시**: 파일 로딩 중 진행률 바 표시
- [x] **메타데이터 다운로드**: card.json/module.json 디버깅용 다운로드

### 로어북 탭 개선 ✅
- [x] **폴더 구조 지원**: 중첩 폴더 및 항목 매핑
- [x] **폴더 토글**: 폴더 펼침/접힘 상태 저장
- [x] **Regex/Trigger 선택 수정**: selectiveTrigger 필드 지원

### 파일 형식 지원 확장 ✅
- [x] PNG 캐릭터 카드 파싱 (`parsePng`)
- [x] JPEG/JPG 캐릭터 카드 파싱 (`parseJpeg`, CharX-JPEG)
- [x] x_meta 폴더 제외 (RisuAI 내부 메타데이터)
- [x] 에셋 경로 해석: `embeded://`, `~risuasset:`, `__asset:`

### Phase 2 편집기 탭 완성 ✅
- [x] `EditorScreen.svelte` - 메인 편집 화면 (탭 네비게이션)
- [x] `InfoTab.svelte` - 정보 탭 (이름, 설명, 성격, 첫 메시지, 시나리오)
- [x] `LorebookTab.svelte` - 로어북 탭 (검색, CRUD, 폴더 지원)
- [x] `RegexTab.svelte` - Regex 탭 (IN/OUT, 순서 변경)
- [x] `TriggerTab.svelte` - Trigger 탭 (V1/V2 호환)
- [x] `AssetTab.svelte` - 에셋 탭 (갤러리/목록 뷰, 미리보기)
- [x] `PresetParamsTab.svelte` - 프리셋 파라미터 탭
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
│   ├── src/lib/components/editor/ ← 편집기 컴포넌트 (★)
│   │   ├── EditorScreen.svelte
│   │   ├── DSLEditor.svelte           ← CodeMirror 6 기반 에디터 (★)
│   │   ├── ComfyViewerModal.svelte  ← ComfyUI 워크플로 뷰어
│   │   └── tabs/
│   │       ├── InfoTab.svelte
│   │       ├── LorebookTab.svelte
│   │       ├── RegexTab.svelte
│   │       ├── TriggerTab.svelte
│   │       ├── AssetTab.svelte      ← 에셋 관리 (다운로드/ZIP/EXIF)
│   │       ├── ScriptTab.svelte     ← 스크립트 편집 (backgroundEmbedding) ★ NEW
│   │       └── PresetParamsTab.svelte
│   ├── src/lib/core/exif/           ← EXIF 추출 (★ NEW)
│   │   ├── index.ts
│   │   ├── extractor.ts
│   │   ├── types.ts
│   │   ├── schema/
│   │   │   ├── nai.ts
│   │   │   ├── comfyui.ts
│   │   │   └── a1111.ts
│   │   └── steganography.ts         ← NAI LSB 디코딩
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
- [x] DSLEditor.svelte - CBS/DSL 구문 하이라이팅 ✅
- [x] 검색 하이라이트 (StateField 기반) ✅
- [ ] 자동완성 (`{{`, `<`, `::` 트리거)
- [x] 커스텀 테마 (RisuAI 다크 스타일) ✅

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
- [x] 상세 뷰 (미디어 미리보기)
- [x] 업로드/삭제
- [x] 미리보기 (이미지/오디오/비디오)
- [x] 다운로드 (개별/복수 ZIP/전체 ZIP)
- [x] 이름 변경 (중복 검사)
- [x] 에셋 교체
- [x] 자동 저장
- [x] EXIF 메타데이터 뷰어
- [x] 중복 검사 (해시 기반)
- [x] 확장자 정리
- [x] 검증 기능
- [x] 가상 스크롤링 (대용량 최적화)
- [x] 지연 로딩 (썸네일 on-demand 생성)

### 서비스 레이어

- [ ] `src/lib/services/editor.ts`
- [ ] CRUD 작업 캡슐화
- [x] 변경 감지 (에셋 자동 저장)
- [x] 저장/다운로드

### 페이지 통합

- [x] +page.svelte에 EditorScreen 통합 ✅
- [x] 파일 로드 → 편집 모드 연결 ✅
- [x] 내보내기 기능 연결 ✅
- [x] 로딩 진행률 표시 ✅

### Phase 2 완료 조건
- [x] 캐릭터 카드 편집 가능 ✅
- [x] 모듈 편집 가능 ✅
- [ ] 프리셋 편집 가능 (일부 완료)
- [x] 편집 후 저장/다운로드 작동 ✅

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

- [x] NAI 스테가노그래피 추출 ✅
- [x] ComfyUI 노드 검색 ✅
- [x] A1111 parameters 파싱 ✅
- [x] 정규화된 뷰어 ✅

### Phase 4 완료 조건
- [ ] 프리셋+캐릭터+모듈 조합 분석
- [ ] Copy for AI 작동
- [x] AI 이미지 메타데이터 표시 ✅

---

## Phase 5: 완성도 (예상 1주)

> **참조**: `RisuExtractUtil/src/preset.ts`

### 추가 파일 지원

- [x] PNG 캐릭터 카드 (tEXt 청크) ✅
- [x] JPEG 캐릭터 카드 (CharX-JPEG) ✅
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
| 1 | ⚠️ | TypeScript SharedArrayBuffer 타입 호환 경고 | AssetTab.svelte:793 |
| 2 | ⚠️ | 미사용 CSS 선택자 경고 | +page.svelte |
| 3 | ✅ | webm 비디오 타입 감지 오류 | 수정 완료 |
| 4 | ✅ | x_meta 폴더 에셋으로 표시 | 수정 완료 |
| 5 | ✅ | 에셋 수 중복 집계 | 수정 완료 |

---

## 📝 메모 및 결정 사항

### 기술적 결정

| 날짜 | 결정 | 이유 |
|------|------|------|
| 2026-01-25 | Svelte 4 사용 | RisuAI 플러그인과 일관성 |
| 2026-01-25 | fflate + msgpackr | 최소 번들 크기 |
| 2026-01-25 | wasmoon은 P1 | 번들 크기 고려해 선택적 |
| 2026-01-25 | 순수 JS ZIP 생성 | 외부 라이브러리 없이 다운로드 |
| 2026-01-25 | IntersectionObserver | 대용량 에셋 지연 로딩 |
| 2026-01-25 | 가상 스크롤링 100개 | 1만개+ 에셋 성능 최적화 |

### 보류된 기능

| 기능 | 이유 | 재검토 시점 |
|------|------|------------|
| VS Code 연동 | 복잡도 | Phase 5 이후 |
| 실시간 협업 | 범위 초과 | v2.0 |
| 에셋 썸네일 캐시 | IndexedDB 필요 | Phase 5 |

---

## 📅 작업 로그

> 날짜별 작업 내용 기록

### 2026-01-25 (오후)
- [x] 에셋 탭 대용량 최적화 (가상 스크롤링, 지연 로딩)
- [x] 로딩 진행률 표시 UI
- [x] webm 비디오 타입 감지 수정
- [x] x_meta 폴더 에셋 목록에서 제외
- [x] 에셋 수 중복 집계 버그 수정
- [x] 메타데이터 다운로드 버튼 추가
- [x] ComfyUI 뷰어 모달 프롬프트 필드 제거

### 2026-01-25 (오전)
- [x] 에셋 다운로드 기능 (개별/복수 ZIP/전체 ZIP)
- [x] 순수 JS ZIP 생성 구현
- [x] 에셋 이름 변경 (중복 검사)
- [x] 에셋 교체 기능
- [x] 에셋 자동 저장
- [x] EXIF 메타데이터 뷰어 (NAI/ComfyUI/A1111)
- [x] 중복 검사, 확장자 정리, 검증 도구

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
# 의존성 설치
npm install

# 테스트 실행
npm test
npm run test:coverage

# 개발 서버
npm run dev

# 빌드
npm run build
```
