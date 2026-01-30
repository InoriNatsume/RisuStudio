# 캐릭터 카드 포맷 (.charx, .png, .jpg)

> **관련 테스트**: `tests/schema.test.ts` → `Charx Schema Validation`

---

## ⚠️ 중요: 봇 카드 PNG vs AI 이미지 PNG

> 🚨 **가장 흔한 실수**: 봇 카드 파싱과 AI 이미지 EXIF 추출을 혼동함!

| 구분 | 봇 카드 PNG | AI 이미지 PNG |
|------|-------------|---------------|
| **용도** | 캐릭터 데이터 저장 | AI 생성 이미지 |
| **PNG 청크** | `chara`, `ccv3`, `chara-ext-asset_N` | `parameters`, `Comment`, `prompt`, `workflow` |
| **파서** | `parsePng()` | `extractImageMetadata()` |
| **사용 시점** | 파일 드롭 시 | 에셋 상세 보기 시 |

**코드 위치**:
- 봇 카드 파싱: `src/lib/core/formats/charx.ts`, `png.ts`
- AI EXIF 추출: `src/lib/core/exif/` (NAI 스테가노그래피, ComfyUI 워크플로 등)

자세한 내용: [gotchas.md](gotchas.md#봇-카드-vs-ai-이미지-exif-혼동)

---

## 1. 지원 포맷

| 확장자 | 구조 | 에셋 지원 | 파서 함수 |
|--------|------|:---------:|-----------|
| `.charx` | ZIP 아카이브 | ✅ | `parseCharx()` |
| `.jpg`, `.jpeg` | JPEG + ZIP (CharX-JPEG) | ✅ | `parseJpeg()` |
| `.png` | tEXt 청크 | ✅ | `parsePng()` |

> ⚠️ **주의**: 모든 확장자에 대해 `getFileType()`과 `handleFile()`에서 처리해야 함!  
> [gotchas.md](gotchas.md#pngjpeg-확장자-처리-누락) 참조

---

## 2. CharX (.charx) 구조

### 2.1 ZIP 내부 파일

```
character.charx (ZIP)
├── card.json              # 메인 캐릭터 데이터 (CCv3)
├── card.png               # [선택] 호환용 PNG
├── module.risum           # [선택] 임베드된 모듈
└── assets/                # 에셋 파일들
    └── [type]/[itype]/
        ├── icon.png
        └── happy.webp
```

### 2.2 card.json 스키마

```typescript
interface CharXCardJson {
  spec: 'chara_card_v3';
  spec_version: '3.0';
  data: CCv3Data;
}

interface CCv3Data {
  // 기본 필드
  name: string;
  description: string;
  personality: string;
  scenario: string;
  first_mes: string;
  mes_example: string;
  
  // CCv3 에셋
  assets: CCv3Asset[];
  
  // 로어북 (character_book)
  character_book?: CharacterBook;
  
  // RisuAI 확장
  extensions?: {
    risuai?: RisuAIExtension;
  };
}
```

---

## 3. 에셋 시스템

### 3.1 CCv3Asset 구조

```typescript
interface CCv3Asset {
  type: string;    // 에셋 타입
  uri: string;     // 에셋 위치
  name: string;    // 에셋 이름
  ext: string;     // 파일 확장자
}
```

### 3.2 에셋 URI 형식

| 형식 | 설명 | 사용처 |
|------|------|--------|
| `ccdefault:` | 기본 아이콘 (스킵) | 모든 포맷 |
| `embeded://assets/...` | ZIP 내 경로 | CharX |
| `__asset:N` | tEXt 청크 인덱스 | PNG |
| `~risuasset:hash:ext` | **⚠️ 캐시 해시 참조** | CharX |

> **⚠️ 주의**: `~risuasset:`는 문서에서 누락되기 쉬움. [gotchas.md](gotchas.md#에셋-uri-형식)에서 상세 확인.

### 3.3 에셋 타입

| type | 설명 |
|------|------|
| `icon` | 프로필 아이콘 |
| `emotion` | 감정 이미지 |
| `background` | 배경 이미지 |
| `audio` | 오디오 파일 |
| `video` | 비디오 파일 |
| `portrait` | VN 초상화 |
| `additional` | 추가 에셋 |
| `other` | 기타 |
| **`x-risu-asset`** | ⚠️ **RisuAI 내부 타입** |

> **⚠️ 주의**: `asset.type === 'image'`로 이미지 판별 불가! [gotchas.md](gotchas.md#에셋-타입-판별)에서 상세 확인.

---

## 4. 로어북 구조 (character_book)

### 4.1 기본 구조

```typescript
interface CharacterBook {
  entries: LoreBookEntry[] | Record<string, LoreBookEntry>;
}

interface LoreBookEntry {
  id?: string;
  name?: string;           // 폴더용
  comment?: string;        // 엔트리용
  
  // 트리거
  keys: string[];          // 키워드
  secondary_keys?: string[];
  selective?: boolean;
  
  // 컨텐츠
  content: string;
  
  // 설정
  enabled: boolean;
  insertion_order: number;
  
  // 폴더 관련
  mode?: 'normal' | 'constant' | 'folder' | 'multiple' | 'child';
  folder?: string;         // ⚠️ 폴더 ID (특수 형식!)
}
```

### 4.2 폴더 ID 형식

> **⚠️ 중요**: [gotchas.md](gotchas.md#폴더-id-형식)에서 상세 확인

```typescript
// 폴더 엔트리
{
  mode: 'folder',
  name: '설정 폴더',
  id: '69913e3e-80d9-4010-8ee1-979a6d7c173a'
}

// 폴더에 속한 엔트리
{
  folder: '\uf000folder:69913e3e-80d9-4010-8ee1-979a6d7c173a'
  //      ↑ 특수 유니코드 prefix!
}
```

**폴더 ID 추출 방법**:
```typescript
const extractFolderId = (folder: string): string | null => {
  const match = folder.match(/folder:(.+)/);
  return match ? match[1] : null;
};
```

---

## 5. RisuAI 확장

```typescript
interface RisuAIExtension {
  // 로어북 (globalLore와 동일 구조)
  globalLore?: LoreBookEntry[];
  
  // 스크립트
  customscript?: CustomScript[];    // Regex
  triggerscript?: TriggerScript[];  // Trigger
  
  // 에셋
  additionalAssets?: [name, path, ext][];
  emotionImages?: [name, path][];
  
  // 표시
  viewScreen?: 'emotion' | 'none' | 'imggen' | 'vn';
  
  // 모듈
  modules?: string[];
}
```

---

## 6. CharX-JPEG (.jpg, .jpeg)

JPEG 이미지 뒤에 ZIP 데이터가 연결된 형식.

### 6.1 바이너리 구조

```
┌─────────────────────────────┐
│ JPEG 데이터                 │  FF D8 ... FF D9
├─────────────────────────────┤
│ ZIP 데이터 (CharX)          │  50 4B 03 04 (PK..)
│   ├── card.json             │
│   └── assets/...            │
└─────────────────────────────┘
```

### 6.2 ZIP 시작점 찾기

```typescript
function findZipStart(data: Uint8Array): number {
  for (let i = 0; i < data.length - 4; i++) {
    if (data[i] === 0x50 && data[i+1] === 0x4B && 
        data[i+2] === 0x03 && data[i+3] === 0x04) {
      return i;
    }
  }
  return -1;
}
```

---

## 7. PNG 카드 (.png)

PNG tEXt 청크에 Base64로 인코딩된 데이터.

### 7.1 청크 구조

| 키워드 | 내용 |
|--------|------|
| `chara` | CCv2/v3 JSON (Base64) |
| `ccv3` | CCv3 JSON (우선, Base64) |
| `chara-ext-asset_:N` | 에셋 바이너리 (Base64) |

> **주의**: 청크 키워드는 `chara-ext-asset_:0` 또는 `chara-ext-asset_0` 두 형태 모두 존재함

### 7.2 V2 vs V3 카드 처리

> **⚠️ 중요**: PNG 파일에는 V2(`chara`)와 V3(`ccv3`) 청크가 **동시에** 존재할 수 있음!

```typescript
// 우선순위: ccv3 > chara
if (keyword === 'ccv3' || !charaData) {
  charaData = valueBytes;
}
```

### 7.3 V2 에셋 처리 (additionalAssets)

V2 카드는 에셋을 `data.extensions.risuai.additionalAssets`에 저장:

```typescript
// V2 additionalAssets 구조
interface RisuAIExtension {
  additionalAssets?: [name: string, uri: string, fileName?: string][];
  emotions?: [name: string, uri: string][];
}
```

**V3 vs V2 에셋 위치**:
| 버전 | 에셋 메타데이터 위치 |
|------|---------------------|
| V3 | `card.data.assets[]` |
| V2 | `card.data.extensions.risuai.additionalAssets[]` |

### 7.4 에셋 확장자 추정

> **⚠️ 주의**: V3 `asset.ext` 필드가 잘못된 값일 수 있음! (RisuAI 버그)

```typescript
// 예: ext가 "fertilization_success"로 저장된 경우
{ type: 'x-risu-asset', name: 'fertilization_success', ext: 'fertilization_success' }

// 해결: Magic bytes로 실제 확장자 추정
function guessExtension(data: Uint8Array, fallbackExt: string): string {
  const validExts = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', ...]);
  if (validExts.has(fallbackExt.toLowerCase())) return fallbackExt;
  
  // Magic bytes 확인
  if (data[0] === 0x89 && data[1] === 0x50) return 'png';
  if (data[0] === 0xFF && data[1] === 0xD8) return 'jpg';
  if (data[0] === 0x52 && data[1] === 0x49 && data[8] === 0x57 && data[9] === 0x45) return 'webp';
  // ...
  return 'bin';
}
```

### 7.5 인코딩 처리

> **⚠️ 중요**: PNG tEXt 청크는 Latin1로 인코딩됨!

```typescript
// 올바른 디코딩 순서
const base64Str = new TextDecoder('latin1').decode(valueBytes);
const jsonBytes = base64ToUint8Array(base64Str);  // atob() 사용
const jsonStr = new TextDecoder('utf-8').decode(jsonBytes);  // 최종 JSON은 UTF-8
const card = JSON.parse(jsonStr);
```

### 7.6 에셋 인덱스 매핑

```json
{
  "assets": [
    { "type": "icon", "uri": "ccdefault:", "name": "", "ext": "png" },
    { "type": "emotion", "uri": "__asset:0", "name": "happy", "ext": "png" },
    { "type": "emotion", "uri": "__asset:1", "name": "sad", "ext": "webp" }
  ]
}
```

→ `chara-ext-asset_:0` = happy.png, `chara-ext-asset_:1` = sad.webp

---

## 8. 관련 테스트

```typescript
// tests/schema.test.ts

describe('Charx Schema Validation', () => {
  it('should parse lorebook entries with folder structure correctly');
  // → 폴더 ID 추출 검증

  it('should have assets with proper extension detection');
  // → 에셋 확장자 기반 타입 검증

  it('should parse additionalAssets with correct path format');
  // → 에셋 경로 형식 검증
});

describe('PNG Character Card Schema Validation', () => {
  it('should parse PNG card successfully');
  // → V2/V3 PNG 카드 파싱

  it('should normalize V2 cards to V3');
  // → V2 → V3 정규화 검증

  it('should parse embedded assets from tEXt chunks');
  // → 에셋 청크 파싱 및 확장자 추정

  it('should correctly decode UTF-8 text (한글 등)');
  // → 인코딩 문제 검증
});
```

---

## 참조

- [gotchas.md](gotchas.md) - 파싱 함정 및 해결책
- [risum.md](risum.md) - 모듈 포맷
- [CCv3 Spec](https://github.com/kwaroran/character-card-spec-v3)
