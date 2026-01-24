/**
 * risup/risupreset Parser
 * .risup / .risupreset 프리셋 파일 파싱
 * 
 * 처리 체인:
 * - risup:      file → RPack → fflate → MsgPack(컨테이너) → AES복호화 → MsgPack → Preset
 * - risupreset: file → fflate → MsgPack(컨테이너) → AES복호화 → MsgPack → Preset
 * 
 * 참조: RisuAI_Format_Specification.md, risup_cherrypick.md
 */

import { decompressSync, compressSync } from 'fflate';
import { unpack, pack } from 'msgpackr';
import { rpackDecode, rpackEncode } from './rpack';
import { decryptPreset, encryptPreset } from './crypto';
import type { RisuPreset, RisupFile } from '../types/preset';
import { logger } from '../logger';

/**
 * risup 파싱 에러
 */
export class RisupParseError extends Error {
  constructor(message: string, public cause?: unknown) {
    super(message);
    this.name = 'RisupParseError';
  }
}

/**
 * risup 파싱 결과
 */
export interface RisupResult {
  preset: RisuPreset;
  format: 'risup' | 'risupreset';
}

/**
 * 프리셋 컨테이너 타입
 */
interface PresetContainer {
  preset?: Uint8Array;
  pres?: Uint8Array;  // 레거시
  presetVersion?: number;
  type?: string;
}

/**
 * .risup 파일 파싱
 * 체인: RPack → fflate → MsgPack(컨테이너) → AES → MsgPack
 * 
 * @param data risup 파일 바이트 데이터
 * @returns 파싱된 프리셋
 */
export async function parseRisup(data: Uint8Array): Promise<RisupResult> {
  logger.debug('risup', '파싱 시작 (.risup)', { size: data.length });
  
  try {
    // 1. RPack 디코딩
    const rpackDecoded = rpackDecode(data);
    logger.debug('risup', 'RPack 디코딩 완료', { size: rpackDecoded.length });
    
    // 2. fflate 압축 해제
    const decompressed = decompressSync(rpackDecoded);
    logger.debug('risup', '압축 해제 완료', { size: decompressed.length });
    
    // 3. MsgPack 디코딩 (컨테이너)
    const container = unpack(decompressed) as PresetContainer;
    logger.debug('risup', 'MsgPack 디코딩 완료 (컨테이너)', { 
      hasPreset: !!container.preset,
      hasPres: !!container.pres,
      version: container.presetVersion 
    });
    
    // 4. 암호화된 데이터 추출
    const encrypted = container.preset || container.pres;
    if (!encrypted) {
      throw new Error('No encrypted preset data found in container');
    }
    
    // 5. AES-GCM 복호화
    const decrypted = await decryptPreset(encrypted);
    logger.debug('risup', 'AES 복호화 완료', { size: decrypted.length });
    
    // 6. MsgPack 디코딩 (프리셋 데이터)
    const preset = unpack(decrypted) as RisuPreset;
    
    logger.info('risup', '파싱 완료', { name: preset.name });
    
    return { preset, format: 'risup' };
  } catch (e) {
    logger.error('risup', '파싱 실패', { error: e });
    throw new RisupParseError('Failed to parse risup file', e);
  }
}

/**
 * .risupreset 파일 파싱 (레거시, RPack 없음)
 * 체인: fflate → MsgPack(컨테이너) → AES → MsgPack
 * 
 * @param data risupreset 파일 바이트 데이터
 * @returns 파싱된 프리셋
 */
export async function parseRisupreset(data: Uint8Array): Promise<RisupResult> {
  logger.debug('risup', '파싱 시작 (.risupreset)', { size: data.length });
  
  try {
    // 1. fflate 압축 해제
    const decompressed = decompressSync(data);
    logger.debug('risup', '압축 해제 완료', { size: decompressed.length });
    
    // 2. MsgPack 디코딩 (컨테이너)
    const container = unpack(decompressed) as PresetContainer;
    logger.debug('risup', 'MsgPack 디코딩 완료 (컨테이너)', { 
      hasPreset: !!container.preset,
      hasPres: !!container.pres,
      version: container.presetVersion 
    });
    
    // 3. 암호화된 데이터 추출
    const encrypted = container.preset || container.pres;
    if (!encrypted) {
      throw new Error('No encrypted preset data found in container');
    }
    
    // 4. AES-GCM 복호화
    const decrypted = await decryptPreset(encrypted);
    logger.debug('risup', 'AES 복호화 완료', { size: decrypted.length });
    
    // 5. MsgPack 디코딩 (프리셋 데이터)
    const preset = unpack(decrypted) as RisuPreset;
    
    logger.info('risup', '파싱 완료', { name: preset.name });
    
    return { preset, format: 'risupreset' };
  } catch (e) {
    logger.error('risup', '파싱 실패', { error: e });
    throw new RisupParseError('Failed to parse risupreset file', e);
  }
}

