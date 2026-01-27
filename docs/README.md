# RisuStudio 문서 인덱스

> 각 포맷별 스키마 문서와 주의사항을 정리합니다.

## 📁 포맷별 문서

| 문서 | 대상 확장자 | 설명 |
|------|-------------|------|
| [charx.md](charx.md) | `.charx`, `.png`, `.jpg/.jpeg` | 캐릭터 카드 포맷 |
| [risum.md](risum.md) | `.risum` | 모듈 포맷 (로어북/Regex/Trigger) |
| [risup.md](risup.md) | `.risup`, `.risupreset` | 프리셋 포맷 (AI 설정) |
| [gotchas.md](gotchas.md) | - | 🚨 파싱 함정 및 해결책 |

## 🔥 핵심 구분점

### 봇 카드 파싱 vs AI 이미지 EXIF

> 이 둘을 혼동하면 에러 발생!

| 항목 | 봇 카드 파싱 | AI 이미지 EXIF |
|------|-------------|----------------|
| **파일** | 사용자가 드롭한 `.charx`/`.png`/`.jpg` | 에셋 폴더 내 이미지 |
| **함수** | `parseCharx()`, `parsePng()` | `extractImageMetadata()` |
| **결과** | 로어북, Regex, Trigger | 프롬프트, 모델, 시드 |

자세한 내용: [gotchas.md#봇-카드-vs-ai-이미지-exif-혼동](gotchas.md#봇-카드-vs-ai-이미지-exif-혼동)

## 🧪 테스트 연관

각 문서의 스키마는 `tests/` 폴더의 테스트로 검증됩니다:

| 테스트 파일 | 검증 대상 |
|-------------|----------|
| `tests/schema.test.ts` | 스키마 구조 검증 (폴더 ID, 에셋 타입 등) |
| `tests/parser.snapshot.test.ts` | 파싱 결과 스냅샷 |
| `tests/risum.test.ts` | 모듈 파싱/익스포트 |
| `tests/rpack.test.ts` | RPack 코덱 |
| `tests/crypto.test.ts` | 암호화/복호화 |

## 🔗 공통 유틸

모든 포맷에서 사용하는 공통 컴포넌트:

- **RPack**: RisuAI 커스텀 바이트 코덱 (`src/lib/core/rpack/`)
- **fflate**: ZIP 압축/해제
- **msgpackr**: MessagePack 인코딩
- **AES-GCM**: 프리셋 암호화
- **EXIF**: AI 이미지 메타데이터 (`src/lib/core/exif/`)

## 📋 체크리스트 (새 포맷 추가 시)

1. `docs/<format>.md` 문서 작성
2. `tests/<format>.test.ts` 테스트 작성
3. `docs/gotchas.md`에 발견된 함정 추가
4. 이 README 업데이트
