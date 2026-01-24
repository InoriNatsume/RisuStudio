import { describe, it, expect } from 'vitest';
import { BinaryReader, BinaryWriter } from '../src/lib/core/formats/binary';

describe('BinaryWriter', () => {
  it('should write uint8', () => {
    const writer = new BinaryWriter();
    writer.writeUint8(42);
    writer.writeUint8(255);
    writer.writeUint8(0);
    const result = writer.getBuffer();
    expect(result).toEqual(new Uint8Array([42, 255, 0]));
  });

  it('should write uint16 big endian', () => {
    const writer = new BinaryWriter();
    writer.writeUint16BE(0x1234);
    const result = writer.getBuffer();
    expect(result).toEqual(new Uint8Array([0x12, 0x34]));
  });

  it('should write uint32 little endian', () => {
    const writer = new BinaryWriter();
    writer.writeUint32LE(0x12345678);
    const result = writer.getBuffer();
    expect(result).toEqual(new Uint8Array([0x78, 0x56, 0x34, 0x12]));
  });

  it('should write string with length prefix', () => {
    const writer = new BinaryWriter();
    writer.writeString('Hi');
    const result = writer.getBuffer();
    // Length (4 bytes LE) + 'Hi' (2 bytes)
    expect(result).toEqual(new Uint8Array([2, 0, 0, 0, 72, 105]));
  });

  it('should write raw bytes', () => {
    const writer = new BinaryWriter();
    writer.writeBytes(new Uint8Array([1, 2, 3, 4, 5]));
    const result = writer.getBuffer();
    expect(result).toEqual(new Uint8Array([1, 2, 3, 4, 5]));
  });
});

describe('BinaryReader', () => {
  it('should read uint8', () => {
    const reader = new BinaryReader(new Uint8Array([42, 255, 0]));
    expect(reader.readUint8()).toBe(42);
    expect(reader.readUint8()).toBe(255);
    expect(reader.readUint8()).toBe(0);
  });

  it('should read uint16 big endian', () => {
    const reader = new BinaryReader(new Uint8Array([0x12, 0x34]));
    expect(reader.readUint16BE()).toBe(0x1234);
  });

  it('should read uint32 little endian', () => {
    const reader = new BinaryReader(new Uint8Array([0x78, 0x56, 0x34, 0x12]));
    expect(reader.readUint32LE()).toBe(0x12345678);
  });

  it('should read string with length prefix', () => {
    const reader = new BinaryReader(new Uint8Array([2, 0, 0, 0, 72, 105]));
    expect(reader.readString()).toBe('Hi');
  });

  it('should read bytes', () => {
    const reader = new BinaryReader(new Uint8Array([1, 2, 3, 4, 5]));
    const bytes = reader.readBytes(3);
    expect(bytes).toEqual(new Uint8Array([1, 2, 3]));
    expect(reader.readBytes(2)).toEqual(new Uint8Array([4, 5]));
  });

  it('should track position correctly', () => {
    const reader = new BinaryReader(new Uint8Array([1, 2, 3, 4, 5]));
    expect(reader.position).toBe(0);
    reader.readUint8();
    expect(reader.position).toBe(1);
    reader.readBytes(2);
    expect(reader.position).toBe(3);
  });

  it('should report remaining bytes', () => {
    const reader = new BinaryReader(new Uint8Array([1, 2, 3, 4, 5]));
    expect(reader.remaining).toBe(5);
    reader.readBytes(2);
    expect(reader.remaining).toBe(3);
  });
});

describe('BinaryWriter and BinaryReader roundtrip', () => {
  it('should roundtrip complex data', () => {
    const writer = new BinaryWriter();
    writer.writeUint8(42);
    writer.writeUint16BE(0x1234);
    writer.writeUint32LE(0x12345678);
    writer.writeString('Hello, World!');
    writer.writeBytes(new Uint8Array([1, 2, 3]));
    
    const data = writer.getBuffer();
    const reader = new BinaryReader(data);
    
    expect(reader.readUint8()).toBe(42);
    expect(reader.readUint16BE()).toBe(0x1234);
    expect(reader.readUint32LE()).toBe(0x12345678);
    expect(reader.readString()).toBe('Hello, World!');
    expect(reader.readBytes(3)).toEqual(new Uint8Array([1, 2, 3]));
  });
});
