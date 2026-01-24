#!/usr/bin/env npx tsx
/**
 * RisuStudio Extract CLI
 * .charx, .risum, .risup 파일을 파싱하여 폴더에 추출
 * 
 * 사용법:
 *   npm run extract -- <파일경로> [출력폴더]
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { unzipSync, decompressSync } from 'fflate';
import { decode as decodeMsgpack } from 'msgpackr';
import { fileURLToPath } from 'url';

// ESM에서 __dirname 대체
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============ WASM RPack ============
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

let WASM_VECTOR_LEN = 0;

function passArray8ToWasm0(arg: Uint8Array, malloc: any) {
  const ptr = malloc(arg.length * 1, 1) >>> 0;
  getUint8ArrayMemory0().set(arg, ptr / 1);
  WASM_VECTOR_LEN = arg.length;
  return ptr;
}

function getDataViewMemory0() {
  return new DataView(wasm.memory.buffer);
}

function getArrayU8FromWasm0(ptr: number, len: number) {
  ptr = ptr >>> 0;
  return getUint8ArrayMemory0().subarray(ptr / 1, ptr / 1 + len);
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

// ============ AES-GCM (RisuExtractUtil 방식) ============
async function decryptBuffer(data: Uint8Array, keys: string): Promise<Buffer> {
  const hash = crypto.createHash('sha256');
  hash.update(keys);
  const keyArray = hash.digest();
  
  const iv = Buffer.alloc(12, 0);
  
  const authTag = data.slice(data.length - 16);
  const ciphertext = data.slice(0, data.length - 16);
  
  const decipher = crypto.createDecipheriv('aes-256-gcm', keyArray, iv);
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(ciphertext);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  
  return decrypted;
}

// ============ 확장자 분리 (AssetGod 방식) ============
const KNOWN_EXTS = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'avif', 'svg', 'bmp',
                   'mp4', 'webm', 'mov', 'avi', 'mkv',
                   'mp3', 'wav', 'ogg', 'm4a', 'flac',
                   'ttf', 'otf', 'woff', 'woff2', 'css', 'json', 'txt'];

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

// ============ Binary Reader ============
class BinaryReader {
  private view: DataView;
  private pos = 0;

  constructor(data: Uint8Array) {
    this.view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  }

  get position() { return this.pos; }
  get remaining() { return this.view.byteLength - this.pos; }

  readBytes(length: number): Uint8Array {
    const result = new Uint8Array(this.view.buffer, this.view.byteOffset + this.pos, length);
    this.pos += length;
    return result;
  }

  readUint32(): number {
    const value = this.view.getUint32(this.pos, true);
    this.pos += 4;
    return value;
  }

  readString(): string {
    const length = this.readUint32();
    const bytes = this.readBytes(length);
    return new TextDecoder().decode(bytes);
  }
}

// ============ Parsers ============

interface ParseResult {
  type: 'charx' | 'risum' | 'risup' | 'png' | 'jpeg';
  json: any;
  assets: Map<string, Uint8Array>;
}

// ============ PNG Character Card Parser ============

function parsePngCharacterCard(data: Uint8Array): ParseResult {
  console.log('  Step 1: Reading PNG chunks...');
  
  // PNG 시그니쳐 확인
  const PNG_SIGNATURE = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];
  for (let i = 0; i < 8; i++) {
    if (data[i] !== PNG_SIGNATURE[i]) {
      throw new Error('Invalid PNG: bad signature');
    }
  }
  
  let pos = 8;  // 시그니쳐 뒤부터 시작
  let charaData: string | null = null;
  const foundChunks: string[] = [];
  const embeddedAssets = new Map<string, Uint8Array>();  // chara-ext-asset_ 청크들
  
  while (pos < data.length) {
    // 청크 구조: [4B length BE][4B type][length B data][4B CRC]
    const length = (data[pos] << 24) | (data[pos+1] << 16) | (data[pos+2] << 8) | data[pos+3];
    pos += 4;
    
    const typeBytes = data.slice(pos, pos + 4);
    const type = String.fromCharCode(...typeBytes);
    pos += 4;
    
    foundChunks.push(type);
    
    if (type === 'tEXt') {
      // tEXt 청크: keyword\0value
      const chunkData = data.slice(pos, pos + length);
      
      // null 바이트 찾기 (RisuAI는 70자까지만 검색)
      let nullPos = 0;
      while (nullPos < Math.min(chunkData.length, 70) && chunkData[nullPos] !== 0) nullPos++;
      
      if (nullPos < chunkData.length && chunkData[nullPos] === 0) {
        const keyword = new TextDecoder('latin1').decode(chunkData.slice(0, nullPos));
        const value = new TextDecoder('latin1').decode(chunkData.slice(nullPos + 1));
        
        if (keyword === 'chara' || keyword === 'ccv3') {
          charaData = value;
          console.log(`    Found '${keyword}' tEXt chunk (${value.length} bytes base64)`);
        } else if (keyword.startsWith('chara-ext-asset_')) {
          // 임베디드 에셋: chara-ext-asset_:0, chara-ext-asset_:1 등
          const assetIndex = keyword.replace('chara-ext-asset_:', '').replace('chara-ext-asset_', '');
          const assetData = Buffer.from(value, 'base64');
          embeddedAssets.set(assetIndex, assetData);
          console.log(`    Found embedded asset '${assetIndex}' (${assetData.length} bytes)`);
        }
      }
    }
    
    pos += length;  // 데이터 스킵
    pos += 4;       // CRC 스킵
    
    if (type === 'IEND') break;
  }
  
  console.log(`    Found ${foundChunks.length} chunks, ${embeddedAssets.size} embedded assets`);
  
  if (!charaData) {
    throw new Error('Invalid PNG character card: no chara/ccv3 tEXt chunk found');
  }
  
  console.log('  Step 2: Decoding base64...');
  const jsonStr = Buffer.from(charaData, 'base64').toString('utf-8');
  
  console.log('  Step 3: Parsing JSON...');
  const card = JSON.parse(jsonStr);
  
  // 에셋 매핑 (card.data.assets 참조)
  console.log('  Step 4: Mapping assets with duplicate handling...');
  const assets = new Map<string, Uint8Array>();
  const nameCount = new Map<string, number>();
  
  // PNG 자체를 에셋으로 저장 (캐릭터 이미지)
  assets.set('card_image.png', data);
  
  // card.data.assets에서 메타데이터 읽기
  const assetMeta = card.data?.assets as Array<{
    type: string;
    uri: string;
    name: string;
    ext: string;
  }> | undefined;
  
  if (assetMeta && assetMeta.length > 0) {
    for (const meta of assetMeta) {
      // __asset:1 형태에서 인덱스 추출
      let assetData: Uint8Array | undefined;
      
      if (meta.uri.startsWith('__asset:')) {
        const assetIndex = meta.uri.replace('__asset:', '');
        assetData = embeddedAssets.get(assetIndex);
      }
      
      if (!assetData) {
        console.log(`    Warning: Embedded asset not found for ${meta.uri}`);
        continue;
      }
      
      // 중복 이름 처리 (ModuleManager 방식)
      const baseName = meta.name;
      const ext = meta.ext || '';
      const baseKey = baseName.toLowerCase();
      const count = nameCount.get(baseKey) || 0;
      nameCount.set(baseKey, count + 1);
      
      let assetName: string;
      if (count === 0) {
        assetName = ext ? `${baseName}.${ext}` : baseName;
      } else {
        assetName = ext ? `${baseName}{{${count}}}.${ext}` : `${baseName}{{${count}}}`;
      }
      
      assets.set(assetName, assetData);
    }
  } else if (embeddedAssets.size > 0) {
    // 메타데이터 없으면 인덱스로 저장
    for (const [index, assetData] of embeddedAssets) {
      assets.set(`asset_${index}.bin`, assetData);
    }
  }
  
  console.log(`    Total assets: ${assets.size}`);
  
  return { type: 'png', json: card, assets };
}

function parseCharx(data: Uint8Array): ParseResult {
  console.log('  Step 1: Unzipping charx...');
  const files = unzipSync(data);
  
  const cardJsonData = files['card.json'];
  if (!cardJsonData) {
    throw new Error('Invalid charx: card.json not found');
  }
  
  console.log('  Step 2: Parsing card.json...');
  const card = JSON.parse(new TextDecoder().decode(cardJsonData));
  
  // charx 에셋 구조 분석
  // card.data.assets: [{ type, uri, name, ext }, ...]
  // uri가 "__asset:1" 형태면 ZIP 내 해당 파일 참조
  const assetMeta = card.data?.assets as Array<{
    type: string;
    uri: string;
    name: string;
    ext: string;
  }> | undefined;
  
  console.log('  Step 3: Mapping assets with duplicate handling...');
  const assets = new Map<string, Uint8Array>();
  const nameCount = new Map<string, number>();  // 중복 이름 카운트
  
  if (assetMeta && assetMeta.length > 0) {
    for (const meta of assetMeta) {
      let fileData: Uint8Array | undefined;
      
      if (meta.uri.startsWith('__asset:')) {
        // PNG 스타일: __asset:1 형태
        const assetPath = meta.uri.replace(':', '/');  // __asset:1 → __asset/1
        fileData = files[assetPath] || files[meta.uri];
        
        if (!fileData) {
          for (const [path, data] of Object.entries(files)) {
            if (path.includes(meta.uri.replace('__asset:', ''))) {
              fileData = data;
              break;
            }
          }
        }
      } else if (meta.uri.startsWith('embeded://')) {
        // charx/charxJpeg 스타일: embeded://assets/emotion/image/name.png
        const embedPath = meta.uri.replace('embeded://', '');
        fileData = files[embedPath];
        
        // 경로가 정확히 없으면 비슷한 것 찾기
        if (!fileData) {
          for (const [path, data] of Object.entries(files)) {
            if (path.endsWith(embedPath) || embedPath.endsWith(path)) {
              fileData = data;
              break;
            }
          }
        }
      } else if (meta.uri === 'ccdefault:') {
        // 기본 아이콘 - 스킵 (card_image로 대체됨)
        continue;
      }
      
      if (!fileData) {
        console.log(`    Warning: Asset not found for ${meta.uri}`);
        continue;
      }
      
      // 중복 이름 처리 (ModuleManager 방식)
      const baseName = meta.name;
      const ext = meta.ext || '';
      const baseKey = baseName.toLowerCase();
      const count = nameCount.get(baseKey) || 0;
      nameCount.set(baseKey, count + 1);
      
      let assetName: string;
      if (count === 0) {
        assetName = ext ? `${baseName}.${ext}` : baseName;
      } else {
        assetName = ext ? `${baseName}{{${count}}}.${ext}` : `${baseName}{{${count}}}`;
      }
      
      assets.set(assetName, fileData);
    }
  } else {
    // 메타데이터 없으면 ZIP 파일 그대로 사용
    for (const [filePath, fileData] of Object.entries(files)) {
      if (filePath !== 'card.json') {
        assets.set(filePath, fileData);
      }
    }
  }
  
  console.log(`    Total assets: ${assets.size}`);
  
  return { type: 'charx', json: card, assets };
}

async function parseRisum(data: Uint8Array): Promise<ParseResult> {
  console.log('  Step 1: Reading binary structure...');
  
  // risum은 전체가 RPack 인코딩되어 있지 않음!
  // 구조: [1B magic][1B version][4B mainLen][mainLen B RPack JSON][assets...]
  
  let pos = 0;
  
  const readByte = () => {
    return data[pos++];
  };
  
  const readUint32LE = () => {
    const value = data[pos] | (data[pos+1] << 8) | (data[pos+2] << 16) | (data[pos+3] << 24);
    pos += 4;
    return value >>> 0;
  };
  
  const readData = (len: number) => {
    const result = data.slice(pos, pos + len);
    pos += len;
    return result;
  };
  
  // Magic: 111 (0x6F, 'o')
  const magic = readByte();
  console.log(`    Magic: ${magic} (expected 111)`);
  if (magic !== 111) {
    throw new Error(`Invalid risum: bad magic ${magic} (expected 111)`);
  }
  
  // Version: 0
  const version = readByte();
  console.log(`    Version: ${version}`);
  if (version !== 0) {
    throw new Error(`Invalid risum: unsupported version ${version}`);
  }
  
  // Main data length
  const mainLen = readUint32LE();
  console.log(`    Main data length: ${mainLen}`);
  
  // Main data (RPack encoded JSON)
  const mainData = readData(mainLen);
  console.log('  Step 2: RPack decode main data...');
  const decodedMain = await decodeRPack(mainData);
  console.log(`    Decoded size: ${decodedMain.length}`);
  
  const mainJson = JSON.parse(Buffer.from(decodedMain).toString('utf-8')) as {
    type: string;
    module: any;
  };
  console.log(`    Type: ${mainJson.type}`);
  
  if (mainJson.type !== 'risuModule') {
    throw new Error(`Invalid risum: expected type 'risuModule', got '${mainJson.type}'`);
  }
  
  const json = mainJson.module;
  
  // Assets - 모듈의 assets 배열과 순서가 일치함
  // assets 구조: [name, path, extension][]
  const assetMeta = json.assets as [string, string, string][] | undefined;
  const assets = new Map<string, Uint8Array>();
  const nameCount = new Map<string, number>();  // 중복 이름 카운트 (ModuleManager 방식)
  let assetIndex = 0;
  
  console.log('  Step 3: Reading assets...');
  while (pos < data.length) {
    const mark = readByte();
    if (mark === 0) {
      console.log('    End marker found');
      break;
    }
    if (mark !== 1) {
      throw new Error(`Invalid asset mark: ${mark}`);
    }
    
    const assetLen = readUint32LE();
    const assetData = readData(assetLen);
    const decodedAsset = await decodeRPack(assetData);
    
    // 에셋 이름 결정 (확장자 중복 방지)
    let baseName = `asset_${assetIndex}`;
    let ext = '';
    if (assetMeta && assetMeta[assetIndex]) {
      const [name, , metaExt] = assetMeta[assetIndex];
      const parsed = splitNameAndExt(name);
      
      // 이름에 이미 확장자가 있으면 그대로, 없으면 메타 확장자 사용
      if (parsed.ext) {
        baseName = parsed.base;
        ext = parsed.ext;
      } else {
        baseName = name;
        ext = metaExt || '';
      }
    }
    
    // 중복 이름 처리 (ModuleManager 방식: {{숫자}} 접미사)
    const baseKey = baseName.toLowerCase();
    const count = nameCount.get(baseKey) || 0;
    nameCount.set(baseKey, count + 1);
    
    let assetName: string;
    if (count === 0) {
      // 첫 번째는 그대로
      assetName = ext ? `${baseName}.${ext}` : baseName;
    } else {
      // 중복은 {{숫자}} 접미사 (ModuleManager 스타일)
      assetName = ext ? `${baseName}{{${count}}}.${ext}` : `${baseName}{{${count}}}`;
    }
    
    assets.set(assetName, decodedAsset);
    assetIndex++;
  }
  console.log(`    Total assets: ${assets.size}`);
  
  return { type: 'risum', json, assets };
}

// ============ JPEG Character Card Parser (CharX-JPEG) ============

function parseJpegCharacterCard(data: Uint8Array): ParseResult {
  console.log('  Step 1: Finding ZIP data in JPEG...');
  
  // JPEG 시그니쳐 확인 (FF D8 FF)
  if (!(data[0] === 0xFF && data[1] === 0xD8 && data[2] === 0xFF)) {
    throw new Error('Invalid JPEG: bad signature');
  }
  
  // ZIP 매직 넘버 찾기 (PK\x03\x04)
  let zipStart = -1;
  for (let i = 0; i < data.length - 4; i++) {
    if (data[i] === 0x50 && data[i+1] === 0x4B && 
        data[i+2] === 0x03 && data[i+3] === 0x04) {
      zipStart = i;
      break;
    }
  }
  
  if (zipStart === -1) {
    throw new Error('Invalid CharX-JPEG: no ZIP data found after JPEG');
  }
  
  console.log(`    Found ZIP at offset ${zipStart}`);
  
  // JPEG 부분 (메인 이미지)
  const jpegImage = data.slice(0, zipStart);
  console.log(`    JPEG image: ${jpegImage.length} bytes`);
  
  // ZIP 부분을 charx로 파싱
  console.log('  Step 2: Parsing ZIP portion as charx...');
  const zipData = data.slice(zipStart);
  const charxResult = parseCharx(zipData);
  
  // JPEG 이미지를 에셋으로 추가 (캐릭터 메인 이미지)
  charxResult.assets.set('card_image.jpg', jpegImage);
  
  return { type: 'charx', json: charxResult.json, assets: charxResult.assets };
}

async function parseRisup(data: Uint8Array, isRisup: boolean = true): Promise<ParseResult> {
  let decodedData = data;
  
  if (isRisup) {
    console.log('  Step 1: RPack decode (WASM)...');
    decodedData = await decodeRPack(data);
    console.log(`    Decoded size: ${decodedData.length}`);
  }
  
  console.log('  Step 2: fflate decompressSync...');
  const decompressed = decompressSync(decodedData);
  console.log(`    Decompressed size: ${decompressed.length}`);
  
  console.log('  Step 3: MsgPack decode (container)...');
  const container = decodeMsgpack(decompressed) as {
    presetVersion: number;
    type: string;
    preset?: Uint8Array;
    pres?: Uint8Array;
  };
  console.log(`    Container: version=${container.presetVersion}, type=${container.type}`);
  
  const presetData = container.preset ?? container.pres;
  if (!presetData) {
    throw new Error('No preset/pres field in container');
  }
  console.log(`    Preset field size: ${presetData.length}`);
  
  console.log('  Step 4: AES-GCM decrypt...');
  const decrypted = await decryptBuffer(presetData, 'risupreset');
  console.log(`    Decrypted size: ${decrypted.length}`);
  
  console.log('  Step 5: MsgPack decode (preset)...');
  const json = decodeMsgpack(decrypted);
  
  return { type: 'risup', json, assets: new Map() };
}

// ============ Main ============

function getFileType(filename: string): string {
  const ext = path.extname(filename).toLowerCase().slice(1);
  if (ext === 'risupreset') return 'risupreset';
  return ext;
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 1) {
    console.log('사용법: npm run extract -- <파일경로> [출력폴더]');
    console.log('');
    console.log('예시:');
    console.log('  npm run extract -- test.charx');
    console.log('  npm run extract -- test.risum ./output');
    console.log('  npm run extract -- preset.risup');
    console.log('  npm run extract -- character.png');
    console.log('  npm run extract -- character.jpg');
    process.exit(1);
  }
  
  const inputFile = args[0];
  const outputDir = args[1] || path.join(
    path.dirname(inputFile), 
    path.basename(inputFile, path.extname(inputFile)) + '_extracted'
  );
  
  console.log(`📁 Input: ${inputFile}`);
  console.log(`📂 Output: ${outputDir}`);
  console.log('');
  
  // 파일 읽기
  const data = new Uint8Array(fs.readFileSync(inputFile));
  const fileType = getFileType(inputFile);
  
  console.log(`📄 Type: ${fileType}`);
  console.log(`📊 Size: ${(data.length / 1024 / 1024).toFixed(2)} MB`);
  console.log('');
  
  // 파싱
  let result: ParseResult;
  
  switch (fileType) {
    case 'charx':
      console.log('🔧 Parsing charx...');
      result = parseCharx(data);
      break;
    case 'risum':
      console.log('🔧 Parsing risum...');
      result = await parseRisum(data);
      break;
    case 'risup':
      console.log('🔧 Parsing risup...');
      result = await parseRisup(data, true);
      break;
    case 'risupreset':
      console.log('🔧 Parsing risupreset (legacy)...');
      result = await parseRisup(data, false);
      break;
    case 'png':
      console.log('🔧 Parsing PNG character card...');
      result = parsePngCharacterCard(data);
      break;
    case 'jpg':
    case 'jpeg':
      console.log('🔧 Parsing JPEG character card (CharX-JPEG)...');
      result = parseJpegCharacterCard(data);
      break;
    default:
      console.error(`❌ Unsupported file type: ${fileType}`);
      process.exit(1);
  }
  
  console.log('');
  console.log(`✅ Parsed successfully!`);
  console.log(`   Assets: ${result.assets.size}`);
  console.log('');
  
  // 출력 폴더 생성
  fs.mkdirSync(outputDir, { recursive: true });
  
  // JSON 저장
  const jsonPath = path.join(outputDir, 'data.json');
  fs.writeFileSync(jsonPath, JSON.stringify(result.json, null, 2), 'utf-8');
  console.log(`💾 Saved: data.json`);
  
  // 에셋 저장 (경로 기반 중복 방지 - AssetGod 방식)
  if (result.assets.size > 0) {
    const assetsDir = path.join(outputDir, 'assets');
    fs.mkdirSync(assetsDir, { recursive: true });
    
    const usedNames = new Map<string, number>();  // 이름 → 카운트
    
    for (const [assetPath, assetData] of result.assets) {
      // 안전한 파일명 생성
      let safeName = assetPath.replace(/\.\./g, '_').replace(/[<>:"|?*\\\/]/g, '_');
      const lowerName = safeName.toLowerCase();
      
      // 중복 이름 처리: 번호 접미사 (해시 계산 없이 O(1))
      const count = usedNames.get(lowerName) || 0;
      if (count > 0) {
        const ext = path.extname(safeName);
        const base = path.basename(safeName, ext);
        safeName = `${base}_${count}${ext}`;
      }
      usedNames.set(lowerName, count + 1);
      
      const fullPath = path.join(assetsDir, safeName);
      fs.writeFileSync(fullPath, assetData);
    }
    console.log(`💾 Saved: ${result.assets.size} assets to assets/`);
  }
  
  console.log('');
  console.log(`🎉 Done! Check ${outputDir}`);
}

main().catch(err => {
  console.error('❌ Error:', err.message);
  console.error(err.stack);
  process.exit(1);
});
