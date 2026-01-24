import { describe, it, expect } from 'vitest';
import { rpackEncode, rpackDecode } from '../src/lib/core/formats/rpack';

describe('RPack Codec', () => {
  it('should encode and decode simple string', () => {
    const original = 'Hello, World!';
    const encoded = rpackEncode(new TextEncoder().encode(original));
    const decoded = rpackDecode(encoded);
    expect(new TextDecoder().decode(decoded)).toBe(original);
  });

  it('should handle empty input', () => {
    const original = new Uint8Array(0);
    const encoded = rpackEncode(original);
    const decoded = rpackDecode(encoded);
    expect(decoded.length).toBe(0);
  });

  it('should handle binary data', () => {
    const original = new Uint8Array([0, 1, 2, 255, 254, 253, 128, 127]);
    const encoded = rpackEncode(original);
    const decoded = rpackDecode(encoded);
    expect(decoded).toEqual(original);
  });

  it('should handle large data', () => {
    const size = 100000;
    const original = new Uint8Array(size);
    for (let i = 0; i < size; i++) {
      original[i] = i % 256;
    }
    const encoded = rpackEncode(original);
    const decoded = rpackDecode(encoded);
    expect(decoded).toEqual(original);
  });

  it('should be deterministic', () => {
    const data = new TextEncoder().encode('Test data for encoding');
    const encoded1 = rpackEncode(data);
    const encoded2 = rpackEncode(data);
    expect(encoded1).toEqual(encoded2);
  });
});
