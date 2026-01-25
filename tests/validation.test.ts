/**
 * Validation Tests
 * 검증 모듈 테스트
 */

import { describe, it, expect } from 'vitest';
import {
  validateModule,
  validateCharacter,
  validatePreset,
  formatValidationResultText,
  type ValidationResult
} from '../src/lib/core/validation';

describe('validateModule', () => {
  it('should pass for valid module', () => {
    const module = {
      name: 'Test Module',
      description: 'Description',
      lorebook: [
        { _id: 'lore_1', comment: 'entry1', key: ['key1'] }
      ],
      regex: [
        { _id: 'regex_1', comment: 'regex1' }
      ],
      trigger: [
        { _id: 'trig_1', comment: 'trigger1', effect: [], conditions: [] }
      ],
      assets: [
        ['asset_1', 'path/to/file', 'png']
      ]
    };

    const result = validateModule(module);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should fail for null module', () => {
    const result = validateModule(null);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0].path).toBe('module');
  });

  it('should detect duplicate lorebook IDs', () => {
    const module = {
      name: 'Test',
      lorebook: [
        { _id: 'lore_dup', comment: 'entry1' },
        { _id: 'lore_dup', comment: 'entry2' }
      ]
    };

    const result = validateModule(module);
    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.message.includes('중복 ID'))).toBe(true);
  });

  it('should detect duplicate regex IDs', () => {
    const module = {
      name: 'Test',
      regex: [
        { _id: 'regex_dup', comment: 'regex1' },
        { _id: 'regex_dup', comment: 'regex2' }
      ]
    };

    const result = validateModule(module);
    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.message.includes('중복 ID'))).toBe(true);
  });

  it('should detect duplicate trigger IDs', () => {
    const module = {
      name: 'Test',
      trigger: [
        { _id: 'trig_dup', effect: [] },
        { _id: 'trig_dup', effect: [] }
      ]
    };

    const result = validateModule(module);
    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.message.includes('중복 ID'))).toBe(true);
  });

  it('should fail if lorebook is not array', () => {
    const module = {
      name: 'Test',
      lorebook: 'not an array'
    };

    const result = validateModule(module);
    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.path === 'lorebook')).toBe(true);
  });

  it('should fail if regex is not array', () => {
    const module = {
      name: 'Test',
      regex: { not: 'array' }
    };

    const result = validateModule(module);
    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.path === 'regex')).toBe(true);
  });

  it('should fail if trigger is not array', () => {
    const module = {
      name: 'Test',
      trigger: 123
    };

    const result = validateModule(module);
    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.path === 'trigger')).toBe(true);
  });

  it('should fail if trigger effect is not array', () => {
    const module = {
      name: 'Test',
      trigger: [
        { comment: 'trigger1', effect: 'not array' }
      ]
    };

    const result = validateModule(module);
    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.path.includes('effect'))).toBe(true);
  });

  it('should fail if trigger conditions is not array', () => {
    const module = {
      name: 'Test',
      trigger: [
        { comment: 'trigger1', conditions: { not: 'array' } }
      ]
    };

    const result = validateModule(module);
    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.path.includes('conditions'))).toBe(true);
  });

  it('should fail if assets is not array', () => {
    const module = {
      name: 'Test',
      assets: 'not array'
    };

    const result = validateModule(module);
    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.path === 'assets')).toBe(true);
  });

  it('should fail if asset item is not array', () => {
    const module = {
      name: 'Test',
      assets: [
        { id: 'asset_1', path: 'path' }
      ]
    };

    const result = validateModule(module);
    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.path === 'assets[0]')).toBe(true);
  });

  it('should warn if asset has insufficient elements', () => {
    const module = {
      name: 'Test',
      assets: [
        ['asset_1', 'path']  // missing ext
      ]
    };

    const result = validateModule(module);
    expect(result.isValid).toBe(true);  // warning only
    expect(result.warnings.some(e => e.path === 'assets[0]')).toBe(true);
  });

  it('should warn if name is missing', () => {
    const module = {
      lorebook: []
    };

    const result = validateModule(module);
    expect(result.isValid).toBe(true);  // warning only
    expect(result.warnings.some(e => e.path === 'name')).toBe(true);
  });
});

