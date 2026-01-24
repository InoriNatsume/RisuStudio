# CharX & PNG & JPEG 포맷 스키마

> **버전**: 1.0.0  
> **최종 업데이트**: 2026-01-25  
> **소스**: RisuAI `src/ts/parser.ts`, 레퍼런스 스크립트

이 문서는 캐릭터 카드 파일 포맷을 설명합니다.

---

## 목차

1. [CharX (.charx)](#1-charx-charx)
2. [PNG (.png)](#2-png-png)
3. [JPEG (.jpg, .jpeg)](#3-jpeg-jpg-jpeg)
4. [CCv3 호환성](#4-ccv3-호환성)

---

## 1. CharX (.charx)

CharX는 Character Card v3 (CCv3) 표준을 따르는 ZIP 아카이브입니다.

### 1.1 파일 구조

```
character.charx (ZIP)
├── card.json              # 메인 캐릭터 데이터
├── card.png               # 선택: 호환용 PNG 카드
├── module.risum           # 선택: 임베드된 모듈
└── assets/                # 에셋 파일들
    └── [type]/
        └── [itype]/
            ├── icon.png
            ├── happy.webp
            └── ...
```

### 1.2 card.json 구조

```typescript
interface CharXCardJson {
  spec: 'chara_card_v3';       // 버전 명시
  spec_version: '3.0';         // 스펙 버전
  data: CCv3Data;              // 캐릭터 데이터
}

interface CCv3Data {
  // ═══════════════════════════════════════════════════════════════
  // 기본 필드 (CCv1/v2 호환)
  // ═══════════════════════════════════════════════════════════════
  name: string;
  description: string;
  personality: string;
  scenario: string;
  first_mes: string;
  mes_example: string;
  
  // ═══════════════════════════════════════════════════════════════
  // CCv2 필드
  // ═══════════════════════════════════════════════════════════════
  creator: string;
  creator_notes: string;
  character_version: string;
  system_prompt: string;
  post_history_instructions: string;
  alternate_greetings: string[];
  tags: string[];
  
  // ═══════════════════════════════════════════════════════════════
  // CCv3 에셋 시스템
  // ═══════════════════════════════════════════════════════════════
  assets: CCv3Asset[];
  
  // ═══════════════════════════════════════════════════════════════
  // 확장 필드 (RisuAI 전용)
  // ═══════════════════════════════════════════════════════════════
  extensions: {
    risuai?: RisuAIExtension;
    // 다른 앱의 확장도 가능
  };
}

interface CCv3Asset {
  type: string;    // 에셋 타입
  uri: string;     // 에셋 위치
  name: string;    // 에셋 이름
  ext: string;     // 파일 확장자
}
```

### 1.3 에셋 타입

| type | 설명 | 예시 |
|------|------|------|
| `icon` | 프로필 아이콘 | 캐릭터 썸네일 |
| `emotion` | 감정 이미지 | happy, sad, angry |
| `background` | 배경 이미지 | 장면 배경 |
| `audio` | 오디오 파일 | BGM, 효과음 |
| `video` | 비디오 파일 | 컷씬 |
| `portrait` | 초상화 | VN 스타일 |
| `additional` | 추가 에셋 | 기타 |

### 1.4 에셋 URI 형식

```typescript
// ZIP 내 파일 경로
"embeded://assets/emotion/itype/happy.png"

// 기본 아이콘 (스킵)
"ccdefault:"

// 외부 URL
"https://example.com/image.png"
```

### 1.5 RisuAI 확장

```typescript
interface RisuAIExtension {
  // 로어북
  globalLore?: loreBook[];
  
  // 스크립트
  customscript?: customscript[];
  triggerscript?: triggerscript[];
  
  // 모듈 ID
  modules?: string[];
  
  // 추가 설정
  viewScreen?: 'emotion' | 'none' | 'imggen' | 'vn';
  ttsMode?: string;
  // ... (database.svelte.ts의 character 인터페이스 참조)
}
```

---

## 2. PNG (.png)

PNG 파일은 tEXt 청크에 Base64 인코딩된 JSON을 포함합니다.

### 2.1 구조

```
PNG 파일
├── PNG 시그니처: 89 50 4E 47 0D 0A 1A 0A
├── IHDR 청크 (이미지 헤더)
├── ... (이미지 데이터 청크들)
├── tEXt 청크 #1: keyword="chara", data=Base64(JSON)
├── tEXt 청크 #2: keyword="risuModule", data=Base64(risum)  [선택]
├── tEXt 청크 #3: keyword="asset:0", data=Base64(binary)    [선택]
├── tEXt 청크 #4: keyword="asset:1", data=Base64(binary)    [선택]
└── IEND 청크 (끝)
```

### 2.2 tEXt 청크 형식

```
tEXt 청크 구조:
┌─────────────┬─────────────┬─────────────┬─────────────┐
│ Length      │ Type        │ Data        │ CRC         │
│ 4 bytes BE  │ "tEXt"      │ variable    │ 4 bytes     │
└─────────────┴─────────────┴─────────────┴─────────────┘

Data 내용:
┌─────────────┬───────┬─────────────────────────────────┐
│ Keyword     │ NUL   │ Text (Base64)                   │
│ "chara"     │ 0x00  │ Base64(gzip(JSON))              │
└─────────────┴───────┴─────────────────────────────────┘
```

### 2.3 키워드별 내용

| 키워드 | 인코딩 | 내용 |
|--------|--------|------|
| `chara` | Base64 + gzip | CCv3 JSON 또는 레거시 JSON |
| `risuModule` | Base64 | .risum 바이너리 |
| `asset:N` | Base64 | 에셋 바이너리 (N은 인덱스) |

### 2.4 에셋 인덱스 매핑

```typescript
// assets 배열에서 __asset:N 참조
const assets = [
  { type: 'icon', uri: 'ccdefault:', name: '', ext: 'png' },
  { type: 'emotion', uri: '__asset:0', name: 'happy', ext: 'png' },
  { type: 'emotion', uri: '__asset:1', name: 'sad', ext: 'webp' }
];

// tEXt 청크 매핑:
// asset:0 → happy.png
// asset:1 → sad.webp
```

### 2.5 chara 데이터 디코딩

```typescript
// 1. tEXt 청크에서 Base64 추출
// 2. Base64 디코딩
// 3. (gzip 압축된 경우) 압축 해제
// 4. UTF-8 텍스트로 변환
// 5. JSON 파싱

function decodeCharaData(base64: string): CCv3Data {
  const bytes = atob(base64);
  const data = maybeGunzip(bytes);  // gzip 감지 및 해제
  return JSON.parse(data);
}
```

---

## 3. JPEG (.jpg, .jpeg)

JPEG 파일은 EXIF 또는 APP1 세그먼트에 데이터를 저장합니다.

### 3.1 방법 A: EXIF UserComment

```
JPEG 파일
├── SOI 마커: FF D8
├── APP1 세그먼트 (EXIF)
│   └── UserComment 태그: Base64(JSON)
├── ... (이미지 데이터)
└── EOI 마커: FF D9
```

### 3.2 방법 B: CharX-JPEG (커스텀)

```
JPEG 파일
├── SOI 마커: FF D8
├── APP1 세그먼트 (CharX)
│   ├── 마커: "CharXJPEG"
│   ├── 버전: uint8
│   ├── JSON 길이: uint32 LE
│   ├── JSON 데이터
│   ├── 에셋 카운트: uint32 LE
│   └── 에셋 블록들...
├── ... (이미지 데이터)
└── EOI 마커: FF D9
```

### 3.3 CharX-JPEG 에셋 블록

```
에셋 블록:
┌─────────────┬─────────────┬─────────────┐
│ Name Length │ Name        │ Data Length │ Data        │
│ 4 bytes LE  │ variable    │ 4 bytes LE  │ variable    │
└─────────────┴─────────────┴─────────────┴─────────────┘
```

---

## 4. CCv3 호환성

### 4.1 버전 감지

```typescript
function detectCardVersion(data: any): 'v1' | 'v2' | 'v3' {
  if (data.spec === 'chara_card_v3') return 'v3';
  if (data.data) return 'v2';
  return 'v1';
}
```

### 4.2 필드 매핑

| CCv3 | CCv2 | CCv1 | RisuAI character |
|------|------|------|------------------|
| `data.name` | `name` | `name` | `name` |
| `data.description` | `description` | `description` | `desc` |
| `data.first_mes` | `first_mes` | `first_mes` | `firstMessage` |
| `data.personality` | `personality` | `personality` | `personality` |
| `data.scenario` | `scenario` | `scenario` | `scenario` |
| `data.mes_example` | `mes_example` | `mes_example` | `exampleMessage` |
| `data.system_prompt` | `system_prompt` | - | `systemPrompt` |
| `data.post_history_instructions` | `post_history_instructions` | - | `postHistoryInstructions` |
| `data.alternate_greetings` | `alternate_greetings` | - | `alternateGreetings` |
| `data.creator` | `creator` | - | `creator` |
| `data.tags` | `tags` | - | `tags` |
| `data.assets` | - | - | `ccAssets` |

### 4.3 RisuAI → CCv3 변환

```typescript
function characterToCCv3(char: character): CharXCardJson {
  return {
    spec: 'chara_card_v3',
    spec_version: '3.0',
    data: {
      name: char.name,
      description: char.desc,
      personality: char.personality,
      scenario: char.scenario,
      first_mes: char.firstMessage,
      mes_example: char.exampleMessage,
      
      creator: char.creator,
      creator_notes: char.creatorNotes,
      character_version: char.characterVersion,
      system_prompt: char.systemPrompt,
      post_history_instructions: char.postHistoryInstructions,
      alternate_greetings: char.alternateGreetings,
      tags: char.tags,
      
      assets: convertToAssets(char),
      
      extensions: {
        risuai: {
          globalLore: char.globalLore,
          customscript: char.customscript,
          triggerscript: char.triggerscript,
          viewScreen: char.viewScreen,
          // ...
        }
      }
    }
  };
}
```

---

## 참조

- [Character Card Specification](https://github.com/malfoyslastname/character-card-spec-v2)
- [CharacterCard v3 Spec](https://github.com/kwaroran/character-card-spec-v3)
- [schema_reference.md](schema_reference.md) - 전체 데이터 스키마
- [risup_schema.md](risup_schema.md) - 프리셋 스키마
