import { describe, it, expect } from 'vitest';
import { parseRisum, exportRisum, buildAssetMap } from '../src/lib/core/formats/risum';
import type { RisuModule } from '../src/lib/core/types/module';

describe('Risum Parser', () => {
  // Create a test module
  const createTestModule = (): RisuModule => ({
    name: 'Test Module',
    description: 'A test module for parsing',
    lorpiority: 10,
    lpiority: 20,
    prompt: [
      { type: 'plain', text: 'Hello world', role: 'system' }
    ],
    regex: [
      { find: '\\bfoo\\b', replace: 'bar', flag: 'g', isAffectPrompt: false }
    ],
    cbs: 'return "test";',
    trigger: [
      { type: 'output', regex: 'test', condition: 'equals', text: '{{value}}' }
    ],
    lorebook: [
      {
        key: 'test key',
        comment: 'Test entry',
        content: 'Test content',
        mode: 'normal',
        activationPercent: 0
      }
    ],
    assets: []
  });

  it('should export and parse module roundtrip', () => {
    const original = createTestModule();
    const exported = exportRisum(original);
    const result = parseRisum(exported);

    // parseRisum returns { module, assets, version }
    expect(result.module.name).toBe(original.name);
    expect(result.module.description).toBe(original.description);
    expect(result.module.lorpiority).toBe(original.lorpiority);
    expect(result.module.lpiority).toBe(original.lpiority);
    expect(result.module.prompt).toEqual(original.prompt);
    expect(result.module.regex).toEqual(original.regex);
    expect(result.module.cbs).toBe(original.cbs);
    expect(result.module.trigger).toEqual(original.trigger);
    expect(result.module.lorebook).toEqual(original.lorebook);
  });

  it('should parse file with correct magic bytes', () => {
    const module = createTestModule();
    const exported = exportRisum(module);
    
    // RisuAI 포맷: 매직 넘버 0x6F (111), 버전 0x00
    expect(exported[0]).toBe(0x6F);
    expect(exported[1]).toBe(0x00);
    
    expect(() => parseRisum(exported)).not.toThrow();
  });

  it('should handle module with assets', () => {
    // 모듈에 에셋 정보 추가
    const module = createTestModule();
    module.assets = [
      ['image', '', 'png'],
      ['audio', '', 'mp3']
    ];
    
    // 에셋 배열 (module.assets와 순서 매핑)
    const assets: Uint8Array[] = [
      new Uint8Array([1, 2, 3, 4, 5]),
      new Uint8Array([10, 20, 30])
    ];

    const exported = exportRisum(module, assets);
    const result = parseRisum(exported);

    // 에셋은 배열로 반환됨
    expect(result.assets.length).toBe(2);
    expect(result.assets[0]).toEqual(new Uint8Array([1, 2, 3, 4, 5]));
    expect(result.assets[1]).toEqual(new Uint8Array([10, 20, 30]));
    
    // buildAssetMap으로 ID 맵 생성
    const assetMap = buildAssetMap(result.module, result.assets);
    expect(assetMap.size).toBe(2);
    expect(assetMap.get('image.png')).toEqual(new Uint8Array([1, 2, 3, 4, 5]));
    expect(assetMap.get('audio.mp3')).toEqual(new Uint8Array([10, 20, 30]));
  });

  it('should handle empty arrays', () => {
    const module: RisuModule = {
      name: 'Empty Module',
      description: '',
      lorpiority: 0,
      lpiority: 0,
      prompt: [],
      regex: [],
      cbs: '',
      trigger: [],
      lorebook: [],
      assets: []
    };

    const exported = exportRisum(module);
    const result = parseRisum(exported);

    expect(result.module.name).toBe('Empty Module');
    expect(result.module.prompt).toEqual([]);
    expect(result.module.regex).toEqual([]);
    expect(result.module.lorebook).toEqual([]);
  });

  it('should throw on invalid magic bytes', () => {
    const invalidData = new Uint8Array([0, 0, 0, 0, 1, 2, 3, 4]);
    expect(() => parseRisum(invalidData)).toThrow();
  });

  it('should return version info', () => {
    const module = createTestModule();
    const exported = exportRisum(module);
    const result = parseRisum(exported);
    
    // RisuAI 포맷 버전은 0
    expect(result.version).toBe(0);
  });
});
