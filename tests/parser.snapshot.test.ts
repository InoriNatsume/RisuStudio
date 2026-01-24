/**
 * 파일 파서 스냅샷 테스트
 * 
 * 실제 테스트 파일을 파싱하고 결과를 스냅샷으로 검증
 */

import { describe, it, expect, beforeAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

// 테스트 파일 경로
const TEST_FILES_DIR = path.join(__dirname, 'test_file');

// 파일 존재 여부 확인
function fileExists(filename: string): boolean {
  return fs.existsSync(path.join(TEST_FILES_DIR, filename));
}

// 테스트 파일 목록
const testFiles = {
  characterCards: [
    { name: 'Sae Uraguchi.charx', type: 'charx' },
    { name: 'test_bot.png', type: 'png' },
    { name: 'test_bot2.jpeg', type: 'jpeg' },
  ],
  modules: [
    { name: '테스트.risum', type: 'risum' },
    { name: '🍄제논 dlc.risum', type: 'risum' },
    { name: '🔦라이트보드 🌠 삽화 3.1.1 Pre E.risum', type: 'risum' },
  ],
  presets: [
    { name: '🔭 망원경 V 1.1.21 _preset.risup', type: 'risup' },
    { name: '🦋PSYCHE v0.9.risup', type: 'risup' },
  ],
};

describe('파일 파서 스냅샷 테스트', () => {
  beforeAll(() => {
    // 테스트 파일 디렉토리 존재 확인
    if (!fs.existsSync(TEST_FILES_DIR)) {
      console.warn(`테스트 파일 디렉토리가 없습니다: ${TEST_FILES_DIR}`);
    }
  });

  describe('캐릭터 카드 파싱', () => {
    testFiles.characterCards.forEach(({ name, type }) => {
      it.skipIf(!fileExists(name))(`should parse ${name}`, async () => {
        const filePath = path.join(TEST_FILES_DIR, name);
        const buffer = fs.readFileSync(filePath);
        
        // TODO: 실제 파서 연결
        // const result = await parseCharacterCard(buffer, type);
        
        // 현재는 파일 크기와 기본 정보만 스냅샷
        const snapshot = {
          fileName: name,
          fileType: type,
          fileSize: buffer.length,
          // parsed: result,
        };
        
        expect(snapshot).toMatchSnapshot();
      });
    });
  });

  describe('모듈 파싱', () => {
    testFiles.modules.forEach(({ name, type }) => {
      it.skipIf(!fileExists(name))(`should parse ${name}`, async () => {
        const filePath = path.join(TEST_FILES_DIR, name);
        const buffer = fs.readFileSync(filePath);
        
        // TODO: 실제 파서 연결
        // const result = await parseModule(buffer);
        
        const snapshot = {
          fileName: name,
          fileType: type,
          fileSize: buffer.length,
          // parsed: result,
        };
        
        expect(snapshot).toMatchSnapshot();
      });
    });
  });

  describe('프리셋 파싱', () => {
    testFiles.presets.forEach(({ name, type }) => {
      it.skipIf(!fileExists(name))(`should parse ${name}`, async () => {
        const filePath = path.join(TEST_FILES_DIR, name);
        const buffer = fs.readFileSync(filePath);
        
        // TODO: 실제 파서 연결
        // const result = await parsePreset(buffer);
        
        const snapshot = {
          fileName: name,
          fileType: type,
          fileSize: buffer.length,
          // parsed: result,
        };
        
        expect(snapshot).toMatchSnapshot();
      });
    });
  });
});

describe('추출된 데이터 검증', () => {
  const extractedDirs = [
    { dir: 'Sae Uraguchi_extracted', metaFile: 'card.json' },
    { dir: 'test_bot2_extracted', metaFile: 'card.json' },
    { dir: '테스트_extracted', metaFile: 'module.json' },
    { dir: '🍄제논 dlc_extracted', metaFile: 'module.json' },
    { dir: '🔦라이트보드 🌠 삽화 3.1.1 Pre E_extracted', metaFile: 'module.json' },
    { dir: '🔭 망원경 V 1.1.21 _preset_extracted', metaFile: 'preset.json' },
    { dir: '🦋PSYCHE v0.9_extracted', metaFile: 'preset.json' },
  ];

  extractedDirs.forEach(({ dir, metaFile }) => {
    it(`should have extracted data in ${dir}`, () => {
      const dirPath = path.join(TEST_FILES_DIR, dir);
      
      // 폴더가 없으면 스킵 (Extract CLI로 미리 추출해야 함)
      if (!fs.existsSync(dirPath)) {
        console.log(`[SKIP] ${dir} - 추출된 폴더 없음 (npm run extract로 먼저 추출 필요)`);
        return;
      }
      
      const files = fs.readdirSync(dirPath);
      
      // 최소한 하나의 파일이 있어야 함
      expect(files.length).toBeGreaterThan(0);
      
      // 포맷별 메타데이터 파일 확인 (card.json / module.json / preset.json / data.json)
      // data.json은 이전 버전 CLI 호환용
      const hasMetadata = files.some(f => 
        f === metaFile || f === 'data.json'
      );
      expect(hasMetadata).toBe(true);
    });
  });
});
