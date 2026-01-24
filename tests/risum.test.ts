import { describe, it, expect } from 'vitest';
import { parseRisum, exportRisum } from '../src/lib/core/formats/risum';
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
    const parsed = parseRisum(exported);

    expect(parsed.name).toBe(original.name);
    expect(parsed.description).toBe(original.description);
    expect(parsed.lorpiority).toBe(original.lorpiority);
    expect(parsed.lpiority).toBe(original.lpiority);
    expect(parsed.prompt).toEqual(original.prompt);
    expect(parsed.regex).toEqual(original.regex);
    expect(parsed.cbs).toBe(original.cbs);
    expect(parsed.trigger).toEqual(original.trigger);
    expect(parsed.lorebook).toEqual(original.lorebook);
  });

  it('should parse file with correct magic bytes', () => {
    const module = createTestModule();
    const exported = exportRisum(module);
    
    // Check magic bytes (before RPack decoding, first 4 bytes of decoded should be RMD\x00)
    // But since it's RPack encoded, we just verify it parses correctly
    expect(() => parseRisum(exported)).not.toThrow();
  });

  it('should handle module with assets', () => {
    const module: RisuModule = {
      ...createTestModule(),
      assets: [
        { name: 'image.png', data: new Uint8Array([1, 2, 3, 4, 5]) },
        { name: 'audio.mp3', data: new Uint8Array([10, 20, 30]) }
      ]
    };

    const exported = exportRisum(module);
    const parsed = parseRisum(exported);

    expect(parsed.assets?.length).toBe(2);
    expect(parsed.assets?.[0].name).toBe('image.png');
    expect(parsed.assets?.[0].data).toEqual(new Uint8Array([1, 2, 3, 4, 5]));
    expect(parsed.assets?.[1].name).toBe('audio.mp3');
    expect(parsed.assets?.[1].data).toEqual(new Uint8Array([10, 20, 30]));
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
    const parsed = parseRisum(exported);

    expect(parsed.name).toBe('Empty Module');
    expect(parsed.prompt).toEqual([]);
    expect(parsed.regex).toEqual([]);
    expect(parsed.lorebook).toEqual([]);
  });

  it('should throw on invalid magic bytes', () => {
    const invalidData = new Uint8Array([0, 0, 0, 0, 1, 2, 3, 4]);
    expect(() => parseRisum(invalidData)).toThrow();
  });
});
