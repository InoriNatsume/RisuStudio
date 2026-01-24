import { describe, it, expect } from 'vitest';
import { BinaryReader, BinaryWriter } from '../src/lib/core/formats/binary';

describe('BinaryWriter', () => {
  it('should write uint8', () => {
    const writer = new BinaryWriter();
    writer.writeUint8(42);
    writer.writeUint8(255);
    writer.writeUint8(0);
    const result = writer.toBytes();
    expect(result).toEqual(new Uint8Array([42, 255, 0]));
  });

  it('should write uint16 little endian (default)', () => {
    const writer = new BinaryWriter();
    writer.writeUint16(0x1234);
    const result = writer.toBytes();
    expect(result).toEqual(new Uint8Array([0x34, 0x12])); // LE
  });

  it('should write uint32 little endian (default)', () => {
    const writer = new BinaryWriter();
    writer.writeUint32(0x12345678);
    const result = writer.toBytes();
    expect(result).toEqual(new Uint8Array([0x78, 0x56, 0x34, 0x12])); // LE
  });

  it('should write string as raw bytes', () => {
    const writer = new BinaryWriter();
    writer.writeString('Hi');
    const result = writer.toBytes();
    // 'Hi' (2 bytes UTF-8)
    expect(result).toEqual(new Uint8Array([72, 105]));
  });

  it('should write raw bytes', () => {
    const writer = new BinaryWriter();
    writer.writeBytes(new Uint8Array([1, 2, 3, 4, 5]));
    const result = writer.toBytes();
    expect(result).toEqual(new Uint8Array([1, 2, 3, 4, 5]));
  });

  it('should auto-expand buffer when needed', () => {
    const writer = new BinaryWriter(4); // 작은 초기 크기
    for (let i = 0; i < 100; i++) {
      writer.writeUint8(i);
    }
    const result = writer.toBytes();
    expect(result.length).toBe(100);
    expect(result[0]).toBe(0);
    expect(result[99]).toBe(99);
  });
});

describe('BinaryReader', () => {
  it('should read uint8', () => {
    const reader = new BinaryReader(new Uint8Array([42, 255, 0]));
    expect(reader.readUint8()).toBe(42);
    expect(reader.readUint8()).toBe(255);
    expect(reader.readUint8()).toBe(0);
  });

  it('should read uint16 little endian (default)', () => {
    const reader = new BinaryReader(new Uint8Array([0x34, 0x12]));
    expect(reader.readUint16()).toBe(0x1234);
  });

  it('should read uint32 little endian (default)', () => {
    const reader = new BinaryReader(new Uint8Array([0x78, 0x56, 0x34, 0x12]));
    expect(reader.readUint32()).toBe(0x12345678);
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

  it('should seek to position', () => {
    const reader = new BinaryReader(new Uint8Array([10, 20, 30, 40, 50]));
    reader.seek(3);
    expect(reader.readUint8()).toBe(40);
    reader.seek(0);
    expect(reader.readUint8()).toBe(10);
  });

  it('should skip bytes', () => {
    const reader = new BinaryReader(new Uint8Array([10, 20, 30, 40, 50]));
    reader.skip(2);
    expect(reader.readUint8()).toBe(30);
  });
});

describe('BinaryWriter and BinaryReader roundtrip', () => {
  it('should roundtrip complex data', () => {
    const writer = new BinaryWriter();
    writer.writeUint8(42);
    writer.writeUint16(0x1234);
    writer.writeUint32(0x12345678);
    writer.writeBytes(new Uint8Array([1, 2, 3]));
    
    const data = writer.toBytes();
    const reader = new BinaryReader(data);
    
    expect(reader.readUint8()).toBe(42);
    expect(reader.readUint16()).toBe(0x1234);
    expect(reader.readUint32()).toBe(0x12345678);
    expect(reader.readBytes(3)).toEqual(new Uint8Array([1, 2, 3]));
  });

  it('should handle string with length prefix pattern', () => {
    // 문자열 길이 + 문자열 데이터 패턴
    const writer = new BinaryWriter();
    const str = 'Hello, World!';
    const strBytes = new TextEncoder().encode(str);
    writer.writeUint32(strBytes.length);
    writer.writeBytes(strBytes);
    
    const data = writer.toBytes();
    const reader = new BinaryReader(data);
    
    const length = reader.readUint32();
    const readBytes = reader.readBytes(length);
    const readStr = new TextDecoder().decode(readBytes);
    
    expect(readStr).toBe(str);
  });
});
