/**
 * RPack Codec
 * RisuAI의 바이너리 압축 포맷
 * 
 * 참조: RisuAI_Format_Specification.md, risup_cherrypick.md
 * 원본 테이블: https://raw.githubusercontent.com/kwaroran/RisuAI/main/src/ts/rpack/rpack_map.bin
 */

/**
 * RPack 맵 테이블 (512 bytes = 256 encode + 256 decode)
 * Base64 인코딩된 원본 RisuAI 테이블
 */
const RPACK_MAP_B64 = `
xA0eC70rP1X8RW71ZlNPGuC7MJSGumu/QVBvm+/etxBhFyDfMomonW2ryZAADF2v0sFW5RZkkYJl
dJfKI9ZS0f+0oOgvilg4WmAZlknb18g7PkNLpWNHqmopkvQVz2I0eNMdPOIFjipXDhvNTC3yQCwl
eUgPsnq1p2w35px7VH7+h9yaAuQzouuxLgPdmaaw59WIGIN89r7hXJ/DIUYfCE7QdhJf7v2PROqj
XosoCTWeacwKx4UHrUrzd+ln1NqEgJO2TXP6JyZ/BMb78XI5UcI2qWis+O3FucvOdaQ9gdlCcByV
EbzYjJj5WaET9xR9s+xxwOON8AGuWzEGJCI6uCz3hIvJZfu2n66zAy0BaXQf5KPs7lw0IZNKD2ri
YgKeIpz9PPxxx8atWWcFcG2KRBL6JIZfr9F6R87+UGPdUQZvGOBSqAmdVnNMuFNsw6AOGc8+DX4H
MmhG6kj5mS6rpEkgXlU1OAy807FYFnkoChrh8s3EOduiumBydn2V73/IwN43lL+1FIGSJUWs5/Vm
pys2WsET40s66I2DG3wnsJpC64eq3FSOeCbSVynUt/gvj4l18EF3wh7/2BUR5QSXF/Mx0JsA18q0
Tyo72bJr2l2hPzBhvZE9Tubfvk2CjB0jEJhk9IUze5BDu6mI8dalHPbMbrlbC5bt1enFywimgEA=
`;

// Base64 디코딩 함수 (브라우저/Node 호환)
function base64Decode(b64: string): Uint8Array {
  const cleanB64 = b64.replace(/\s/g, '');
  if (typeof atob === 'function') {
    // 브라우저
    const binary = atob(cleanB64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  } else {
    // Node.js
    return new Uint8Array(Buffer.from(cleanB64, 'base64'));
  }
}

// 테이블 초기화
let encodeMap: Uint8Array;
let decodeMap: Uint8Array;

function initTables() {
  if (encodeMap && decodeMap) return;
  
  const mapData = base64Decode(RPACK_MAP_B64);
  if (mapData.length !== 512) {
    throw new Error(`Invalid RPack map size: ${mapData.length}, expected 512`);
  }
  encodeMap = mapData.slice(0, 256);
  decodeMap = mapData.slice(256, 512);
}

/**
 * RPack 인코딩 (바이트 변환)
 * @param data 원본 바이트 배열
 * @returns 인코딩된 바이트 배열
 */
export function rpackEncode(data: Uint8Array): Uint8Array {
  initTables();
  const result = new Uint8Array(data.length);
  for (let i = 0; i < data.length; i++) {
    result[i] = encodeMap[data[i]];
  }
  return result;
}

/**
 * RPack 디코딩 (역변환)
 * @param data 인코딩된 바이트 배열
 * @returns 디코딩된 바이트 배열
 */
export function rpackDecode(data: Uint8Array): Uint8Array {
  initTables();
  const result = new Uint8Array(data.length);
  for (let i = 0; i < data.length; i++) {
    result[i] = decodeMap[data[i]];
  }
  return result;
}

/**
 * RPack 테이블 검증 (디버깅용)
 */
export function validateRpackTable(): boolean {
  initTables();
  for (let i = 0; i < 256; i++) {
    const encoded = encodeMap[i];
    const decoded = decodeMap[encoded];
    if (decoded !== i) {
      console.error(`RPack table mismatch at index ${i}: encode=${encoded}, decode=${decoded}`);
      return false;
    }
  }
  return true;
}
