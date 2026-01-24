/**
 * risum Parser
 * .risum 모듈 파일 파싱
 * 
 * 참조: RisuAI_Format_Specification.md, risum_cherrypick.md
 */

import { rpackDecode, rpackEncode } from './rpack';
import { BinaryReader, BinaryWriter } from './binary';
import type { RisuModule, RisumFile, ModuleAsset } from '../types/module';
import { logger } from '../logger';

// risum 매직 넘버: "RMD\x00"
const RISUM_MAGIC = new Uint8Array([0x52, 0x4D, 0x44, 0x00]);
const RISUM_VERSION = 1;

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
  assets: Map<string, Uint8Array>;
  version: number;
}

/**
 * .risum 파일 파싱
 * @param data risum 파일 바이트 데이터
 * @returns 파싱된 모듈과 에셋
 */
export function parseRisum(data: Uint8Array): RisumResult {
  logger.debug('risum', '파싱 시작', { size: data.length });
  
  // RPack 디코딩
  const decoded = rpackDecode(data);
  const reader = new BinaryReader(decoded);
  
  // 매직 넘버 확인
  const magic = reader.readBytes(4);
  if (!arrayEquals(magic, RISUM_MAGIC)) {
    throw new RisumParseError('Invalid risum magic number');
  }
  
  // 버전 확인
  const version = reader.readUint32();
  logger.debug('risum', '버전 확인', { version });
  
  if (version !== RISUM_VERSION) {
    logger.warn('risum', '예상과 다른 버전', { expected: RISUM_VERSION, actual: version });
  }
  
  // 모듈 JSON 길이
  const jsonLength = reader.readUint32();
  
  // 모듈 JSON 파싱
  const jsonBytes = reader.readBytes(jsonLength);
  const jsonStr = new TextDecoder('utf-8').decode(jsonBytes);
  
  let module: RisuModule;
  try {
    module = JSON.parse(jsonStr);
  } catch (e) {
    throw new RisumParseError('Failed to parse module JSON', e);
  }
  
  // 에셋 파싱
  const assets = new Map<string, Uint8Array>();
  const assetCount = reader.readUint32();
  
  logger.debug('risum', '에셋 파싱', { count: assetCount });
  
  for (let i = 0; i < assetCount; i++) {
    // 에셋 ID 길이 + 데이터
    const idLength = reader.readUint32();
    const idBytes = reader.readBytes(idLength);
    const assetId = new TextDecoder('utf-8').decode(idBytes);
    
    // 에셋 데이터 길이 + 데이터
    const dataLength = reader.readUint32();
    const assetData = reader.readBytes(dataLength);
    
    assets.set(assetId, assetData);
  }
  
  logger.info('risum', '파싱 완료', {
    name: module.name,
    assetsCount: assets.size,
    lorebookCount: module.lorebook?.length ?? 0,
    regexCount: module.regex?.length ?? 0,
    triggerCount: module.trigger?.length ?? 0
  });
  
  return { module, assets, version };
}

/**
 * .risum 파일 생성
 * @param module 모듈 데이터
 * @param assets 에셋 맵 (ID → 데이터)
 * @returns risum 파일 바이트 데이터
 */
export function exportRisum(
  module: RisuModule,
  assets: Map<string, Uint8Array> = new Map()
): Uint8Array {
  logger.debug('risum', '내보내기 시작', { name: module.name });
  
  const writer = new BinaryWriter();
  
  // 매직 넘버
  writer.writeBytes(RISUM_MAGIC);
  
  // 버전
  writer.writeUint32(RISUM_VERSION);
  
  // 모듈 JSON
  const jsonStr = JSON.stringify(module);
  const jsonBytes = new TextEncoder().encode(jsonStr);
  writer.writeUint32(jsonBytes.length);
  writer.writeBytes(jsonBytes);
  
  // 에셋 개수
  writer.writeUint32(assets.size);
  
  // 에셋 데이터
  for (const [id, data] of assets) {
    const idBytes = new TextEncoder().encode(id);
    writer.writeUint32(idBytes.length);
    writer.writeBytes(idBytes);
    writer.writeUint32(data.length);
    writer.writeBytes(data);
  }
  
  const result = writer.toBytes();
  
  // RPack 인코딩
  const encoded = rpackEncode(result);
  
  logger.info('risum', '내보내기 완료', { size: encoded.length });
  
  return encoded;
}

/**
 * 파일이 risum 포맷인지 확인
 */
export function isRisumFile(data: Uint8Array): boolean {
  if (data.length < 8) return false;
  
  // RPack 디코딩 후 매직 넘버 확인
  const decoded = rpackDecode(data.slice(0, 8));
  return arrayEquals(decoded.slice(0, 4), RISUM_MAGIC);
}

/**
 * 배열 비교 헬퍼
 */
function arrayEquals(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}
