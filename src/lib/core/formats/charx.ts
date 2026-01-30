/**
 * charx Parser
 * .charx 파일 (ZIP 포맷) 파싱
 * 
 * 참조: RisuAI_Format_Specification.md, charx_cherrypick.md
 */

import { unzipSync, zipSync, strToU8, strFromU8 } from 'fflate';
import JSZip from 'jszip';
import type { CharacterCardV3, CharacterCard } from '../types/character';
import { logger } from '../logger';

/**
 * charx 파싱 결과
 */
export interface CharxResult {
  card: CharacterCardV3;
  assets: Map<string, Uint8Array>;
  raw: Record<string, Uint8Array>;
}

/**
 * charx 파싱 에러
 */
export class CharxParseError extends Error {
  constructor(message: string, public cause?: unknown) {
    super(message);
    this.name = 'CharxParseError';
  }
}

/**
 * ZIP 시그니처(PK) 위치 찾기
 * charx 파일이 JPEG/PNG 앞에 붙어있을 수 있음
 */
function findZipStart(data: Uint8Array): number {
  // ZIP 로컬 파일 헤더 시그니처: 0x504b0304 ("PK\x03\x04")
  for (let i = 0; i < data.length - 4; i++) {
    if (data[i] === 0x50 && data[i + 1] === 0x4b && 
        data[i + 2] === 0x03 && data[i + 3] === 0x04) {
      return i;
    }
  }
  return -1;
}

/**
 * .charx 파일 파싱
 * @param data charx 파일 바이트 데이터
 * @returns 파싱된 캐릭터 카드와 에셋
 */
export async function parseCharx(data: Uint8Array): Promise<CharxResult> {
  logger.debug('charx', '파싱 시작', { size: data.length });
  
  try {
    // ZIP 시그니처 위치 찾기 (JPEG/PNG + ZIP 형태 지원)
    let zipData = data;
    const zipStart = findZipStart(data);
    
    if (zipStart === -1) {
      throw new CharxParseError('Invalid charx: ZIP signature not found');
    }
    
    if (zipStart > 0) {
      logger.debug('charx', 'ZIP 시그니처 발견', { offset: zipStart });
      zipData = data.slice(zipStart);
    }
    
    // 동기 unzip 사용 (더 안정적)
    const files = unzipSync(zipData);
    
    logger.debug('charx', 'ZIP 해제 완료', { files: Object.keys(files) });
    
    // card.json 찾기
    const cardJsonData = files['card.json'];
    if (!cardJsonData) {
      logger.error('charx', 'card.json 없음');
      throw new CharxParseError('Invalid charx: card.json not found');
    }
    
    // JSON 파싱
    const cardJsonStr = strFromU8(cardJsonData);
    const card = JSON.parse(cardJsonStr) as CharacterCardV3;
        
    // spec 검증
    if (card.spec !== 'chara_card_v3') {
      logger.warn('charx', '예상과 다른 spec', { actual: card.spec });
    }
    
    // 에셋 추출
    const assets = new Map<string, Uint8Array>();
    for (const [path, fileData] of Object.entries(files)) {
      if (path !== 'card.json') {
        assets.set(path, fileData);
      }
    }
    
    logger.info('charx', '파싱 완료', {
      name: card.data?.name,
      assetsCount: assets.size
    });
    
    return {
      card,
      assets,
      raw: files
    };
  } catch (err) {
    logger.error('charx', '파싱 실패', { error: err });
    throw new CharxParseError('Failed to parse charx file', err);
  }
}

/**
 * .charx 파일 생성
 * @param card 캐릭터 카드
 * @param assets 에셋 맵 (경로 → 데이터)
 * @returns charx 파일 바이트 데이터
 */
export async function exportCharx(
  card: CharacterCardV3,
  assets: Map<string, Uint8Array> = new Map()
): Promise<Uint8Array> {
  logger.debug('charx', '내보내기 시작', { name: card.data?.name });
  
  try {
    const files: Record<string, Uint8Array> = {};
    
    // 순환 참조 제거를 위한 safe stringify
    const seen = new WeakSet();
    const cardJson = JSON.stringify(card, (key, value) => {
      // Uint8Array는 배열로 변환하지 않고 제외 (에셋 데이터)
      if (value instanceof Uint8Array) {
        return undefined;
      }
      // Map은 일반 객체로 변환
      if (value instanceof Map) {
        return Object.fromEntries(value);
      }
      // 순환 참조 감지
      if (typeof value === 'object' && value !== null) {
        if (seen.has(value)) {
          return undefined; // 순환 참조 제거
        }
        seen.add(value);
      }
      return value;
    }, 2);
    files['card.json'] = strToU8(cardJson);
    
    // 에셋 추가
    for (const [path, data] of assets) {
      // data가 객체인 경우 (AssetInfo) 실제 데이터 추출
      if (data instanceof Uint8Array) {
        files[path] = data;
      } else if (typeof data === 'object' && data !== null && 'data' in data) {
        const assetData = (data as any).data;
        if (assetData instanceof Uint8Array) {
          files[path] = assetData;
        }
      }
    }
    
    // 동기 zip 사용
    const zipData = zipSync(files);
    
    logger.info('charx', '내보내기 완료', { size: zipData.length });
    return zipData;
  } catch (err) {
    logger.error('charx', 'ZIP 생성 실패', { error: err });
    throw new CharxParseError('Failed to create charx zip', err);
  }
}

