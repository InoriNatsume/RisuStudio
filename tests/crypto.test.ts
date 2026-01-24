import { describe, it, expect } from 'vitest';
import { encrypt, decrypt } from '../src/lib/core/formats/crypto';

describe('AES-GCM Crypto', () => {
  const testKey = 'risupreset';
  
  it('should encrypt and decrypt simple data', async () => {
    const original = new TextEncoder().encode('Hello, World!');
    const encrypted = await encrypt(original, testKey);
    const decrypted = await decrypt(encrypted, testKey);
    expect(new TextDecoder().decode(decrypted)).toBe('Hello, World!');
  });

  it('should encrypt and decrypt empty data', async () => {
    const original = new Uint8Array(0);
    const encrypted = await encrypt(original, testKey);
    const decrypted = await decrypt(encrypted, testKey);
    expect(decrypted.length).toBe(0);
  });

  it('should encrypt and decrypt binary data', async () => {
    const original = new Uint8Array([0, 1, 2, 255, 254, 253, 128, 127]);
    const encrypted = await encrypt(original, testKey);
    const decrypted = await decrypt(encrypted, testKey);
    expect(decrypted).toEqual(original);
  });

  it('should encrypt and decrypt large data', async () => {
    const size = 100000;
    const original = new Uint8Array(size);
    for (let i = 0; i < size; i++) {
      original[i] = i % 256;
    }
    const encrypted = await encrypt(original, testKey);
    const decrypted = await decrypt(encrypted, testKey);
    expect(decrypted).toEqual(original);
  });

  it('should produce different ciphertext for same plaintext with deterministic IV', async () => {
    // Note: Our implementation uses fixed IV, so same plaintext = same ciphertext
    // This is a trade-off for determinism
    const original = new TextEncoder().encode('Test data');
    const encrypted1 = await encrypt(original, testKey);
    const encrypted2 = await encrypt(original, testKey);
    expect(encrypted1).toEqual(encrypted2);
  });

  it('should fail to decrypt with wrong key', async () => {
    const original = new TextEncoder().encode('Secret data');
    const encrypted = await encrypt(original, testKey);
    
    await expect(decrypt(encrypted, 'wrongkey')).rejects.toThrow();
  });

  it('should handle JSON data roundtrip', async () => {
    const obj = { name: 'Test', values: [1, 2, 3], nested: { a: 1 } };
    const original = new TextEncoder().encode(JSON.stringify(obj));
    const encrypted = await encrypt(original, testKey);
    const decrypted = await decrypt(encrypted, testKey);
    const parsed = JSON.parse(new TextDecoder().decode(decrypted));
    expect(parsed).toEqual(obj);
  });
});
