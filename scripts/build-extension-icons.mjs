// Generates capture-extension/icons/icon{16,48,128}.png at build time.
// Chrome Web Store review requires real icon files referenced in the
// manifest — hand-pasting binary PNG bytes is exactly the class of bug
// that corrupted the base64-embedded zip earlier, so this draws the icon
// programmatically (flat navy square + blocky white "F") and encodes a
// real PNG using only Node built-ins (zlib for IDAT deflate + CRC32).
// Deterministic, no dependency, safe under `npm ci`.
import { writeFileSync, mkdirSync } from 'node:fs'
import { deflateSync } from 'node:zlib'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(fileURLToPath(import.meta.url)) + '/..'
const outDir = join(root, 'capture-extension', 'icons')
mkdirSync(outDir, { recursive: true })

// Brand colors (src/index.css): --navy #1B2A4A, --teal #1D9E75
const NAVY = [0x1b, 0x2a, 0x4a]
const TEAL = [0x1d, 0x9e, 0x75]
const WHITE = [0xff, 0xff, 0xff]

// 16x16 design grid for a bold block "F": top bar, stem, middle bar.
const GRID = [
  '1111111111000000',
  '1111111111000000',
  '1100000000000000',
  '1100000000000000',
  '1100000000000000',
  '1111111100000000',
  '1111111100000000',
  '1100000000000000',
  '1100000000000000',
  '1100000000000000',
  '1100000000000000',
  '1100000000000000',
  '1100000000000000',
  '1100000000000000',
  '0000000000000000',
  '0000000000000000',
].map((row) => row.split('').map(Number))
const GRID_N = GRID.length

// ── CRC-32 (same table/algorithm as build-extension-zip.mjs) ──
const CRC_TABLE = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  return t
})()
function crc32(buf) {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii')
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length, 0)
  const crcBuf = Buffer.alloc(4)
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0)
  return Buffer.concat([len, typeBuf, data, crcBuf])
}

// Renders one corner-rounded-ish flat square: navy background, a thin teal
// inset border, and the white "F" mark mapped from the 16x16 design grid.
function renderPNG(size) {
  const px = (x, y) => {
    // Border ring (gives the flat square a tiny bit of depth at large sizes)
    const border = Math.max(1, Math.round(size * 0.05))
    const onBorder = x < border || y < border || x >= size - border || y >= size - border
    if (onBorder) return TEAL

    const gx = Math.min(GRID_N - 1, Math.floor((x / size) * GRID_N))
    const gy = Math.min(GRID_N - 1, Math.floor((y / size) * GRID_N))
    return GRID[gy][gx] ? WHITE : NAVY
  }

  const raw = Buffer.alloc((size * 4 + 1) * size) // +1 filter byte per scanline
  let offset = 0
  for (let y = 0; y < size; y++) {
    raw[offset++] = 0 // filter type: none
    for (let x = 0; x < size; x++) {
      const [r, g, b] = px(x, y)
      raw[offset++] = r
      raw[offset++] = g
      raw[offset++] = b
      raw[offset++] = 0xff // alpha
    }
  }

  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0) // width
  ihdr.writeUInt32BE(size, 4) // height
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // color type: RGBA
  ihdr[10] = 0 // compression
  ihdr[11] = 0 // filter
  ihdr[12] = 0 // interlace

  const idat = deflateSync(raw)
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

  return Buffer.concat([
    signature,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

for (const size of [16, 48, 128]) {
  const outFile = join(outDir, `icon${size}.png`)
  writeFileSync(outFile, renderPNG(size))
  console.log(`Wrote ${outFile} (${renderPNG(size).length} bytes)`)
}