/**
 * 파일이 charx 포맷인지 확인 (ZIP 시그니처)
 */
export function isCharxFile(data: Uint8Array): boolean {
  // ZIP 매직 넘버: PK\x03\x04
  return data.length >= 4 &&
    data[0] === 0x50 &&
    data[1] === 0x4B &&
    data[2] === 0x03 &&
    data[3] === 0x04;
}

/**
 * 캐릭터 카드를 CCv3으로 정규화
 */
export function normalizeToV3(card: CharacterCard): CharacterCardV3 {
  if (card.spec === 'chara_card_v3') {
    return card;
  }
  
  // CCv2 → CCv3 변환
  const v2 = card;
  return {
    spec: 'chara_card_v3',
    spec_version: '3.0',
    data: {
      name: v2.data.name,
      description: v2.data.description,
      personality: v2.data.personality,
      scenario: v2.data.scenario,
      first_mes: v2.data.first_mes,
      mes_example: v2.data.mes_example,
      creator_notes: v2.data.creator_notes,
      system_prompt: v2.data.system_prompt,
      post_history_instructions: v2.data.post_history_instructions,
      alternate_greetings: v2.data.alternate_greetings,
      character_book: v2.data.character_book,
      tags: v2.data.tags,
      creator: v2.data.creator,
      character_version: v2.data.character_version,
      extensions: v2.data.extensions
    }
  };
}

/**
 * Base64 문자열을 Uint8Array로 디코딩 (Latin1 인코딩된 문자열 대응)
 */
function base64ToUint8Array(base64: string): Uint8Array {
  // atob()는 Latin1 문자열을 기대하므로 직접 변환
  const binaryStr = atob(base64);
  const bytes = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) {
    bytes[i] = binaryStr.charCodeAt(i);
  }
  return bytes;
}

/**
 * PNG 캐릭터 카드 파싱
 * PNG tEXt 청크에서 chara/ccv3 데이터 추출
 * V2, V3 모두 지원
 */
