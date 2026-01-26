const fs = require('fs');
const buf = fs.readFileSync('tests/test_file/79 image.jpeg');

// ZIP 시그니처 찾기 (PK\x03\x04)
const zipSignature = Buffer.from([0x50, 0x4B, 0x03, 0x04]);
let zipStart = -1;
for (let i = 0; i < buf.length - 4; i++) {
  if (buf[i] === 0x50 && buf[i+1] === 0x4B && buf[i+2] === 0x03 && buf[i+3] === 0x04) {
    zipStart = i;
    console.log('Found ZIP at offset:', zipStart);
    break;
  }
}

if (zipStart >= 0) {
  const zipData = buf.slice(zipStart);
  fs.writeFileSync('temp_extract.zip', zipData);
  console.log('ZIP saved to temp_extract.zip, size:', zipData.length);
  
  // JSZip으로 추출
  const JSZip = require('jszip');
  JSZip.loadAsync(zipData).then(async zip => {
    const files = Object.keys(zip.files);
    console.log('Files in ZIP:', files);
    
    // card.json 찾기
    const cardFile = files.find(f => f.includes('card.json'));
    if (cardFile) {
      const content = await zip.files[cardFile].async('string');
      const data = JSON.parse(content);
      const cardData = data.data || {};
      const risuExt = cardData.extensions?.risuai || {};
      console.log('\n=== risuai extension 모든 키 ===');
      console.log(Object.keys(risuExt));
      
      // 추가 데이터 확인
      console.log('\n=== additionalData 키 ===');
      console.log(Object.keys(risuExt.additionalData || {}));
    }
  });
}

