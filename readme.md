# RisuStudio

RisuAI 캐릭터 카드(.charx), 모듈(.risum), 프리셋(.risup)을 위한 **통합 개발 및 테스트 환경**.

## 🎯 목표

RisuAI 없이도 캐릭터 카드, 모듈, 프리셋을 개발하고 테스트할 수 있는 IDE.

## ✨ 주요 기능

### 지원되는 기능 ✅
- **파일 파싱**: .charx, .risum, .risup 완전 지원
- **에셋 관리**: 갤러리/목록 보기, 썸네일 미리보기 (Blob URL, Magic Bytes 감지)
- **로어북 편집**: DSL 에디터, 폴더 구조 지원
- **Regex 편집**: DSL 에디터, 타입 필터링 (IN/OUT/DSP/PRC/TRS)
- **Trigger 편집**: DSL 에디터, 타입 필터링 (시작/출력/입력/수동/항상)
- **CBS 하이라이트**: CodeMirror 6 기반, 중첩 `{{...}}` 레인보우 컬러
- **모듈 정보**: 기본 정보, 파라미터, 고급 설정 (backgroundEmbedding 포함)

### 지원 예정 기능 📋
- **CBS 시뮬레이터**: 변수 치환 테스트
- **Regex 테스터**: 정규식 매칭 미리보기
- **Trigger 시뮬레이터**: 조건/효과 실행 테스트
- **프리셋 통합 테스트**: 프리셋+캐릭터+모듈 조합 분석
- **PNG 카드 지원**: EXIF 메타데이터 추출

## 📁 프로젝트 구조

```
├── RisuStudio_Specification.md    # 설계 문서
├── RisuStudio_Progress.md         # 진행 현황
├── RisuAI_Format_Specification.md # 파일 포맷 사양서
├── risustudio/                    # 프로젝트 소스 코드
│   ├── src/                       # SvelteKit 앱
│   ├── scripts/                   # CLI 도구 (extract.ts)
│   └── tests/                     # 테스트
└── reference/                     # 참조 문서 (gitignore)
```

## 🚀 빠른 시작

```bash
cd risustudio
npm install
npm run dev
```

### Extract CLI 사용법

```bash
cd risustudio
npm run extract -- "../test_bot.charx"
npm run extract -- "../test_bot.risum"
npm run extract -- "../test_bot.risup"
```

## 📊 진행 상황

```
Phase 0: 설계 및 준비     ████████████████████ 100%
Phase 1: 핵심 기반        ████████████████████ 100%
Phase 2: 편집기           ████████████████░░░░  80%
  ├─ 로어북 편집 (폴더 지원)      ✅
  ├─ Regex 편집 (타입 필터링)    ✅
  ├─ Trigger 편집                 ✅
  ├─ CBS 하이라이팅               ✅
  └─ charx 파싱 (lorebook/regex)  ✅
Phase 3: 시뮬레이터       ░░░░░░░░░░░░░░░░░░░░   0%
Phase 4: 통합 & AI        ░░░░░░░░░░░░░░░░░░░░   0%
Phase 5: 완성도           ░░░░░░░░░░░░░░░░░░░░   0%
```

자세한 진행 상황은 [RisuStudio_Progress.md](RisuStudio_Progress.md) 참조.

## 📚 문서

| 문서 | 설명 |
|------|------|
| [RisuStudio_Specification.md](RisuStudio_Specification.md) | 설계 문서 |
| [RisuStudio_Progress.md](RisuStudio_Progress.md) | 진행 현황 |
| [RisuAI_Format_Specification.md](RisuAI_Format_Specification.md) | 파일 포맷 사양서 |

## 🛠️ 기술 스택

- **프레임워크**: Svelte 4 + TypeScript + SvelteKit
- **빌드 도구**: Vite
- **배포**: GitHub Pages
- **파일 처리**: fflate, msgpackr, RPack WASM

## 📜 크레딧

- **RisuAI** (GPL 3.0 License)
https://github.com/kwaroran/RisuAI
- **챈산 자료**: 
모듈 매니저, 에셋의 신, 정리의 신, 프리셋 매니저, 슈파봇, CBS 에디터
https://arca.live/b/characterai/156605199
- **참조 프로젝트**:
  - https://github.com/snuff8729/RisuExtractUtil
  - https://github.com/noelkim12/risu-resource-manager/
  - https://github.com/MetaMyong/RisuAI-Interface-Generation

## 📄 라이선스

GPL 3.0 (RisuAI와 동일)
