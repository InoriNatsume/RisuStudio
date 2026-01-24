/**
 * charx Parser
 * .charx 파일 (ZIP 포맷) 파싱
 * 
 * 참조: RisuAI_Format_Specification.md, charx_cherrypick.md
 */

import { unzipSync, zipSync, strToU8, strFromU8 } from 'fflate';
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
 * .charx 파일 파싱
 * @param data charx 파일 바이트 데이터
 * @returns 파싱된 캐릭터 카드와 에셋
 */
export async function parseCharx(data: Uint8Array): Promise<CharxResult> {
  logger.debug('charx', '파싱 시작', { size: data.length });
  
  try {
    // 동기 unzip 사용 (더 안정적)
    const files = unzipSync(data);
    
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
    
    // card.json 추가
    const cardJson = JSON.stringify(card, null, 2);
    files['card.json'] = strToU8(cardJson);
    
    // 에셋 추가
    for (const [path, data] of assets) {
      files[path] = data;
    }
    
    // 동기 zip 사용
    const data = zipSync(files);
    
    logger.info('charx', '내보내기 완료', { size: data.length });
    return data;
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
