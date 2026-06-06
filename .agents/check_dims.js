const fs = require('fs');
const path = require('path');

function getPngDimensions(buffer) {
  const width = buffer.readInt32BE(16);
  const height = buffer.readInt32BE(20);
  return { width, height };
}

function getJpgDimensions(buffer) {
  if (buffer[0] !== 0xff || buffer[1] !== 0xd8) {
    return { width: 0, height: 0 };
  }
  let offset = 2;
  while (offset < buffer.length) {
    if (buffer[offset] !== 0xff) {
      offset++;
      continue;
    }
    while (buffer[offset] === 0xff) {
      offset++;
    }
    const marker = buffer[offset];
    offset++;
    
    if (marker === 0xd9 || marker === 0x00) {
      break;
    }
    if (marker >= 0xd0 && marker <= 0xd7) {
      continue;
    }
    
    const length = buffer.readUInt16BE(offset);
    if (marker === 0xc0 || marker === 0xc2) {
      const height = buffer.readUInt16BE(offset + 3);
      const width = buffer.readUInt16BE(offset + 5);
      return { width, height };
    }
    offset += length;
  }
  return { width: 0, height: 0 };
}

const dir = 'C:/Users/Navee/.gemini/antigravity-ide/brain/8a643d49-44a4-4c56-8a6b-f70fcc113d0c';
const files = fs.readdirSync(dir).filter(f => f.startsWith('media__'));

files.forEach(f => {
  const filepath = path.join(dir, f);
  const buffer = fs.readFileSync(filepath);
  let dims = { width: 0, height: 0 };
  const ext = path.extname(f).toLowerCase();
  if (ext === '.png') {
    dims = getPngDimensions(buffer);
  } else if (ext === '.jpg' || ext === '.jpeg') {
    dims = getJpgDimensions(buffer);
  }
  console.log(`${f}: width=${dims.width}, height=${dims.height}, ratio=${(dims.width / dims.height).toFixed(3)}`);
});
