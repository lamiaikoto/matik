import fs from 'fs';
import zlib from 'zlib';

function crc32(buf) {
  let table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c;
  }
  let crc = 0 ^ (-1);
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xff];
  }
  return (crc ^ (-1)) >>> 0;
}

function makeChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  const body = Buffer.concat([typeBuf, data]);
  crcBuf.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crcBuf]);
}

function createPng(size) {
  const width = size;
  const height = size;

  // Raw RGBA scanlines: (width * 4 + 1) * height
  const rowBytes = width * 4 + 1;
  const raw = Buffer.alloc(rowBytes * height);

  const cx = width / 2;
  const cy = height / 2;
  const cornerR = width * 0.22;
  const boxMin = width * 0.04;
  const boxMax = width * 0.96;

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowBytes;
    raw[rowOffset] = 0; // Filter byte: None

    for (let x = 0; x < width; x++) {
      const p = rowOffset + 1 + x * 4;

      // Check rounded box boundary
      let inBox = false;
      const dx = Math.max(0, Math.max(boxMin + cornerR - x, x - (boxMax - cornerR)));
      const dy = Math.max(0, Math.max(boxMin + cornerR - y, y - (boxMax - cornerR)));
      if (dx * dx + dy * dy <= cornerR * cornerR) {
        inBox = true;
      }

      if (!inBox) {
        // Transparent
        raw[p] = 0;
        raw[p + 1] = 0;
        raw[p + 2] = 0;
        raw[p + 3] = 0;
        continue;
      }

      // Default Dark Slate Background (#0F172A)
      let r = 15, g = 23, b = 42, a = 255;

      // Subtle border
      const distFromCenter = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);

      // Gold stylized 'M'
      // Scale coordinates to 0..1 inside the icon
      const nx = x / width;
      const ny = y / height;

      // Check if pixel is part of the 'M' symbol
      // Left bar: nx between 0.22 and 0.32, ny between 0.28 and 0.74
      // Right bar: nx between 0.68 and 0.78, ny between 0.28 and 0.74
      // Left diagonal: from (0.27, 0.30) to (0.50, 0.58) with thickness ~ 0.08
      // Right diagonal: from (0.50, 0.58) to (0.73, 0.30)
      let inM = false;
      if (ny >= 0.28 && ny <= 0.74) {
        if (nx >= 0.22 && nx <= 0.32) inM = true;
        if (nx >= 0.68 && nx <= 0.78) inM = true;
      }

      // Left diagonal
      const d1 = Math.abs((ny - 0.28) - 1.2 * (nx - 0.26));
      if (ny >= 0.28 && ny <= 0.60 && nx >= 0.26 && nx <= 0.52 && d1 < 0.065) {
        inM = true;
      }

      // Right diagonal
      const d2 = Math.abs((ny - 0.28) - 1.2 * (0.74 - nx));
      if (ny >= 0.28 && ny <= 0.60 && nx >= 0.48 && nx <= 0.74 && d2 < 0.065) {
        inM = true;
      }

      // Green security badge at top right: (0.76, 0.26), radius 0.065
      const bdx = nx - 0.76;
      const bdy = ny - 0.26;
      const inBadge = (bdx * bdx + bdy * bdy) <= (0.065 * 0.065);

      if (inBadge) {
        // Emerald 500 (#10B981)
        r = 16; g = 185; b = 129; a = 255;
      } else if (inM) {
        // Amber gold (#F59E0B)
        // Add subtle vertical gradient
        const grad = (ny - 0.28) / 0.46;
        r = Math.round(252 - grad * 35);
        g = Math.round(211 - grad * 50);
        b = Math.round(77 - grad * 60);
        a = 255;
      }

      raw[p] = r;
      raw[p + 1] = g;
      raw[p + 2] = b;
      raw[p + 3] = a;
    }
  }

  // PNG Header
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8;  // bit depth
  ihdrData[9] = 6;  // RGBA
  ihdrData[10] = 0; // compression
  ihdrData[11] = 0; // filter
  ihdrData[12] = 0; // interlace
  const ihdr = makeChunk('IHDR', ihdrData);

  // IDAT
  const compressed = zlib.deflateSync(raw, { level: 9 });
  const idat = makeChunk('IDAT', compressed);

  // IEND
  const iend = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([sig, ihdr, idat, iend]);
}

if (!fs.existsSync('public')) {
  fs.mkdirSync('public', { recursive: true });
}

fs.writeFileSync('public/pwa-192x192.png', createPng(192));
fs.writeFileSync('public/pwa-512x512.png', createPng(512));
fs.writeFileSync('public/apple-touch-icon.png', createPng(180));
console.log('PWA PNG icons generated successfully!');