describe('validateCharacter', () => {
  it('should pass for valid character', () => {
    const char = {
      spec: 'chara_card_v3',
      name: 'Test Character',
      data: {
        name: 'Test Character',
        extensions: {
          risuai: {
            additionalAssets: [
              ['asset_1', 'path', 'png']
            ],
            regex: [],
            trigger: []
          }
        },
        character_book: {
          entries: []
        }
      }
    };

    const result = validateCharacter(char);
    expect(result.isValid).toBe(true);
  });

  it('should fail for null character', () => {
    const result = validateCharacter(null);
    expect(result.isValid).toBe(false);
  });

  it('should fail if name is missing', () => {
    const char = {
      spec: 'chara_card_v3',
      data: {}
    };

    const result = validateCharacter(char);
    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.path === 'name')).toBe(true);
  });

  it('should warn if spec is not chara_card_v3', () => {
    const char = {
      spec: 'chara_card_v2',
      name: 'Test'
    };

    const result = validateCharacter(char);
    expect(result.isValid).toBe(true);  // warning only
    expect(result.warnings.some(e => e.path === 'spec')).toBe(true);
  });

  it('should fail if additionalAssets is not array', () => {
    const char = {
      spec: 'chara_card_v3',
      name: 'Test',
      data: {
        extensions: {
          risuai: {
            additionalAssets: 'not array'
          }
        }
      }
    };

    const result = validateCharacter(char);
    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.path.includes('additionalAssets'))).toBe(true);
  });

  it('should fail if character_book.entries is not array', () => {
    const char = {
      spec: 'chara_card_v3',
      name: 'Test',
      data: {
        character_book: {
          entries: 'not array'
        }
      }
    };

    const result = validateCharacter(char);
    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.path.includes('character_book.entries'))).toBe(true);
  });

  it('should detect duplicate lorebook entry IDs', () => {
    const char = {
      spec: 'chara_card_v3',
      name: 'Test',
      data: {
        character_book: {
          entries: [
            { id: 1, keys: ['a'] },
            { id: 1, keys: ['b'] }
          ]
        }
      }
    };

    const result = validateCharacter(char);
    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.message.includes('중복 ID'))).toBe(true);
  });

  it('should fail if lorebook entry keys is not array', () => {
    const char = {
      spec: 'chara_card_v3',
      name: 'Test',
      data: {
        character_book: {
          entries: [
            { id: 1, keys: 'not array' }
          ]
        }
      }
    };

    const result = validateCharacter(char);
    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.path.includes('keys'))).toBe(true);
  });
});

describe('validatePreset', () => {
  it('should pass for valid preset', () => {
    const preset = {
      name: 'Test Preset',
      promptTemplate: [{ type: 'plain', text: 'Hello' }],
      maxContext: 8000,
      maxResponse: 2000
    };

    const result = validatePreset(preset);
    expect(result.isValid).toBe(true);
  });

  it('should fail for null preset', () => {
    const result = validatePreset(null);
    expect(result.isValid).toBe(false);
  });

  it('should warn if name is missing', () => {
    const preset = {
      maxContext: 8000
    };

    const result = validatePreset(preset);
    expect(result.isValid).toBe(true);
    expect(result.warnings.some(e => e.path === 'name')).toBe(true);
  });

  it('should fail if promptTemplate is not array', () => {
    const preset = {
      name: 'Test',
      promptTemplate: 'not array'
    };

    const result = validatePreset(preset);
    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.path === 'promptTemplate')).toBe(true);
  });

  it('should fail if maxContext is not number', () => {
    const preset = {
      name: 'Test',
      maxContext: '8000'
    };

    const result = validatePreset(preset);
    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.path === 'maxContext')).toBe(true);
  });

  it('should fail if maxResponse is not number', () => {
    const preset = {
      name: 'Test',
      maxResponse: '2000'
    };

    const result = validatePreset(preset);
    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.path === 'maxResponse')).toBe(true);
  });
});

describe('formatValidationResultText', () => {
  it('should show success for empty errors', () => {
    const result: ValidationResult = {
      errors: [],
      warnings: [],
      all: [],
      isValid: true,
      summary: { errorCount: 0, warningCount: 0 }
    };

    const text = formatValidationResultText(result);
    expect(text).toContain('검증 성공');
  });

  it('should format errors correctly', () => {
    const result: ValidationResult = {
      errors: [{ level: 'error', path: 'lorebook', message: 'test error' }],
      warnings: [],
      all: [{ level: 'error', path: 'lorebook', message: 'test error' }],
      isValid: false,
      summary: { errorCount: 1, warningCount: 0 }
    };

    const text = formatValidationResultText(result);
    expect(text).toContain('1개 오류');
    expect(text).toContain('[lorebook]');
    expect(text).toContain('test error');
  });

  it('should format warnings correctly', () => {
    const result: ValidationResult = {
      errors: [],
      warnings: [{ level: 'warning', path: 'name', message: 'test warning' }],
      all: [{ level: 'warning', path: 'name', message: 'test warning' }],
      isValid: true,
      summary: { errorCount: 0, warningCount: 1 }
    };

    const text = formatValidationResultText(result);
    expect(text).toContain('1개 경고');
    expect(text).toContain('[name]');
    expect(text).toContain('test warning');
  });
});
