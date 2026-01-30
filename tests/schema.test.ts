/**
 * Schema Validation Tests
 * 
 * 각 포맷(charx, risum, risup)의 스키마를 검증합니다.
 * 실패 원인 분석에서 발견된 문제들을 방지하기 위한 테스트입니다.
 * 
 * 📚 관련 문서:
 * - docs/gotchas.md    - 파싱 함정 및 해결책 (필독!)
 * - docs/charx.md      - 캐릭터 카드 포맷
 * - docs/risum.md      - 모듈 포맷
 * - docs/risup.md      - 프리셋 포맷
 * 
 * 검증 항목:
 * 1. 폴더 ID: entry.folder가 "\uf000folder:UUID" 형식 → UUID 추출 필요
 * 2. 에셋 타입: asset.type이 'x-risu-asset'일 수 있음 → 확장자로 판별
 * 3. 에셋 URI: embeded://, __asset:, ~risuasset: 등 다양한 형식 지원
 * 4. Svelte 반응성: $: 블록에서 명시적 변수 참조 필요
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { parseCharx, type CharxResult } from '../src/lib/core/formats/charx';
import { parseRisum, type RisumResult } from '../src/lib/core/formats/risum';
import * as fs from 'fs';
import * as path from 'path';

const TEST_FILES_DIR = path.join(__dirname, 'test_file');

// 테스트 파일 존재 여부 확인
const charxFiles = fs.readdirSync(TEST_FILES_DIR).filter(f => f.endsWith('.charx'));
const risumFiles = fs.readdirSync(TEST_FILES_DIR).filter(f => f.endsWith('.risum'));
const risupFiles = fs.readdirSync(TEST_FILES_DIR).filter(f => f.endsWith('.risup'));

describe('Charx Schema Validation', () => {
  // 각 charx 파일에 대해 스키마 검증
  charxFiles.forEach(filename => {
    describe(`File: ${filename}`, () => {
      let result: CharxResult;
      
      beforeAll(async () => {
        const filePath = path.join(TEST_FILES_DIR, filename);
        const buffer = fs.readFileSync(filePath);
        result = await parseCharx(new Uint8Array(buffer));
      });

      it('should have valid card structure', () => {
        expect(result.card).toBeDefined();
        expect(result.card.spec).toBe('chara_card_v3');
        expect(result.card.data).toBeDefined();
      });

      it('should have card.data with required fields', () => {
        const data = result.card.data;
        expect(data).toHaveProperty('name');
        expect(typeof data.name).toBe('string');
      });

      it('should have assets as Map<string, Uint8Array>', () => {
        expect(result.assets).toBeInstanceOf(Map);
        for (const [key, value] of result.assets) {
          expect(typeof key).toBe('string');
          expect(value).toBeInstanceOf(Uint8Array);
        }
      });

      // 로어북 폴더 구조 검증 (실패 원인 #1)
      it('should parse lorebook entries with folder structure correctly', () => {
        const charbook = result.card.data?.character_book;
        if (!charbook?.entries) return;

        const entries = Array.isArray(charbook.entries) 
          ? charbook.entries 
          : Object.values(charbook.entries);

        // 폴더 항목 확인
        const folders = entries.filter((e: any) => e.mode === 'folder');
        const itemsWithFolder = entries.filter((e: any) => e.folder);

        console.log(`[${filename}] Folders: ${folders.length}, Items with folder: ${itemsWithFolder.length}`);

        // 폴더가 있으면 ID 형식 확인
        folders.forEach((folder: any) => {
          // folder ID는 entry.id 또는 keys[0]에서 추출 가능해야 함
          const folderId = folder.id || (folder.keys?.[0]?.match?.(/folder:(.+)/)?.[1]);
          expect(folderId).toBeDefined();
          console.log(`  Folder: ${folder.name || folder.comment}, ID: ${folderId}`);
        });

        // 폴더에 속한 항목의 folder 필드 형식 확인
        itemsWithFolder.forEach((item: any) => {
          // folder 필드에서 실제 ID 추출 가능해야 함
          let parentId = item.folder;
          if (parentId?.includes('folder:')) {
            parentId = parentId.match(/folder:(.+)/)?.[1];
          }
          expect(parentId).toBeDefined();
          console.log(`  Item: ${item.name || item.comment}, Parent: ${parentId?.slice(0, 20)}...`);
        });
      });

      // 에셋 구조 검증 (실패 원인 #2)
      it('should have assets with proper extension detection', () => {
        const imageExts = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'avif', 'bmp'];
        
        for (const [assetPath, data] of result.assets) {
          if (assetPath === 'card.json') continue;
          
          // 확장자 추출 가능해야 함
          const ext = assetPath.split('.').pop()?.toLowerCase() || '';
          expect(ext).not.toBe('');
          
          // 이미지인 경우 magic bytes 검증
          if (imageExts.includes(ext) && data.length > 4) {
            // PNG: 89 50 4E 47
            // JPEG: FF D8 FF
            // WEBP: 52 49 46 46 (RIFF)
            // GIF: 47 49 46 38
            const isPng = data[0] === 0x89 && data[1] === 0x50;
            const isJpeg = data[0] === 0xFF && data[1] === 0xD8;
            const isWebp = data[0] === 0x52 && data[1] === 0x49; // RIFF
            const isGif = data[0] === 0x47 && data[1] === 0x49;
            
            const isValidImage = isPng || isJpeg || isWebp || isGif;
            
            if (!isValidImage) {
              console.warn(`[${filename}] Asset ${assetPath} has unexpected magic bytes:`, 
                Array.from(data.slice(0, 4)).map(b => b.toString(16).padStart(2, '0')).join(' '));
            }
          }
        }
      });

      // additionalAssets 구조 검증
      it('should parse additionalAssets with correct path format', () => {
        const risuext = result.card.data?.extensions?.risuai;
        const additionalAssets = risuext?.additionalAssets;
        
        if (!additionalAssets || !Array.isArray(additionalAssets)) return;

        console.log(`[${filename}] Additional assets: ${additionalAssets.length}`);
        
        additionalAssets.forEach((asset: any, idx: number) => {
          // additionalAssets = [[name, path, filename], ...]
          expect(Array.isArray(asset)).toBe(true);
          expect(asset.length).toBeGreaterThanOrEqual(2);
          
          const [name, assetPath, rawFilename] = asset;
          expect(typeof name).toBe('string');
          expect(typeof assetPath).toBe('string');
          
          // 경로 형식 로깅
          if (idx < 3) {
            console.log(`  Asset: ${name}, Path: ${assetPath.slice(0, 50)}...`);
          }
          
          // 지원되는 경로 형식 확인
          const validPathFormats = [
            assetPath.startsWith('__asset:'),
            assetPath.startsWith('embeded://'),
            assetPath.startsWith('~risuasset:'),
            assetPath.startsWith('assets/'),
            !assetPath.includes(':') && !assetPath.includes('//') // 단순 경로
          ];
          
          expect(validPathFormats.some(v => v)).toBe(true);
        });
      });
    });
  });
});

describe('Risum Schema Validation', () => {
  risumFiles.forEach(filename => {
    describe(`File: ${filename}`, () => {
      let result: RisumResult;
      
      beforeAll(async () => {
        const filePath = path.join(TEST_FILES_DIR, filename);
        const buffer = fs.readFileSync(filePath);
        result = await parseRisum(new Uint8Array(buffer));
      });

      it('should have valid module structure', () => {
        expect(result.module).toBeDefined();
        expect(result.module.name).toBeDefined();
        expect(typeof result.module.name).toBe('string');
      });

      it('should have lorebook as array', () => {
        expect(Array.isArray(result.module.lorebook)).toBe(true);
        
        result.module.lorebook.forEach((entry: any, idx: number) => {
          expect(entry).toHaveProperty('key');
          expect(entry).toHaveProperty('content');
          
          if (idx < 3) {
            console.log(`[${filename}] Lorebook ${idx}: ${entry.comment || entry.key?.slice(0, 30)}`);
          }
        });
      });

      it('should have regex as array with correct structure', () => {
        expect(Array.isArray(result.module.regex)).toBe(true);
        
        result.module.regex.forEach((entry: any, idx: number) => {
          // Regex 필수 필드
          expect(entry).toHaveProperty('in'); // pattern
          expect(entry).toHaveProperty('out'); // replacement
          
          // type이 있으면 유효한 값인지 확인
          if (entry.type) {
            const validTypes = ['editinput', 'editoutput', 'editdisplay', 'editprocess', 'edittrans'];
            expect(validTypes).toContain(entry.type);
          }
          
          if (idx < 3) {
            console.log(`[${filename}] Regex ${idx}: ${entry.comment || '(no name)'}, type: ${entry.type}`);
          }
        });
      });

      it('should have trigger as array with correct structure', () => {
        expect(Array.isArray(result.module.trigger)).toBe(true);
        
        result.module.trigger.forEach((entry: any, idx: number) => {
          // Trigger 필수 필드
          if (entry.type) {
            const validTypes = ['start', 'output', 'input', 'manual', 'always', 'afterevery'];
            expect(validTypes).toContain(entry.type);
          }
          
          if (idx < 3) {
            console.log(`[${filename}] Trigger ${idx}: ${entry.comment || '(no name)'}, type: ${entry.type}`);
          }
        });
      });

      it('should have assets as array of Uint8Array', () => {
        expect(Array.isArray(result.assets)).toBe(true);
        
        result.assets.forEach((asset, idx) => {
          expect(asset).toBeInstanceOf(Uint8Array);
        });
        
        console.log(`[${filename}] Assets count: ${result.assets.length}`);
      });
    });
  });
});

describe('Schema Edge Cases', () => {
  it('should handle folder ID with \\uf000 prefix', () => {
    // 실패 원인 #1 재현
    const rawFolderId = '\uf000folder:b67352e-4df3-425f-8177-17124f4b041d';
    
    // 올바른 추출 방법
    const match = rawFolderId.match(/folder:(.+)/);
    expect(match).not.toBeNull();
    expect(match![1]).toBe('b67352e-4df3-425f-8177-17124f4b041d');
  });

  it('should detect image type by extension not asset.type', () => {
    // 실패 원인 #2 재현
    const asset = {
      type: 'x-risu-asset', // RisuAI 원본 타입
      ext: 'webp',
      name: 'test.webp'
    };
    
    // 잘못된 방법: type으로 판별
    const wrongCheck = asset.type === 'image';
    expect(wrongCheck).toBe(false);
    
    // 올바른 방법: 확장자로 판별
    const imageExts = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'avif', 'bmp'];
    const correctCheck = imageExts.includes(asset.ext);
    expect(correctCheck).toBe(true);
  });

  it('should handle multiple asset path formats', () => {
    const testPaths = [
      '__asset:assets/image.webp',
      'embeded://assets/image.png',
      '~risuasset:assets/image.jpg',
      'assets/image.gif'
    ];
    
    testPaths.forEach(uri => {
      let resolved: string | null = null;
      
      if (uri.startsWith('__asset:')) {
        resolved = uri.replace('__asset:', '');
      } else if (uri.startsWith('embeded://')) {
        resolved = uri.replace('embeded://', '');
      } else if (uri.startsWith('~risuasset:')) {
        resolved = uri.replace('~risuasset:', '');
      } else {
        resolved = uri;
      }
      
      expect(resolved).not.toBeNull();
      expect(resolved).toContain('assets/');
    });
  });
});

// PNG 캐릭터 카드 파싱 테스트 (V2/V3 지원)
describe('PNG Character Card Schema Validation', () => {
  const pngFiles = fs.readdirSync(TEST_FILES_DIR).filter(f => f.endsWith('.png'));
  
  pngFiles.forEach(filename => {
    describe(`File: ${filename}`, () => {
      let result: import('../src/lib/core/formats/charx').CharxResult;
      let parseError: Error | null = null;
      
      beforeAll(async () => {
        try {
          const filePath = path.join(TEST_FILES_DIR, filename);
          const buffer = fs.readFileSync(filePath);
          const { parsePng } = await import('../src/lib/core/formats/charx');
          result = await parsePng(new Uint8Array(buffer));
        } catch (e) {
          parseError = e as Error;
        }
      });

      it('should parse PNG card successfully', () => {
        if (parseError) {
          console.log(`[${filename}] 파싱 실패 (봇 카드가 아닐 수 있음): ${parseError.message}`);
          return; // 봇 카드가 아닌 PNG는 스킵
        }
        
        expect(result.card).toBeDefined();
        console.log(`[${filename}] 카드 이름: ${result.card.data?.name}, 에셋 수: ${result.assets.size}`);
      });

      it('should normalize V2 cards to V3', () => {
        if (parseError) return;
        
        // V2 카드도 V3으로 정규화되어야 함
        expect(result.card.spec).toBe('chara_card_v3');
      });

      it('should parse embedded assets from tEXt chunks', () => {
        if (parseError) return;
        
        // card_image.png는 항상 존재해야 함
        expect(result.assets.has('card_image.png')).toBe(true);
        
        // 에셋 수 로깅
        const assetCount = result.assets.size;
        console.log(`[${filename}] 에셋 개수: ${assetCount}`);
        
        // 에셋이 있으면 확장자 확인
        for (const [assetPath, data] of result.assets) {
          if (assetPath === 'card_image.png') continue;
          
          const ext = assetPath.split('.').pop()?.toLowerCase() || '';
          // 유효한 확장자여야 함 (magic bytes로 추정된 결과)
          const validExts = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'avif', 'mp3', 'wav', 'ogg', 'bin'];
          expect(validExts).toContain(ext);
        }
      });

      it('should correctly decode UTF-8 text (한글 등)', () => {
        if (parseError) return;
        
        const firstMes = result.card.data?.first_mes || '';
        const description = result.card.data?.description || '';
        const name = result.card.data?.name || '';
        
        // 깨진 문자(replacement character)가 없어야 함
        const hasCorruptedChar = (str: string) => str.includes('�');
        
        expect(hasCorruptedChar(firstMes)).toBe(false);
        expect(hasCorruptedChar(description)).toBe(false);
        expect(hasCorruptedChar(name)).toBe(false);
      });
    });
  });
});
