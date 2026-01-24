/**
 * risum Parser
 * .risum 모듈 파일 파싱
 * 
 * RisuAI 실제 바이너리 포맷:
 * - 매직 넘버: 0x6F (111)
 * - 버전: 0x00 (0)
 * - 메인 블록: uint32LE(length) + RPack(JSON)
 * - 에셋 블록: 0x01 + uint32LE(length) + RPack(data) (반복)
 * - EOF: 0x00
 * 
 * 참조: RisuAI src/ts/process/modules.ts
 */

import { rpackDecode, rpackEncode } from './rpack';
import { BinaryReader, BinaryWriter } from './binary';
import type { RisuModule } from '../types/module';
import { logger } from '../logger';

// RisuAI 실제 매직 넘버
const RISUM_MAGIC = 0x6F;  // 111
const RISUM_VERSION = 0x00;  // 0
const ASSET_MARKER = 0x01;  // 에셋 블록 마커
const EOF_MARKER = 0x00;    // EOF 마커

/**
 * risum 파싱 에러
 */
export class RisumParseError extends Error {
  constructor(message: string, public cause?: unknown) {
    super(message);
    this.name = 'RisumParseError';
  }
}

/**
 * risum 파싱 결과
 */
export interface RisumResult {
  module: RisuModule;
  assets: Uint8Array[];  // 에셋은 순서대로, module.assets[i]와 매핑
  version: number;
}

/**
 * 메인 블록 JSON 구조
 */
interface RisumMainBlock {
  type: 'risuModule';
  module: RisuModule;
}

/**
 * .risum 파일 파싱
 * @param data risum 파일 바이트 데이터
 * @returns 파싱된 모듈과 에셋
 */
export function parseRisum(data: Uint8Array): RisumResult {
  logger.debug('risum', '파싱 시작', { size: data.length });
  
  if (data.length < 6) {
    throw new RisumParseError('File too small');
  }
  
  const reader = new BinaryReader(data);
  
  // 매직 넘버 확인
  const magic = reader.readUint8();
  if (magic !== RISUM_MAGIC) {
    throw new RisumParseError(`Invalid risum magic number: expected 0x6F (111), got 0x${magic.toString(16)} (${magic})`);
  }
  
  // 버전 확인
  const version = reader.readUint8();
  logger.debug('risum', '버전 확인', { version });
  
  if (version !== RISUM_VERSION) {
    logger.warn('risum', '예상과 다른 버전', { expected: RISUM_VERSION, actual: version });
  }
  
  // 메인 블록 읽기
  const mainLength = reader.readUint32();
  const mainBytes = reader.readBytes(mainLength);
  
  // RPack 디코딩
  const mainDecoded = rpackDecode(mainBytes);
  const mainStr = new TextDecoder('utf-8').decode(mainDecoded);
  
  let mainBlock: RisumMainBlock;
  try {
    mainBlock = JSON.parse(mainStr);
  } catch (e) {
    throw new RisumParseError('Failed to parse module JSON', e);
  }
  
  if (mainBlock.type !== 'risuModule') {
    throw new RisumParseError(`Invalid block type: expected 'risuModule', got '${mainBlock.type}'`);
  }
  
  const module = mainBlock.module;
  
  // 에셋 블록 읽기
  const assets: Uint8Array[] = [];
  
  while (reader.remaining > 0) {
    const marker = reader.readUint8();
    
    if (marker === EOF_MARKER) {
      // EOF 마커
      break;
    }
    
    if (marker !== ASSET_MARKER) {
      throw new RisumParseError(`Invalid asset marker: expected 0x01, got 0x${marker.toString(16)}`);
    }
    
    // 에셋 데이터 읽기
    const assetLength = reader.readUint32();
    const assetBytes = reader.readBytes(assetLength);
    
    // RPack 디코딩
    const assetDecoded = rpackDecode(assetBytes);
    assets.push(assetDecoded);
  }
  
  logger.info('risum', '파싱 완료', {
    name: module.name,
    assetsCount: assets.length,
    lorebookCount: module.lorebook?.length ?? 0,
    regexCount: module.regex?.length ?? 0,
    triggerCount: module.trigger?.length ?? 0
  });
  
  return { module, assets, version };
}

/**
 * .risum 파일 생성
 * @param module 모듈 데이터
 * @param assets 에셋 배열 (module.assets와 순서 매핑)
 * @returns risum 파일 바이트 데이터
 */
export function exportRisum(
  module: RisuModule,
  assets: Uint8Array[] = []
): Uint8Array {
  logger.debug('risum', '내보내기 시작', { name: module.name });
  
  const writer = new BinaryWriter();
  
  // 매직 넘버
  writer.writeUint8(RISUM_MAGIC);
  
  // 버전
  writer.writeUint8(RISUM_VERSION);
  
  // 메인 블록
  const mainBlock: RisumMainBlock = {
    type: 'risuModule',
    module: module
  };
  const mainStr = JSON.stringify(mainBlock);
  const mainBytes = new TextEncoder().encode(mainStr);
  const mainEncoded = rpackEncode(mainBytes);
  
  writer.writeUint32(mainEncoded.length);
  writer.writeBytes(mainEncoded);
  
  // 에셋 블록
  for (const asset of assets) {
    writer.writeUint8(ASSET_MARKER);
    const assetEncoded = rpackEncode(asset);
    writer.writeUint32(assetEncoded.length);
    writer.writeBytes(assetEncoded);
  }
  
  // EOF 마커
  writer.writeUint8(EOF_MARKER);
  
  const result = writer.toBytes();
  
  logger.info('risum', '내보내기 완료', { size: result.length });
  
  return result;
}

/**
 * 파일이 risum 포맷인지 확인
 */
export function isRisumFile(data: Uint8Array): boolean {
  if (data.length < 6) return false;
  
  // 첫 바이트가 매직 넘버인지 확인
  return data[0] === RISUM_MAGIC && data[1] === RISUM_VERSION;
}

/**
 * 에셋을 ID 맵으로 변환
 * module.assets와 assets 배열을 매핑하여 ID → Uint8Array 맵 생성
 */
export function buildAssetMap(
  module: RisuModule,
  assets: Uint8Array[]
): Map<string, Uint8Array> {
  const map = new Map<string, Uint8Array>();
  
  if (!module.assets) return map;
  
  for (let i = 0; i < module.assets.length && i < assets.length; i++) {
    const [name, , ext] = module.assets[i];
    const id = `${name}.${ext}`;
    map.set(id, assets[i]);
  }
  
  return map;
}