export async function parsePng(data: Uint8Array): Promise<CharxResult> {
  logger.debug('png', '파싱 시작', { size: data.length });
  
  // PNG 시그니쳐 확인
  const PNG_SIGNATURE = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];
  for (let i = 0; i < 8; i++) {
    if (data[i] !== PNG_SIGNATURE[i]) {
      throw new CharxParseError('Invalid PNG: bad signature');
    }
  }
  
  let pos = 8;
  let charaData: Uint8Array | null = null;  // Uint8Array로 변경
  let charaKeyword: string = '';
  const embeddedAssets = new Map<string, Uint8Array>();
  
  while (pos < data.length) {
    const length = (data[pos] << 24) | (data[pos+1] << 16) | (data[pos+2] << 8) | data[pos+3];
    pos += 4;
    
    const typeBytes = data.slice(pos, pos + 4);
    const type = String.fromCharCode(...typeBytes);
    pos += 4;
    
    if (type === 'tEXt') {
      const chunkData = data.slice(pos, pos + length);
      
      // null 바이트 찾기
      let nullPos = 0;
      while (nullPos < Math.min(chunkData.length, 70) && chunkData[nullPos] !== 0) nullPos++;
      
      if (nullPos < chunkData.length && chunkData[nullPos] === 0) {
        const keyword = new TextDecoder('latin1').decode(chunkData.slice(0, nullPos));
        const valueBytes = chunkData.slice(nullPos + 1);
        
        if (keyword === 'chara' || keyword === 'ccv3') {
          // ccv3가 있으면 우선 사용
          if (keyword === 'ccv3' || !charaData) {
            charaData = valueBytes;
            charaKeyword = keyword;
            logger.debug('png', `Found '${keyword}' chunk`, { size: valueBytes.length });
          }
        } else if (keyword.startsWith('chara-ext-asset_')) {
          const assetIndex = keyword.replace('chara-ext-asset_:', '').replace('chara-ext-asset_', '');
          // tEXt 청크의 값은 Latin1 인코딩된 Base64 문자열
          const base64Str = new TextDecoder('latin1').decode(valueBytes);
          try {
            const assetData = base64ToUint8Array(base64Str);
            embeddedAssets.set(assetIndex, assetData);
          } catch (e) {
            logger.warn('png', `에셋 디코딩 실패: ${assetIndex}`, { error: e });
          }
        }
      }
    }
    
    pos += length;
    pos += 4;  // CRC
    
    if (type === 'IEND') break;
  }
  
  if (!charaData) {
    throw new CharxParseError('Invalid PNG card: no chara/ccv3 tEXt chunk found');
  }
  
  logger.debug('png', `에셋 청크 로드 완료`, { count: embeddedAssets.size });
  
  // Base64 디코딩 - Latin1로 읽은 후 atob
  const base64Str = new TextDecoder('latin1').decode(charaData);
  const jsonBytes = base64ToUint8Array(base64Str);
  // UTF-8로 JSON 파싱
  const jsonStr = new TextDecoder('utf-8').decode(jsonBytes);
  const card = JSON.parse(jsonStr) as CharacterCardV3;
  
  // 에셋 매핑
  const assets = new Map<string, Uint8Array>();
  const nameCount = new Map<string, number>();
  
  // PNG 자체를 에셋으로 저장
  assets.set('card_image.png', data);
  
  // 유효한 확장자 목록
  const validExtensions = new Set([
    'png', 'jpg', 'jpeg', 'gif', 'webp', 'avif', 'bmp', 'svg',
    'mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a',
    'mp4', 'webm', 'mov', 'avi',
    'json', 'txt', 'md', 'html', 'css', 'js',
    'bin', 'dat', 'onnx', 'pth'
  ]);
  
  /**
   * 에셋 데이터에서 확장자 추정
   */
  function guessExtension(assetData: Uint8Array, fallbackExt: string): string {
    // fallbackExt가 유효한 확장자이면 그대로 사용
    if (fallbackExt && validExtensions.has(fallbackExt.toLowerCase())) {
      return fallbackExt.toLowerCase();
    }
    
    // Magic bytes로 확장자 추정
    if (assetData.length > 4) {
      // PNG
      if (assetData[0] === 0x89 && assetData[1] === 0x50 && assetData[2] === 0x4E && assetData[3] === 0x47) {
        return 'png';
      }
      // JPEG
      if (assetData[0] === 0xFF && assetData[1] === 0xD8 && assetData[2] === 0xFF) {
        return 'jpg';
      }
      // GIF
      if (assetData[0] === 0x47 && assetData[1] === 0x49 && assetData[2] === 0x46) {
        return 'gif';
      }
      // WebP (RIFF....WEBP)
      if (assetData[0] === 0x52 && assetData[1] === 0x49 && assetData[2] === 0x46 && assetData[3] === 0x46 &&
          assetData.length > 11 && assetData[8] === 0x57 && assetData[9] === 0x45 && assetData[10] === 0x42 && assetData[11] === 0x50) {
        return 'webp';
      }
      // MP3 (ID3 or 0xFF 0xFB)
      if ((assetData[0] === 0x49 && assetData[1] === 0x44 && assetData[2] === 0x33) ||
          (assetData[0] === 0xFF && (assetData[1] & 0xE0) === 0xE0)) {
        return 'mp3';
      }
      // OGG
      if (assetData[0] === 0x4F && assetData[1] === 0x67 && assetData[2] === 0x67 && assetData[3] === 0x53) {
        return 'ogg';
      }
      // WAV (RIFF....WAVE)
      if (assetData[0] === 0x52 && assetData[1] === 0x49 && assetData[2] === 0x46 && assetData[3] === 0x46 &&
          assetData.length > 11 && assetData[8] === 0x57 && assetData[9] === 0x41 && assetData[10] === 0x56 && assetData[11] === 0x45) {
        return 'wav';
      }
    }
    
    return 'bin';  // 알 수 없는 경우 기본값
  }
  
  // V3: card.data.assets에서 메타데이터 읽기
  const assetMeta = (card.data as any)?.assets as Array<{
    type: string;
    uri: string;
    name: string;
    ext: string;
  }> | undefined;
  
  if (assetMeta && assetMeta.length > 0) {
    logger.debug('png', 'V3 assets 처리', { count: assetMeta.length });
    for (const meta of assetMeta) {
      if (meta.uri.startsWith('__asset:')) {
        const assetIndex = meta.uri.replace('__asset:', '');
        const assetData = embeddedAssets.get(assetIndex);
        
        if (assetData) {
          const baseName = meta.name;
          const ext = guessExtension(assetData, meta.ext);
          const baseKey = baseName.toLowerCase();
          const count = nameCount.get(baseKey) || 0;
          nameCount.set(baseKey, count + 1);
          
          const assetName = count === 0 
            ? `${baseName}.${ext}` 
            : `${baseName}{{${count}}}.${ext}`;
          assets.set(assetName, assetData);
        }
      }
    }
  }
  
  // V2: data.extensions.risuai.additionalAssets 처리
  const risuai = (card.data as any)?.extensions?.risuai;
  if (risuai) {
    // additionalAssets: [name, uri, fileName?][]
    const additionalAssets = risuai.additionalAssets as [string, string, string?][] | undefined;
    if (additionalAssets && additionalAssets.length > 0) {
      logger.debug('png', 'V2 additionalAssets 처리', { count: additionalAssets.length });
      for (let i = 0; i < additionalAssets.length; i++) {
        const asset = additionalAssets[i];
        const name = asset[0];
        const uri = asset[1];
        const fileName = asset[2] || name;
        
        if (uri.startsWith('__asset:')) {
          const assetIndex = uri.replace('__asset:', '');
          const assetData = embeddedAssets.get(assetIndex);
          
          if (assetData) {
            const ext = guessExtension(assetData, '');
            
            const baseKey = name.toLowerCase();
            const count = nameCount.get(baseKey) || 0;
            nameCount.set(baseKey, count + 1);
            
            const assetName = count === 0 
              ? `${name}.${ext}` 
              : `${name}{{${count}}}.${ext}`;
            assets.set(assetName, assetData);
          }
        }
      }
    }
    
    // emotions: [name, uri][]
    const emotions = risuai.emotions as [string, string][] | undefined;
    if (emotions && emotions.length > 0) {
      logger.debug('png', 'V2 emotions 처리', { count: emotions.length });
      for (const emotion of emotions) {
        const name = emotion[0];
        const uri = emotion[1];
        
        if (uri.startsWith('__asset:')) {
          const assetIndex = uri.replace('__asset:', '');
          const assetData = embeddedAssets.get(assetIndex);
          
          if (assetData) {
            const ext = guessExtension(assetData, 'png');  // 이모션은 기본 png
            
            const baseKey = `emotion_${name}`.toLowerCase();
            const count = nameCount.get(baseKey) || 0;
            nameCount.set(baseKey, count + 1);
            
            const assetName = count === 0 
              ? `emotion_${name}.${ext}` 
              : `emotion_${name}{{${count}}}.${ext}`;
            assets.set(assetName, assetData);
          }
        }
      }
    }
  }
  
  logger.info('png', '파싱 완료', {
    name: card.data?.name,
    spec: card.spec,
    embeddedAssetChunks: embeddedAssets.size,
    assetsCount: assets.size
  });
  
  // 필요시 CCv3으로 정규화
  const normalizedCard = card.spec === 'chara_card_v3' ? card : normalizeToV3(card);
  
  return {
    card: normalizedCard,
    assets,
    raw: {}
  };
}