/**
 * .risup 파일 생성
 * 체인: Preset → MsgPack → AES → 컨테이너 → MsgPack → fflate → RPack
 * 
 * @param preset 프리셋 데이터
 * @returns risup 파일 바이트 데이터
 */
export async function exportRisup(preset: RisuPreset): Promise<Uint8Array> {
  logger.debug('risup', '내보내기 시작 (.risup)', { name: preset.name });
  
  try {
    // 1. MsgPack 인코딩 (프리셋)
    const presetPacked = pack(preset);
    
    // 2. AES-GCM 암호화
    const encrypted = await encryptPreset(presetPacked);
    
    // 3. 컨테이너 생성 및 MsgPack 인코딩
    const container: PresetContainer = {
      preset: encrypted,
      presetVersion: 2,
      type: 'preset'  // RisuAI 원본과 동일
    };
    const containerPacked = pack(container);
    
    // 4. fflate 압축
    const compressed = compressSync(containerPacked);
    
    // 5. RPack 인코딩
    const result = rpackEncode(compressed);
    
    logger.info('risup', '내보내기 완료', { size: result.length });
    
    return result;
  } catch (e) {
    logger.error('risup', '내보내기 실패', { error: e });
    throw new RisupParseError('Failed to export risup file', e);
  }
}

/**
 * .risupreset 파일 생성 (레거시)
 * 체인: Preset → MsgPack → AES → 컨테이너 → MsgPack → fflate
 * 
 * @param preset 프리셋 데이터
 * @returns risupreset 파일 바이트 데이터
 */
export async function exportRisupreset(preset: RisuPreset): Promise<Uint8Array> {
  logger.debug('risup', '내보내기 시작 (.risupreset)', { name: preset.name });
  
  try {
    // 1. MsgPack 인코딩 (프리셋)
    const presetPacked = pack(preset);
    
    // 2. AES-GCM 암호화
    const encrypted = await encryptPreset(presetPacked);
    
    // 3. 컨테이너 생성 및 MsgPack 인코딩
    const container: PresetContainer = {
      preset: encrypted,
      presetVersion: 2,
      type: 'preset'  // RisuAI 원본과 동일
    };
    const containerPacked = pack(container);
    
    // 4. fflate 압축
    const result = compressSync(containerPacked);
    
    logger.info('risup', '내보내기 완료', { size: result.length });
    
    return result;
  } catch (e) {
    logger.error('risup', '내보내기 실패', { error: e });
    throw new RisupParseError('Failed to export risupreset file', e);
  }
}

/**
 * 파일이 risup 포맷인지 확인
 * RPack 디코딩 후 fflate 시그니처 확인
 */
export function isRisupFile(data: Uint8Array): boolean {
  if (data.length < 2) return false;
  
  try {
    // RPack 디코딩 후 첫 바이트가 0x78 (zlib/deflate)인지 확인
    const decoded = rpackDecode(data.slice(0, 10));
    // DEFLATE raw 또는 zlib 헤더 확인
    return decoded[0] === 0x78 || (decoded[0] & 0x0F) === 0x08;
  } catch {
    return false;
  }
}

/**
 * 파일이 risupreset (레거시) 포맷인지 확인
 */
export function isRisupresetFile(data: Uint8Array): boolean {
  if (data.length < 2) return false;
  
  // 첫 바이트가 0x78 (zlib) 또는 deflate raw
  return data[0] === 0x78 || (data[0] & 0x0F) === 0x08;
}

/**
 * 프리셋 파일 자동 감지 및 파싱
 */
export async function parsePresetAuto(data: Uint8Array, fileName?: string): Promise<RisupResult> {
  // 확장자로 먼저 판단
  if (fileName) {
    if (fileName.endsWith('.risup')) {
      return parseRisup(data);
    }
    if (fileName.endsWith('.risupreset')) {
      return parseRisupreset(data);
    }
  }
  
  // 시그니처로 판단
  if (isRisupFile(data)) {
    return parseRisup(data);
  }
  
  if (isRisupresetFile(data)) {
    return parseRisupreset(data);
  }
  
  throw new RisupParseError('Unknown preset file format');
}
