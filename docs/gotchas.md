# 파싱 함정 및 해결책 (Gotchas)

> 🚨 **필독**: 이 문서는 실제 디버깅 과정에서 발견된 함정들입니다.  
> 각 항목은 `tests/schema.test.ts`에서 검증됩니다.

---

## 목차

1. [PNG/JPEG 확장자 처리 누락](#pngjpeg-확장자-처리-누락) ⭐ NEW
2. [폴더 ID 형식](#폴더-id-형식) ⭐
3. [에셋 타입 판별](#에셋-타입-판별) ⭐
4. [에셋 URI 형식](#에셋-uri-형식)
5. [Svelte 반응성 의존성](#svelte-반응성-의존성)
6. [RPack WASM 필수](#rpack-wasm-필수)
7. [프리셋 필드 오타](#프리셋-필드-오타)

---

## PNG/JPEG 확장자 처리 누락

### 문제

`getFileType()` 함수에서 `.png`, `.jpg`, `.jpeg` 확장자를 처리하지 않았습니다:

```typescript
// ❌ 잘못된 코드 - png/jpeg 누락
function getFileType(name: string): 'charx' | 'risum' | 'risup' | '' {
  switch (ext) {
    case 'charx': return 'charx';
    case 'risum': return 'risum';
    // png, jpg, jpeg 없음!
    default: return '';
  }
}
```

### 결과

- `Unsupported file type:` 에러 발생
- 문서에서 PNG/JPEG 지원을 명시해놓고 실제로 구현 안 함

### 해결책

```typescript
// ✅ 수정된 코드
function getFileType(name: string): 'charx' | 'risum' | 'risup' | 'png' | 'jpeg' | '' {
  switch (ext) {
    case 'charx': return 'charx';
    case 'png': return 'png';
    case 'jpg':
    case 'jpeg': return 'jpeg';
    case 'risum': return 'risum';
    case 'risup':
    case 'risupreset': return 'risup';
    default: return '';
  }
}
```

그리고 `handleFile()`에서 케이스 추가:

```typescript
case 'png':
  const pngResult = await parsePng(data);
  fileData = transformCharxData(pngResult);
  break;
case 'jpeg':
  const jpegResult = await parseJpeg(data);
  fileData = transformCharxData(jpegResult);
  break;
```

### 교훈

**문서 작성 후 반드시 실제 기능 테스트**

---

## 폴더 ID 형식

> **테스트**: `tests/schema.test.ts` → `should parse lorebook entries with folder structure correctly`

### 문제

로어북 엔트리의 `folder` 필드가 단순 UUID가 아닙니다:

```typescript
// ❌ 잘못된 가정
entry.folder === '69913e3e-80d9-4010-8ee1-979a6d7c173a'

// ✅ 실제 데이터
entry.folder === '\uf000folder:69913e3e-80d9-4010-8ee1-979a6d7c173a'
//               ↑ 특수 유니코드 prefix!
```

### 왜 이렇게 되어 있나?

RisuAI 내부에서 폴더 참조를 구분하기 위한 마커입니다:
- `\uf000` (U+F000): 사설 사용 영역 문자
- `folder:`: 폴더 타입 식별자

### 해결책

```typescript
const extractFolderId = (folder: string): string | null => {
  if (!folder) return null;
  const match = folder.match(/folder:(.+)/);
  return match ? match[1] : null;
};

// 사용
const parentId = extractFolderId(entry.folder);
if (parentId && folderMap.has(parentId)) {
  // 폴더에 속함
}
```

### 폴더 엔트리 구조

```typescript
// 폴더 자체
{
  mode: 'folder',
  name: '설정 폴더',           // 또는 comment
  id: '69913e3e-...',          // 폴더 ID
}

// 폴더에 속한 엔트리
{
  mode: 'normal',
  comment: '엔트리 이름',
  folder: '\uf000folder:69913e3e-...',  // 부모 폴더 참조
}
```

---

## 에셋 타입 판별

> **테스트**: `tests/schema.test.ts` → `should have assets with proper extension detection`

### 문제

에셋의 `type` 필드로 이미지 여부를 판별할 수 없습니다:

```typescript
// ❌ 잘못된 코드
const isImage = asset.type === 'image';  // 항상 false!

// ✅ 실제 데이터
asset.type === 'x-risu-asset'  // 또는 'icon', 'emotion' 등
```

### 왜 이렇게 되어 있나?

`type` 필드는 에셋의 **용도**를 나타내지, 파일 형식을 나타내지 않습니다:
- `icon`: 프로필 아이콘
- `emotion`: 감정 이미지
- `x-risu-asset`: RisuAI 내부 에셋

### 해결책

**확장자로 판별**:

```typescript
const IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'avif', 'bmp'];
const AUDIO_EXTENSIONS = ['mp3', 'wav', 'ogg', 'm4a', 'flac'];
const VIDEO_EXTENSIONS = ['mp4', 'webm', 'mov'];

function getAssetMediaType(asset: { ext?: string; name?: string }): 'image' | 'audio' | 'video' | 'other' {
  const ext = (asset.ext || asset.name?.split('.').pop() || '').toLowerCase();
  
  if (IMAGE_EXTENSIONS.includes(ext)) return 'image';
  if (AUDIO_EXTENSIONS.includes(ext)) return 'audio';
  if (VIDEO_EXTENSIONS.includes(ext)) return 'video';
  return 'other';
}
```

### 매직 바이트 검증 (선택)

```typescript
function isImageByMagicBytes(data: Uint8Array): boolean {
  if (data.length < 4) return false;
  
  const isPng = data[0] === 0x89 && data[1] === 0x50;  // 89 50 4E 47
  const isJpeg = data[0] === 0xFF && data[1] === 0xD8; // FF D8 FF
  const isWebp = data[0] === 0x52 && data[1] === 0x49; // RIFF
  const isGif = data[0] === 0x47 && data[1] === 0x49;  // GIF8
  
  return isPng || isJpeg || isWebp || isGif;
}
```

---

## 에셋 URI 형식

> **테스트**: `tests/schema.test.ts` → `should parse additionalAssets with correct path format`

### 지원해야 하는 형식

| 형식 | 설명 | 예시 |
|------|------|------|
| `ccdefault:` | 기본값 (스킵) | - |
| `embeded://` | ZIP 내 경로 | `embeded://assets/icon/image/icon.png` |
| `__asset:N` | PNG 청크 인덱스 | `__asset:0`, `__asset:42` |
| `~risuasset:hash:ext` | **캐시 해시 참조** | `~risuasset:abc123:png` |
| 외부 URL | 직접 URL | `https://example.com/img.png` |

### ~risuasset 처리

```typescript
function resolveAssetPath(uri: string, assetMap: Map<string, Uint8Array>): Uint8Array | null {
  if (uri.startsWith('ccdefault:')) return null;
  
  if (uri.startsWith('embeded://')) {
    const path = uri.replace('embeded://', '');
    return assetMap.get(path) || null;
  }
  
  if (uri.startsWith('__asset:')) {
    const index = uri.replace('__asset:', '');
    return assetMap.get(`__asset/${index}`) || null;
  }
  
  // ⚠️ 이 형식을 놓치기 쉬움!
  if (uri.startsWith('~risuasset:')) {
    // hash와 ext 추출
    const parts = uri.replace('~risuasset:', '').split(':');
    const hash = parts[0];
    // 해시로 에셋 맵에서 찾기
    return assetMap.get(hash) || null;
  }
  
  return null;
}
```

---

## Svelte 반응성 의존성

> **관련 파일**: `src/routes/+page.svelte` 등의 Svelte 컴포넌트

### 문제

Svelte의 `$:` 반응 블록에서 **명시적으로 참조**되지 않은 변수는 추적되지 않습니다:

```typescript
// ❌ 문제 코드
$: if (regexList) {
  // displayMode나 selectedIndex가 변경되어도 이 블록이 재실행되지 않음!
  filteredContent = displayMode === 'single' 
    ? [regexList[selectedIndex]] 
    : regexList;
}
```

### 해결책

**명시적 변수 참조**:

```typescript
// ✅ 해결 코드
$: {
  const _mode = displayMode;      // 명시적 의존성
  const _idx = selectedIndex;     // 명시적 의존성
  
  if (regexList) {
    filteredContent = _mode === 'single' 
      ? [regexList[_idx]] 
      : regexList;
  }
}
```

### 왜 이렇게 동작하나?

Svelte 컴파일러는 `$:` 블록의 **최상위 스코프**에서 참조되는 변수만 추적합니다:
- `if` 조건문 안의 참조는 추적되지 않을 수 있음
- 함수 호출 안의 참조도 마찬가지

---

## RPack WASM 필수

> **테스트**: `tests/rpack.test.ts`

### 문제

단순 256바이트 룩업 테이블로 RPack을 구현하면 **일부 파일에서 실패**합니다.

### 해결책

RisuAI 공식 WASM 모듈을 사용해야 합니다:

```typescript
// ✅ 올바른 방법
import { decode, encode } from '../rpack/rpack';

const decoded = await decode(rpackData);
```

### WASM 파일 위치

- 원본: `Risuai-*/src/ts/rpack/rpack_bg.wasm`
- 복사 위치: `src/lib/core/rpack/rpack_bg.wasm`

---

## 프리셋 필드 오타

> **관련 파일**: `.risup`, `.risupreset`

### 알려진 오타

| 실제 필드명 | 예상 필드명 | 설명 |
|-------------|-------------|------|
| `PresensePenalty` | `PresencePenalty` | 존재 패널티 |

### 코드에서 주의

```typescript
// ⚠️ 오타 그대로 사용해야 함!
const penalty = preset.PresensePenalty;  // PresencePenalty 아님!
```

---

## 체크리스트 (새 파서 구현 시)

| 항목 | 확인 |
|------|:----:|
| 폴더 ID에서 `\uf000folder:` prefix 처리 | ☐ |
| 에셋 타입을 확장자로 판별 | ☐ |
| `~risuasset:` URI 형식 지원 | ☐ |
| RPack WASM 사용 | ☐ |
| Svelte $: 블록에서 명시적 의존성 | ☐ |
| `PresensePenalty` 오타 처리 | ☐ |

---

## 테스트 연동

이 문서의 모든 함정은 다음 테스트에서 검증됩니다:

```bash
pnpm test -- tests/schema.test.ts
```

### 테스트 파일 구조

```
tests/
├── schema.test.ts        # 스키마 구조 검증 (이 문서의 모든 항목)
├── parser.snapshot.test.ts  # 파싱 결과 스냅샷
├── risum.test.ts         # 모듈 파싱/익스포트
├── rpack.test.ts         # RPack 코덱
└── crypto.test.ts        # 암호화/복호화
```

---

## 문서 업데이트 시

새로운 함정을 발견하면:

1. 이 문서에 섹션 추가
2. `tests/schema.test.ts`에 테스트 케이스 추가
3. 관련 포맷 문서 (charx.md, risum.md, risup.md)에 경고 추가
