# RisuAI 파일 포맷 사양서

> **버전**: 2.0.0  
> **최종 업데이트**: 2026-01-25  
> **검증 상태**: ✅ 실제 구현 테스트 완료

이 문서는 RisuAI에서 사용하는 모든 파일 포맷의 완전한 바이너리 구조, 파싱/익스포트 로직, 구현 코드를 정의합니다.

---

## 목차

1. [포맷 개요](#1-포맷-개요)
2. [공통 의존성 및 유틸리티](#2-공통-의존성-및-유틸리티)
3. [캐릭터 카드 (.charx, .png, .jpg, .jpeg)](#3-캐릭터-카드)
4. [모듈 (.risum)](#4-모듈-risum)
5. [프리셋 (.risup, .risupreset)](#5-프리셋-risup-risupreset)
6. [데이터 스키마](#6-데이터-스키마)
7. [에셋 처리 전략](#7-에셋-처리-전략)
8. [구현 참조](#8-구현-참조)

---

## 1. 포맷 개요

### 1.1 지원 포맷 비교표

| 포맷 | 확장자 | 압축 방식 | 암호화 | 에셋 지원 | 설명 |
|------|--------|-----------|:------:|:---------:|------|
| **CharX** | `.charx` | ZIP (fflate) | ❌ | ✅ | 표준 캐릭터 카드 포맷 |
| **CharX-JPEG** | `.jpg`, `.jpeg` | JPEG + ZIP | ❌ | ✅ | JPEG 뒤에 ZIP 데이터 연결 |
| **PNG Card** | `.png` | PNG tEXt 청크 | ❌ (선택: RCC) | ✅ | CCv2/v3 메타데이터 |
| **모듈** | `.risum` | RPack | ❌ | ✅ | 로어북/Regex/Trigger 패키지 |
| **프리셋** | `.risup` | RPack → fflate → MsgPack | AES-GCM | ❌ | AI 프리셋 (최신 형식) |
| **프리셋** | `.risupreset` | fflate → MsgPack | AES-GCM | ❌ | AI 프리셋 (레거시) |

### 1.2 파싱 체인 요약

```
캐릭터 카드 (.charx):
  파싱: ZIP 해제 → card.json + assets/
  익스포트: card.json + assets → ZIP 압축
  ※ 원본 참조: src/ts/process/processzip.ts (CharXImporter, CharXWriter)

캐릭터 카드 (.jpg/.jpeg - CharX-JPEG):
  파싱: JPEG 부분 분리 + ZIP 부분 → CharX 파싱
  ※ ZIP 시작: PK\x03\x04 (0x50 0x4B 0x03 0x04)

캐릭터 카드 (.png):
  파싱: tEXt 청크 순회 → ccv3/chara → Base64 → JSON
  에셋: chara-ext-asset_{N} → Base64 → 바이너리
  ※ 원본 참조: src/ts/pngChunk.ts

모듈 (.risum):
  파싱: RPack → 매직넘버(0x6F 0x00) → 메인블록 + 에셋블록들
  익스포트: JSON + 에셋 → RPack 인코딩
  ※ 원본 참조: src/ts/process/modules.ts (exportModule, readModule)
  ※ 별도 JSON 파일 없음 (바이너리에 직접 임베드)

프리셋 (.risup):
  파싱: RPack → fflate → MsgPack → AES-GCM → MsgPack
  익스포트: JSON → MsgPack → AES-GCM → MsgPack + 메타 → fflate → RPack
  ※ 원본 참조: src/ts/storage/database.svelte.ts (downloadPreset, importPreset)
  ※ 암호화 키: 'risupreset'

프리셋 (.risupreset):
  파싱: fflate → MsgPack → AES-GCM → MsgPack (RPack 없음)
  ※ 레거시 포맷

⚠️ 프리셋 데이터 스키마(botPreset, promptTemplate 등)는 [docs/risup_schema.md](docs/risup_schema.md) 참조
```

---

## 2. 공통 의존성 및 유틸리티

### 2.1 필수 라이브러리

```json
{
  "dependencies": {
    "fflate": "^0.8.2",
    "msgpackr": "^1.10.0"
  }
}
```

| 라이브러리 | 용도 |
|------------|------|
| `fflate` | ZIP 압축/해제, DEFLATE |
| `msgpackr` | MessagePack 인코딩/디코딩 |
| Node.js `crypto` | AES-GCM 암호화 (Node.js) |
| Web Crypto API | AES-GCM 암호화 (브라우저) |

### 2.2 RPack 코덱

RPack은 RisuAI의 커스텀 바이트 매핑 코덱입니다.

#### ⚠️ 중요: WASM 사용 필수

단순 256바이트 룩업 테이블(`rpack_map.bin`)로 직접 구현하면 **일부 파일에서 실패**합니다.  
RisuAI 공식 WASM 모듈(`rpack_bg.wasm`)을 사용하세요.

#### WASM 소스 위치
- 원본: `Risuai-2026.1.184/src/ts/rpack/rpack_bg.wasm`
- 복사 후 사용: `scripts/rpack_bg.wasm`

#### Node.js WASM 래퍼

```typescript
let wasm: any;
let cachedUint8ArrayMemory0: Uint8Array | null = null;

function getUint8ArrayMemory0() {
  if (cachedUint8ArrayMemory0 === null || cachedUint8ArrayMemory0.byteLength === 0) {
    cachedUint8ArrayMemory0 = new Uint8Array(wasm.memory.buffer);
  }
  return cachedUint8ArrayMemory0;
}

async function initWasm() {
  if (wasm) return;
  const wasmPath = path.join(__dirname, 'rpack_bg.wasm');
  const wasmBuffer = fs.readFileSync(wasmPath);
  const { instance } = await WebAssembly.instantiate(wasmBuffer);
  wasm = instance.exports;
}

async function decodeRPack(datas: Uint8Array): Promise<Uint8Array> {
  await initWasm();
  try {
    const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
    const ptr0 = passArray8ToWasm0(datas, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    wasm.decode(retptr, ptr0, len0);
    const r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
    const r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
    const v2 = getArrayU8FromWasm0(r0, r1).slice();
    wasm.__wbindgen_free(r0, r1 * 1, 1);
    return v2;
  } finally {
    wasm.__wbindgen_add_to_stack_pointer(16);
  }
}
```

### 2.3 Binary Helper

Little-Endian 바이너리 읽기/쓰기를 위한 헬퍼 클래스입니다.

```typescript
export class BinaryWriter {
  private parts: Uint8Array[] = [];

  writeByte(value: number): void {
    this.parts.push(new Uint8Array([value & 0xFF]));
  }

  writeUint32LE(value: number): void {
    const buf = new Uint8Array(4);
    buf[0] = value & 0xFF;
    buf[1] = (value >> 8) & 0xFF;
    buf[2] = (value >> 16) & 0xFF;
    buf[3] = (value >> 24) & 0xFF;
    this.parts.push(buf);
  }

  writeBytes(data: Uint8Array): void {
    this.parts.push(data);
  }

  toUint8Array(): Uint8Array {
    const totalLength = this.parts.reduce((sum, p) => sum + p.length, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;
    for (const part of this.parts) {
      result.set(part, offset);
      offset += part.length;
    }
    return result;
  }
}

export class BinaryReader {
  private view: DataView;
  private offset = 0;

  constructor(buffer: ArrayBuffer) {
    this.view = new DataView(buffer);
  }

  readByte(): number {
    return this.view.getUint8(this.offset++);
  }

  readUint32LE(): number {
    const value = this.view.getUint32(this.offset, true);
    this.offset += 4;
    return value;
  }

  readBytes(length: number): Uint8Array {
    const data = new Uint8Array(this.view.buffer, this.offset, length);
    this.offset += length;
    return data;
  }

  eof(): boolean {
    return this.offset >= this.view.byteLength;
  }
}
```

### 2.4 AES-GCM 암호화/복호화

프리셋 파일은 AES-256-GCM으로 암호화됩니다.

#### 암호화 파라미터
- **키**: `SHA-256("risupreset")` (256비트)
- **IV**: 12바이트 zeros
- **AuthTag**: 16바이트 (데이터 끝에 위치)

#### Node.js 구현

```typescript
import * as crypto from 'crypto';

async function decryptBuffer(data: Uint8Array, secret: string): Promise<Buffer> {
  const keyHash = crypto.createHash('sha256').update(secret).digest();
  const iv = Buffer.alloc(12, 0);  // 12바이트 zeros
  
  const authTag = data.slice(-16);           // 마지막 16바이트
  const ciphertext = data.slice(0, -16);     // 나머지
  
  const decipher = crypto.createDecipheriv('aes-256-gcm', keyHash, iv);
  decipher.setAuthTag(authTag);
  
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}

async function encryptBuffer(data: Uint8Array, secret: string): Promise<Uint8Array> {
  const keyHash = crypto.createHash('sha256').update(secret).digest();
  const iv = Buffer.alloc(12, 0);
  
  const cipher = crypto.createCipheriv('aes-256-gcm', keyHash, iv);
  const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
  const authTag = cipher.getAuthTag();
  
  return new Uint8Array([...encrypted, ...authTag]);
}
```

#### 브라우저 (Web Crypto API)

```typescript
async function getAesKey(secret: string): Promise<CryptoKey> {
  const keyData = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(secret));
  return crypto.subtle.importKey('raw', keyData, 'AES-GCM', false, ['encrypt', 'decrypt']);
}

async function decryptBuffer(data: Uint8Array, secret: string): Promise<Uint8Array> {
  const key = await getAesKey(secret);
  const iv = new Uint8Array(12);
  const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, data);
  return new Uint8Array(decrypted);
}
```

---

## 3. 캐릭터 카드

캐릭터 카드는 4가지 포맷을 지원합니다:
- `.charx` (ZIP 아카이브)
- `.jpg/.jpeg` (CharX-JPEG: JPEG + ZIP)
- `.png` (tEXt 청크)
- `.json` (순수 JSON, 에셋 없음)

### 3.1 CharX (.charx) 포맷

#### ZIP 내부 구조

```
character.charx (ZIP 아카이브)
├── card.json              # CCv3 형식 캐릭터 데이터 (필수)
├── module.risum           # 선택: 임베드된 모듈
└── assets/                # 에셋 파일들
    ├── type/itype/        # RisuAI 내부 경로 구조
    │   ├── image1.png
    │   └── emotion_happy.webp
    └── ...
```

#### 에셋 URI 형식

`card.json` 내의 `data.assets` 배열에서 에셋을 참조합니다:

```json
{
  "data": {
    "assets": [
      {
        "type": "icon",
        "uri": "ccdefault:",   // 기본 아이콘 - 스킵
        "name": "",
        "ext": "png"
      },
      {
        "type": "emotion",
        "uri": "embeded://assets/emotion/itype/happy.png",  // CharX/CharX-JPEG
        "name": "happy",
        "ext": "png"
      },
      {
        "type": "emotion",
        "uri": "__asset:1",    // PNG 청크 인덱스
        "name": "sad",
        "ext": "png"
      }
    ]
  }
}
```

| URI 형식 | 설명 | 사용처 |
|----------|------|--------|
| `ccdefault:` | 기본 아이콘 (스킵) | 모든 포맷 |
| `embeded://assets/...` | ZIP 내 파일 경로 | CharX, CharX-JPEG |
| `__asset:N` | tEXt 청크 인덱스 | PNG |

#### 파싱 코드

```typescript
import { unzipSync } from 'fflate';

interface CharXResult {
  card: any;
  assets: Map<string, Uint8Array>;
  module?: Uint8Array;
}

function parseCharx(data: Uint8Array): CharXResult {
  const unzipped = unzipSync(data);
  
  if (!unzipped['card.json']) {
    throw new Error('Invalid .charx: card.json not found');
  }
  
  const cardJson = new TextDecoder().decode(unzipped['card.json']);
  const card = JSON.parse(cardJson);
  const assets = new Map<string, Uint8Array>();
  let module: Uint8Array | undefined;
  
  // 에셋 추출
  for (const [filePath, fileData] of Object.entries(unzipped)) {
    if (filePath === 'card.json') continue;
    if (filePath === 'module.risum') {
      module = fileData;
      continue;
    }
    assets.set(filePath, fileData);
  }
  
  // card.data.assets 매핑
  const assetMetas = card?.data?.assets || [];
  const nameCount = new Map<string, number>();  // 중복 이름 처리
  const result = new Map<string, Uint8Array>();
  
  for (const meta of assetMetas) {
    if (!meta.uri || meta.uri === 'ccdefault:') continue;
    
    let fileData: Uint8Array | undefined;
    
    // embeded:// 형식
    if (meta.uri.startsWith('embeded://')) {
      const embedPath = meta.uri.replace('embeded://', '');
      fileData = assets.get(embedPath);
    }
    // __asset:N 형식
    else if (meta.uri.startsWith('__asset:')) {
      // PNG에서 사용, CharX에서는 보통 embeded 사용
      const index = meta.uri.replace('__asset:', '');
      fileData = assets.get(`__asset/${index}`);
    }
    
    if (!fileData) continue;
    
    // 중복 이름 처리 (ModuleManager 방식)
    const { base, ext: nameExt } = splitNameAndExt(meta.name);
    const finalExt = nameExt || meta.ext || 'bin';
    const baseKey = base.toLowerCase();
    
    const count = nameCount.get(baseKey) || 0;
    nameCount.set(baseKey, count + 1);
    
    let fileName: string;
    if (count === 0) {
      fileName = nameExt ? meta.name : `${meta.name}.${finalExt}`;
    } else {
      fileName = `${base}{{${count}}}.${finalExt}`;
    }
    
    result.set(fileName, fileData);
  }
  
  return { card, assets: result, module };
}
```

### 3.2 CharX-JPEG (.jpg, .jpeg) 포맷

JPEG 이미지 뒤에 ZIP 데이터가 연결된 형식입니다.

#### 바이너리 구조

```
┌─────────────────────────────────────────┐
│ JPEG 이미지 데이터                      │  0xFF 0xD8 ... 0xFF 0xD9
├─────────────────────────────────────────┤
│ ZIP 데이터 (CharX)                      │  0x50 0x4B 0x03 0x04 (PK..)
│   ├── card.json                         │
│   └── assets/...                        │
└─────────────────────────────────────────┘
```

#### 파싱 코드

```typescript
function findZipStart(data: Uint8Array): number {
  // ZIP 매직 넘버: PK\x03\x04
  for (let i = 0; i < data.length - 4; i++) {
    if (data[i] === 0x50 && data[i+1] === 0x4B && 
        data[i+2] === 0x03 && data[i+3] === 0x04) {
      return i;
    }
  }
  return -1;
}

async function parseCharxJpeg(data: Uint8Array): Promise<CharXResult> {
  const zipStart = findZipStart(data);
  if (zipStart <= 0) {
    throw new Error('No ZIP data found in JPEG');
  }
  
  // JPEG 부분 추출 (카드 이미지로 사용 가능)
  const jpegData = data.slice(0, zipStart);
  
  // ZIP 부분을 CharX로 파싱
  const zipData = data.slice(zipStart);
  const result = parseCharx(zipData);
  
  // 카드 이미지 추가
  result.assets.set('card_image.jpg', jpegData);
  
  return result;
}
```

### 3.3 PNG 캐릭터 카드 포맷

PNG 파일의 tEXt 청크에 Base64로 인코딩된 캐릭터 데이터가 저장됩니다.

#### PNG 청크 구조

```
PNG 파일:
┌─────────────────────────────────────┐
│ PNG 시그니처 (8 bytes)              │  89 50 4E 47 0D 0A 1A 0A
├─────────────────────────────────────┤
│ IHDR 청크 (이미지 헤더)             │
├─────────────────────────────────────┤
│ ... 기타 청크들 ...                 │
├─────────────────────────────────────┤
│ tEXt: chara       ← CCv2 데이터     │
│ tEXt: ccv3        ← CCv3 데이터 (우선)
│ tEXt: chara-ext-asset_0  ← 에셋 0  │
│ tEXt: chara-ext-asset_1  ← 에셋 1  │
├─────────────────────────────────────┤
│ IEND 청크                           │
└─────────────────────────────────────┘
```

#### tEXt 청크 바이너리 구조

```
┌──────────────┬──────────────┬─────────────────┬──────────────┐
│ Length (4B)  │ Type (4B)    │ Data            │ CRC (4B)     │
│ Big-Endian   │ "tEXt"       │ keyword\0value  │              │
└──────────────┴──────────────┴─────────────────┴──────────────┘
```

#### 주요 청크 키

| 키 | 내용 | 인코딩 |
|----|------|--------|
| `chara` | CCv2 캐릭터 데이터 | Base64 → JSON |
| `ccv3` | CCv3 캐릭터 데이터 (우선) | Base64 → JSON |
| `chara-ext-asset_{N}` | 에셋 바이너리 | Base64 → Binary |

#### 파싱 코드

```typescript
const PNG_SIGNATURE = new Uint8Array([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);

function parsePngCharacterCard(data: Uint8Array): CharXResult {
  // PNG 시그니처 검증
  for (let i = 0; i < 8; i++) {
    if (data[i] !== PNG_SIGNATURE[i]) {
      throw new Error('Invalid PNG signature');
    }
  }
  
  const chunks: Record<string, string> = {};
  let pos = 8;
  
  // 청크 순회
  while (pos + 12 <= data.length) {
    const length = (data[pos] << 24) | (data[pos+1] << 16) | 
                   (data[pos+2] << 8) | data[pos+3];
    const type = String.fromCharCode(...data.slice(pos + 4, pos + 8));
    
    if (pos + 12 + length > data.length) break;
    
    if (type === 'tEXt') {
      const chunkData = data.slice(pos + 8, pos + 8 + length);
      const nullIndex = chunkData.indexOf(0);
      if (nullIndex > 0) {
        const keyword = new TextDecoder().decode(chunkData.slice(0, nullIndex));
        const value = new TextDecoder().decode(chunkData.slice(nullIndex + 1));
        chunks[keyword] = value;
      }
    }
    
    if (type === 'IEND') break;
    pos += 12 + length;
  }
  
  // ccv3 우선, 없으면 chara
  const charaRaw = chunks['ccv3'] || chunks['chara'];
  if (!charaRaw) {
    throw new Error('No character data found in PNG');
  }
  
  // Base64 디코딩
  const charaBytes = Uint8Array.from(atob(charaRaw), c => c.charCodeAt(0));
  const card = JSON.parse(new TextDecoder().decode(charaBytes));
  
  // 임베디드 에셋 추출
  const embeddedAssets = new Map<string, Uint8Array>();
  for (const [key, value] of Object.entries(chunks)) {
    if (key.startsWith('chara-ext-asset_')) {
      const index = key.replace('chara-ext-asset_', '');
      const assetData = Uint8Array.from(atob(value), c => c.charCodeAt(0));
      embeddedAssets.set(index, assetData);
    }
  }
  
  // card.data.assets 매핑 (중복 처리 포함)
  const assetMetas = card?.data?.assets || [];
  const nameCount = new Map<string, number>();
  const result = new Map<string, Uint8Array>();
  
  for (const meta of assetMetas) {
    if (!meta.uri || meta.uri === 'ccdefault:') continue;
    if (!meta.uri.startsWith('__asset:')) continue;
    
    const index = meta.uri.replace('__asset:', '');
    const assetData = embeddedAssets.get(index);
    if (!assetData) continue;
    
    // 중복 이름 처리
    const { base, ext: nameExt } = splitNameAndExt(meta.name);
    const finalExt = nameExt || meta.ext || 'bin';
    const baseKey = base.toLowerCase();
    
    const count = nameCount.get(baseKey) || 0;
    nameCount.set(baseKey, count + 1);
    
    let fileName: string;
    if (count === 0) {
      fileName = nameExt ? meta.name : `${meta.name}.${finalExt}`;
    } else {
      fileName = `${base}{{${count}}}.${finalExt}`;
    }
    
    result.set(fileName, assetData);
  }
  
  // 카드 이미지 (메타데이터 제거된 PNG)
  result.set('card_image.png', trimPngMetadata(data));
  
  return { card, assets: result };
}
```

### 3.4 RCC 암호화 형식

비밀번호로 보호된 PNG 카드입니다.

#### 형식

```
rcc||rccv1||{암호화데이터_Base64}||{SHA256해시}||{메타데이터_Base64}
```

#### 파라미터

| 필드 | 설명 |
|------|------|
| `rcc` | 매직 문자열 |
| `rccv1` | 버전 |
| 암호화데이터 | AES-GCM 암호화된 JSON |
| SHA256해시 | 암호화 데이터의 해시 (검증용) |
| 메타데이터 | `{"usePassword": boolean}` |

#### 복호화

- 비밀번호 없음: 키 = `'RISU_NONE'`
- 비밀번호 있음: 키 = 사용자 입력 비밀번호

---

## 4. 모듈 (.risum)

모듈은 로어북, Regex, Trigger, 에셋을 하나의 파일로 패키징한 형식입니다.

### 4.1 바이너리 구조

```
┌─────────────────────────────────────────────────────────────────┐
│ 헤더                                                            │
├─────────┬─────────┬─────────────┬──────────────────────────────┤
│ Magic   │ Version │ Main Length │ Main Data (RPack)            │
│ 1 byte  │ 1 byte  │ 4 bytes LE  │ variable                     │
│ 0x6F(111)│ 0x00   │             │ → JSON                       │
├─────────┴─────────┴─────────────┴──────────────────────────────┤
│ 에셋 블록 (반복)                                                 │
├─────────┬─────────────┬────────────────────────────────────────┤
│ Marker  │ Asset Length│ Asset Data (RPack)                     │
│ 1 byte  │ 4 bytes LE  │ variable                               │
│ 0x01    │             │ → 바이너리                             │
├─────────┴─────────────┴────────────────────────────────────────┤
│ EOF 마커                                                        │
├─────────────────────────────────────────────────────────────────┤
│ 0x00                                                            │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 Main Data JSON 구조

```json
{
  "type": "risuModule",
  "module": {
    "name": "모듈 이름",
    "description": "모듈 설명",
    "id": "uuid",
    "lorebook": [...],
    "regex": [...],
    "trigger": [...],
    "cjs": "// CustomJS 코드",
    "assets": [
      ["에셋이름", "경로", "확장자"],
      ...
    ],
    "lowLevelAccess": false,
    "hideIcon": false,
    "backgroundEmbedding": "",
    "namespace": "",
    "mcp": { "url": "" }
  }
}
```

### 4.3 에셋 매핑

`module.assets` 배열의 순서와 에셋 블록의 순서가 1:1 대응합니다:

```typescript
// module.assets[i] = ["에셋이름", "경로", "확장자"]
// 에셋 블록 i번째 = 해당 에셋의 바이너리 데이터

for (let i = 0; i < module.assets.length; i++) {
  const [name, path, ext] = module.assets[i];
  const data = assetBlocks[i];  // RPack 디코딩된 데이터
  
  // 파일 저장: `${name}.${ext}`
}
```

### 4.4 파싱 코드

```typescript
interface RisumResult {
  module: any;
  assets: Map<string, Uint8Array>;
}

async function parseRisum(data: Uint8Array): Promise<RisumResult> {
  const reader = new BinaryReader(data);
  
  // 헤더 검증
  const magic = reader.readByte();
  const version = reader.readByte();
  if (magic !== 111 || version !== 0) {
    throw new Error('Invalid .risum file');
  }
  
  // 메인 데이터
  const mainLen = reader.readUint32LE();
  const mainData = reader.readBytes(mainLen);
  const decodedMain = await decodeRPack(mainData);
  const mainJson = JSON.parse(new TextDecoder().decode(decodedMain));
  
  if (mainJson.type !== 'risuModule') {
    throw new Error('Invalid module type');
  }
  
  const module = mainJson.module;
  const assetBlocks: Uint8Array[] = [];
  
  // 에셋 블록 읽기
  while (!reader.eof()) {
    const marker = reader.readByte();
    if (marker === 0) break;  // EOF
    if (marker !== 1) throw new Error('Invalid asset marker');
    
    const assetLen = reader.readUint32LE();
    const assetData = reader.readBytes(assetLen);
    const decodedAsset = await decodeRPack(assetData);
    assetBlocks.push(decodedAsset);
  }
  
  // 에셋 매핑 (중복 이름 처리)
  const assets = new Map<string, Uint8Array>();
  const nameCount = new Map<string, number>();
  
  const assetMetas = module.assets || [];
  for (let i = 0; i < assetMetas.length && i < assetBlocks.length; i++) {
    const [name, , ext] = assetMetas[i];
    const data = assetBlocks[i];
    
    // 중복 처리
    const { base, ext: nameExt } = splitNameAndExt(name);
    const finalExt = nameExt || ext || 'bin';
    const baseKey = base.toLowerCase();
    
    const count = nameCount.get(baseKey) || 0;
    nameCount.set(baseKey, count + 1);
    
    let fileName: string;
    if (count === 0) {
      fileName = nameExt ? name : `${name}.${finalExt}`;
    } else {
      fileName = `${base}{{${count}}}.${finalExt}`;
    }
    
    assets.set(fileName, data);
  }
  
  return { module, assets };
}
```

---

## 5. 프리셋 (.risup, .risupreset)

AI 프리셋 파일은 암호화된 설정 데이터를 포함합니다.

### 5.1 암호화 상수

```typescript
const PRESET_SECRET = 'risupreset';
```

### 5.2 .risup 파싱 체인

```
파일 데이터
    │
    ▼ RPack 디코딩
    │
    ▼ fflate.decompressSync
    │
    ▼ msgpackr.decode → { presetVersion, type, preset }
    │
    ▼ preset 필드 → AES-GCM 복호화 (키: 'risupreset')
    │
    ▼ msgpackr.decode
    │
    ▼ 프리셋 객체
```

### 5.3 .risupreset 파싱 체인 (레거시)

```
파일 데이터
    │
    ▼ fflate.decompressSync (RPack 없음!)
    │
    ▼ 이하 .risup과 동일
```

### 5.4 컨테이너 구조

```typescript
interface PresetContainer {
  presetVersion: number;  // 0 또는 2
  type: 'preset' | 'risupreset';
  preset: Uint8Array;     // AES-GCM 암호화된 MsgPack 데이터
  // 또는
  pres?: Uint8Array;      // 구버전 필드명
}
```

### 5.5 파싱 코드

```typescript
import { decompressSync } from 'fflate';
import { decode as decodeMsgpack } from 'msgpackr';

async function parseRisup(data: Uint8Array): Promise<any> {
  // 1. RPack 디코딩
  const rpackDecoded = await decodeRPack(data);
  
  // 2. fflate 압축 해제
  const decompressed = decompressSync(rpackDecoded);
  
  // 3. 컨테이너 파싱
  const container = decodeMsgpack(decompressed) as PresetContainer;
  
  // 4. 암호화된 데이터 추출
  const encryptedData = container.preset || container.pres;
  if (!encryptedData) {
    throw new Error('No preset data found');
  }
  
  // 5. 복호화
  const decrypted = await decryptBuffer(encryptedData, 'risupreset');
  
  // 6. 최종 파싱
  return decodeMsgpack(decrypted);
}

async function parseRisupreset(data: Uint8Array): Promise<any> {
  // RPack 없이 바로 fflate
  const decompressed = decompressSync(data);
  
  // 이하 동일
  const container = decodeMsgpack(decompressed) as PresetContainer;
  const encryptedData = container.preset || container.pres;
  const decrypted = await decryptBuffer(encryptedData, 'risupreset');
  return decodeMsgpack(decrypted);
}
```

### 5.6 프리셋 데이터 스키마

프리셋 내부 데이터 구조 (`botPreset`, `promptTemplate`, `FormatingOrderItem`, `RegexScript` 등)는  
**[docs/risup_schema.md](docs/risup_schema.md)** 문서를 참조하세요.

**핵심 개념:**
- `mainPrompt`, `jailbreak`: 레거시 텍스트 필드 (구버전 호환용)
- `promptTemplate`: 구조화된 프롬프트 배열 (최신 프리셋)
- `formatingOrder`: 프롬프트 조합 순서
- `regex`: 입출력 변환 정규식

---

## 6. 데이터 스키마

> **📖 상세 스키마 문서**
> 
> - [schema_reference.md](docs/schema_reference.md) - 전체 데이터 스키마 레퍼런스
>   - RisuModule, character, groupChat, loreBook, customscript, triggerscript, Chat, Message
>   - risum 바이너리 구조
>   - 에셋 처리 방식
> 
> - [character_format.md](docs/character_format.md) - 캐릭터 카드 포맷
>   - CharX (.charx) ZIP 구조
>   - PNG tEXt 청크 구조
>   - JPEG/CharX-JPEG 구조
>   - CCv3 호환성 및 필드 매핑
> 
> - [risup_schema.md](docs/risup_schema.md) - 프리셋 스키마
>   - botPreset 50+ 필드
>   - PromptItem 6가지 타입
>   - FormatingOrderItem
>   - RegexScript

### 6.1 캐릭터 카드 (CCv3)

```typescript
interface CharacterCardV3 {
  spec: 'chara_card_v3';
  spec_version: '3.0';
  data: {
    // 기본 정보
    name: string;
    description: string;
    personality: string;
    scenario: string;
    first_mes: string;
    mes_example: string;
    
    // 크리에이터 정보
    creator: string;
    creator_notes: string;
    character_version: string;
    tags: string[];
    
    // 시스템
    system_prompt: string;
    post_history_instructions: string;
    alternate_greetings: string[];
    
    // 에셋
    assets?: CharacterAsset[];
    
    // 로어북
    character_book?: {
      entries: LorebookEntry[];
    };
    
    // 확장
    extensions?: {
      risuai?: RisuAIExtensions;
    };
  };
}

interface CharacterAsset {
  type: string;      // 'icon', 'emotion', 'background', 등
  uri: string;       // 'ccdefault:', 'embeded://...', '__asset:N'
  name: string;      // 에셋 이름
  ext: string;       // 확장자
}
```

### 6.2 모듈 (RisuModule)

```typescript
interface RisuModule {
  name: string;
  description: string;
  id: string;
  
  // 컨텐츠
  lorebook?: LorebookEntry[];
  regex?: RegexScript[];
  trigger?: TriggerScript[];
  cjs?: string;
  
  // 에셋: [이름, 경로, 확장자]
  assets?: [string, string, string][];
  
  // 옵션
  lowLevelAccess?: boolean;
  hideIcon?: boolean;
  backgroundEmbedding?: string;
  namespace?: string;
  customModuleToggle?: string;
  
  // MCP 서버
  mcp?: { url: string };
}
```

### 6.3 로어북 엔트리

```typescript
interface LorebookEntry {
  key: string;              // 트리거 키워드 (쉼표 구분)
  secondkey: string;        // 보조 키워드
  comment: string;          // 표시 이름
  content: string;          // 실제 내용
  
  order: number;            // 우선순위
  position: number;         // 삽입 위치
  depth: number;            // 채팅 깊이
  
  selective: boolean;       // secondkey 필요 여부
  disable: boolean;         // 비활성화
  
  scanDepth?: number;
  caseSensitive?: boolean;
  alwaysActive?: boolean;
  vectorized?: boolean;
  
  extentions?: {
    risu_condition?: Condition[];
    risu_activationPercent?: number;
  };
}
```

### 6.4 정규식 스크립트

```typescript
interface RegexScript {
  comment: string;          // 이름
  type: 'editinput' | 'editoutput' | 'editdisplay' | 'edittrans';
  in: string;               // 정규식 패턴
  out: string;              // 치환 문자열
  flag?: string;            // 정규식 플래그
  aliasRecursive?: boolean;
}
```

### 6.5 트리거 스크립트

```typescript
interface TriggerScript {
  comment: string;
  type: 'start' | 'output' | 'input' | 'manual' | 'loading';
  conditions: TriggerCondition[];
  effect: TriggerEffect[];
}

interface TriggerCondition {
  type: 'always' | 'equals' | 'contains' | 'startswith' | 'endswith' | 
        'regexp' | 'exists' | 'notexists' | 'role';
  var?: string;
  value?: string;
  operator?: 'and' | 'or';
}

interface TriggerEffect {
  type: 'setvar' | 'addvar' | 'command' | 'sendas' | 'stop' | 
        'triggerlore' | 'runlua' | 'cbs' | 'goto';
  var?: string;
  value?: string;
}
```

---

## 7. 에셋 처리 전략

### 7.1 동일 이름 에셋 중복 문제

RisuAI는 랜덤 기능을 위해 **같은 이름의 에셋을 여러 개** 지원합니다.  
이 문제는 **모든 캐릭터 카드 포맷(PNG, CharX, CharX-JPEG)**에서 동일하게 발생합니다.

#### PNG 캐릭터 카드 (`__asset:N` URI)

```json
{
  "assets": [
    { "name": "fm3", "uri": "__asset:1", "ext": "png" },
    { "name": "fm3", "uri": "__asset:2", "ext": "png" },
    { "name": "fm3", "uri": "__asset:3", "ext": "png" }
  ]
}
```

#### CharX / CharX-JPEG (`embeded://` URI)

```json
{
  "assets": [
    { "name": "fm3", "uri": "embeded://assets/emotion/itype/fm3_v1.png", "ext": "png" },
    { "name": "fm3", "uri": "embeded://assets/emotion/itype/fm3_v2.png", "ext": "png" },
    { "name": "fm3", "uri": "embeded://assets/emotion/itype/fm3_v3.png", "ext": "png" }
  ]
}
```

두 경우 모두 `name` 필드가 동일하므로, 추출 시 파일명 충돌이 발생합니다.

### 7.2 해결책: ModuleManager 방식

파싱 시점에서 중복 이름에 `{{숫자}}` 접미사를 추가합니다:

```typescript
const nameCount = new Map<string, number>();

for (const asset of assets) {
  const baseKey = baseName.toLowerCase();
  const count = nameCount.get(baseKey) || 0;
  nameCount.set(baseKey, count + 1);
  
  if (count === 0) {
    fileName = `${baseName}.${ext}`;        // fm3.png
  } else {
    fileName = `${baseName}{{${count}}}.${ext}`;  // fm3{{1}}.png, fm3{{2}}.png
  }
}
```

### 7.3 확장자 중복 방지

이름에 이미 확장자가 포함된 경우 `name.png.png` 문제 방지:

```typescript
const KNOWN_EXTS = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'avif', 'svg',
                   'mp4', 'webm', 'mp3', 'wav', 'ogg',
                   'ttf', 'otf', 'woff', 'woff2', 'css'];

function splitNameAndExt(name: string): { base: string; ext: string } {
  const lastDot = name.lastIndexOf('.');
  if (lastDot > 0) {
    const possibleExt = name.substring(lastDot + 1).toLowerCase();
    if (KNOWN_EXTS.includes(possibleExt)) {
      return { base: name.substring(0, lastDot), ext: possibleExt };
    }
  }
  return { base: name, ext: '' };
}

// 사용
const { base, ext: nameExt } = splitNameAndExt(assetName);
const fileName = nameExt ? assetName : `${assetName}.${metaExt}`;
```

---

## 8. 구현 참조

### 8.1 RisuAI 원본 코드 분석 결과

#### CharX 내부 구조 (processzip.ts:150-155)
```
CharX files are ZIP archives containing:
- card.json: Character card data (CCv3 format)
- module.risum: Optional module data (scripts, lorebook)
- assets/*: Image and other asset files
```

#### 파일명 처리 (processzip.ts:371-376)
```typescript
if(fileName === 'card.json'){
    this.cardData = new TextDecoder().decode(assetData)
}
else if(fileName === 'module.risum'){
    this.moduleData = assetData
}
```

#### 모듈 바이너리 구조 (modules.ts:60-75)
```typescript
writeByte(111)              // magic number (0x6F)
writeByte(0)                // version
writeLength(mainbuf.length)
apb.append(mainbuf)         // RPack 인코딩된 JSON

for(asset of assets){
  writeByte(1)              // mark as asset
  // 에셋 데이터...
}

writeByte(0)                // end of file
```

#### 프리셋 암호화 (database.svelte.ts:2088-2097)
```typescript
const buf = fflate.compressSync(encodeMsgpack({
    presetVersion: 2,
    type: 'preset',
    preset: await encryptBuffer(
        encodeMsgpack(pres),
        'risupreset'
    )
}))
const buf2 = await encodeRPack(buf)  // .risup
```

### 8.2 참조 코드 목록

| 소스 | 위치 | 설명 |
|------|------|------|
| RisuAI | `src/ts/characterCards.ts` | 캐릭터 카드 익스포트 |
| RisuAI | `src/ts/process/processzip.ts` | CharX 파싱/익스포트 (CharXImporter, CharXWriter) |
| RisuAI | `src/ts/pngChunk.ts` | PNG tEXt 청크 처리 |
| RisuAI | `src/ts/process/modules.ts` | 모듈 파싱/익스포트 (exportModule, readModule) |
| RisuAI | `src/ts/storage/database.svelte.ts` | 프리셋 파싱/익스포트 (downloadPreset, importPreset) |
| RisuAI | `src/ts/rpack/rpack_bg.wasm` | RPack WASM |
| RisuExtractUtil | `src/` | Node.js 추출 유틸 |
| ModuleManager | `module-manager-v3_2.0.6.js` | 중복 에셋 처리 |
| AssetGod | `AssetGod_v3.js` | 확장자 분리 로직 |

### 8.3 Extract CLI 출력 파일명

RisuStudio Extract CLI는 포맷별로 다른 JSON 파일명을 사용합니다:

| 포맷 | 출력 파일명 | 비고 |
|------|-------------|------|
| `.charx` | `card.json` | RisuAI ZIP 내부 파일명과 동일 |
| `.png` / `.jpg` / `.jpeg` | `card.json` | CharX와 동일한 CCv3 형식 |
| `.risum` | `module.json` | 디코딩된 모듈 JSON |
| `.risup` / `.risupreset` | `preset.json` | 디코딩된 프리셋 JSON |

### 8.4 체리픽 문서

- [charx_cherrypick.md](reference/charx_cherrypick.md) - 캐릭터 카드 상세
- [risum_cherrypick.md](reference/risum_cherrypick.md) - 모듈 상세
- [risup_cherrypick.md](reference/risup_cherrypick.md) - 프리셋 상세

---

## 9. DSL (Domain Specific Language) 에디터

RisuStudio와 ModuleManager에서 사용하는 TOML 기반 DSL 에디터 형식입니다.

### 9.1 DSL 형식 개요

```toml
===
name = "항목 이름"
type = "항목 타입"
field = "인라인 값"
multilineField = '''
멀티라인
내용
'''

===
name = "다음 항목"
...
```

### 9.2 구문 요소

| 요소 | 형식 | 설명 |
|------|------|------|
| 구분자 | `===` | 각 항목의 시작 |
| 인라인 값 | `key = "value"` | 한 줄 문자열 |
| 멀티라인 값 | `key = '''...'''` | 여러 줄 문자열 |
| JSON 값 | `key = '[...]'` 또는 `key = '''[...]'''` | 조건/효과 배열 |

### 9.3 정규식 DSL ↔ JSON 매핑

**DSL 형식:**
```toml
===
name = "에셋"
type = "editdisplay"
pattern = "<img mps=\"(.*?)\">"
replace = '''
{{#if {{greater_equal::{{chat_index}}::{{? {{lastmessageid}}-5}}}}}}
<table class="asset-table">
  <tr>
    <td class="image-cell in-table">
      <img src="{{raw::$1.png}}" alt="$1.png">
    </td>
  </tr>
</table>
{{/if}}
'''
```

**JSON 형식:**
```json
{
  "comment": "에셋",
  "type": "editdisplay",
  "in": "<img mps=\"(.*?)\">",
  "out": "{{#if {{greater_equal::...}}}}\n<table class=\"asset-table\">...",
  "flag": "",
  "ableFlag": false
}
```

### 9.4 트리거 DSL ↔ JSON 매핑

**DSL 형식:**
```toml
===
name = "카운터"
type = "output"
active = "true"
lowLevelAccess = "false"
condition = '''
[{"type":"var","var":"enabled","operator":"=","value":"1"}]
'''
effect = '''
[{"type":"setvar","var":"count","value":"{{add::{{getvar::count}}::1}}","operator":"="}]
'''
```

**JSON 형식:**
```json
{
  "comment": "카운터",
  "type": "output",
  "conditions": [{"type":"var","var":"enabled","operator":"=","value":"1"}],
  "effect": [{"type":"setvar","var":"count","value":"{{add::{{getvar::count}}::1}}","operator":"="}]
}
```

### 9.5 구문 강조 규칙

| 요소 | 색상 | 설명 |
|------|------|------|
| `===` | 빨강 (#ff7b72) | 구분자 |
| `key` | 파랑 (#79c0ff) | 필드 이름 |
| `"..."` | 연파랑 (#a5d6ff) | 문자열 값 |
| `'''` | 초록 (#7ee787) | 멀티라인 따옴표 |
| `{{...}}` | 주황 (#ffa657) | 템플릿 변수 |

---

## 변경 이력

| 버전 | 날짜 | 설명 |
|------|------|------|
| 2.1.0 | 2026-01-25 | DSL 에디터 형식 문서화 추가 |
| 2.0.0 | 2026-01-25 | 실제 구현 테스트 완료, CharX-JPEG 추가, embeded:// URI 문서화 |
| 1.0.0 | 2026-01-24 | 초안 작성 |
