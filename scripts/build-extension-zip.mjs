// Builds capture-extension/ into a zip. Two modes:
//   - default: public/fass-capture-extension.zip, files nested under a
//     `capture-extension/` folder — this is what the install page serves,
//     since "Load unpacked" needs a real folder to point at after unzip.
//   - FLAT=1: dist/fass-capture-extension-store.zip, manifest.json at the
//     zip ROOT with no parent folder and no dev docs — this is the exact
//     shape the Chrome Web Store dashboard requires for upload. Shipping
//     the wrong shape (nested folder) is a real Web Store rejection, not
//     just a style nit, so it's a separate explicit mode rather than a
//     guess baked into the one zip everything else depends on.
// Pure Node built-ins (no dependency → no package-lock churn, safe under
// `npm ci`). Deterministic given the same source files.
import { readFileSync, writeFileSync, readdirSync, statSync, mkdirSync } from 'node:fs'
import { deflateRawSync } from 'node:zlib'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(fileURLToPath(import.meta.url)) + '/..'
const srcDir = join(root, 'capture-extension')
const flat = process.env.FLAT === '1'
// Docs that belong in the source tree but have no business inside the
// uploaded package (the store zip should be the extension, nothing else).
const EXCLUDE = new Set(['README.md', 'STORE_SUBMISSION.md'])
// Output path defaults to public/ for the real build; overridable (OUT env)
// purely so the algorithm can be validated outside the read-only mount.
const outFile = process.env.OUT || (flat
  ? join(root, 'dist-extension', 'fass-capture-extension-store.zip')
  : join(root, 'public', 'fass-capture-extension.zip'))

// ── CRC-32 ──
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

// Collect files (recursive) under capture-extension/. Default mode prefixes
// every path with `capture-extension/` so the archive expands to a real
// folder for Load-unpacked; flat mode drops the prefix entirely so
// manifest.json sits at the zip root, as the Web Store requires.
function collect(dir, base) {
  const out = []
  for (const name of readdirSync(dir).sort()) {
    if (name === '.DS_Store' || (base === '' && EXCLUDE.has(name))) continue
    const full = join(dir, name)
    const rel = base ? `${base}/${name}` : name
    if (statSync(full).isDirectory()) out.push(...collect(full, rel))
    else out.push({ name: rel, data: readFileSync(full) })
  }
  return out
}

function u16(n) { const b = Buffer.alloc(2); b.writeUInt16LE(n >>> 0); return b }
function u32(n) { const b = Buffer.alloc(4); b.writeUInt32LE(n >>> 0); return b }

const files = collect(srcDir, flat ? '' : 'capture-extension')
const locals = []
const centrals = []
let offset = 0

for (const f of files) {
  const nameBuf = Buffer.from(f.name, 'utf8')
  const crc = crc32(f.data)
  const comp = deflateRawSync(f.data)
  const method = 8 // deflate

  const local = Buffer.concat([
    u32(0x04034b50), u16(20), u16(0), u16(method), u16(0), u16(0x21),
    u32(crc), u32(comp.length), u32(f.data.length),
    u16(nameBuf.length), u16(0), nameBuf, comp,
  ])
  locals.push(local)

  centrals.push(Buffer.concat([
    u32(0x02014b50), u16(20), u16(20), u16(0), u16(method), u16(0), u16(0x21),
    u32(crc), u32(comp.length), u32(f.data.length),
    u16(nameBuf.length), u16(0), u16(0), u16(0), u16(0), u32(0), u32(offset),
    nameBuf,
  ]))
  offset += local.length
}

const centralStart = offset
const centralBuf = Buffer.concat(centrals)
const eocd = Buffer.concat([
  u32(0x06054b50), u16(0), u16(0), u16(files.length), u16(files.length),
  u32(centralBuf.length), u32(centralStart), u16(0),
])

mkdirSync(dirname(outFile), { recursive: true })
writeFileSync(outFile, Buffer.concat([...locals, centralBuf, eocd]))
console.log(`[build-extension-zip] wrote ${outFile} (${files.length} files, ${flat ? 'flat/store' : 'nested/install-page'} layout)`)