/**
 * JPEG 캐릭터 카드 (CharX-JPEG) 파싱
 * JPEG 뒤에 붙은 ZIP 데이터에서 추출
 */
export async function parseJpeg(data: Uint8Array): Promise<CharxResult> {
  logger.debug('jpeg', '파싱 시작', { size: data.length });
  
  // JPEG 시그니쳐 확인
  if (!(data[0] === 0xFF && data[1] === 0xD8 && data[2] === 0xFF)) {
    throw new CharxParseError('Invalid JPEG: bad signature');
  }
  
  // ZIP 매직 넘버 찾기
  let zipStart = -1;
  for (let i = 0; i < data.length - 4; i++) {
    if (data[i] === 0x50 && data[i+1] === 0x4B && 
        data[i+2] === 0x03 && data[i+3] === 0x04) {
      zipStart = i;
      break;
    }
  }
  
  if (zipStart === -1) {
    throw new CharxParseError('Invalid CharX-JPEG: no ZIP data found after JPEG');
  }
  
  logger.debug('jpeg', 'ZIP 발견', { offset: zipStart });
  
  // JPEG 부분
  const jpegImage = data.slice(0, zipStart);
  
  // ZIP 부분을 charx로 파싱
  const zipData = data.slice(zipStart);
  const result = await parseCharx(zipData);
  
  // JPEG 이미지를 에셋으로 추가
  result.assets.set('card_image.jpg', jpegImage);
  
  logger.info('jpeg', '파싱 완료', {
    name: result.card.data?.name,
    assetsCount: result.assets.size
  });
  
  return result;
}

/**
 * PNG 파일인지 확인
 */
export function isPngFile(data: Uint8Array): boolean {
  return data.length >= 8 &&
    data[0] === 0x89 &&
    data[1] === 0x50 &&
    data[2] === 0x4E &&
    data[3] === 0x47;
}

/**
 * JPEG 파일인지 확인
 */
export function isJpegFile(data: Uint8Array): boolean {
  return data.length >= 3 &&
    data[0] === 0xFF &&
    data[1] === 0xD8 &&
    data[2] === 0xFF;
}
