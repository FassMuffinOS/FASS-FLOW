import { useState, useRef, useCallback } from 'react'
import { Crop, Upload, Download, RefreshCw, Image as ImageIcon } from 'lucide-react'
import './Resize.css'

// Pure client-side — the image never leaves the browser. That's deliberate:
// this is the "come back just for this" free hook, so it has to be instant,
// free of any account/upload-limit friction, and cheap to run forever (no
// server cost per resize, no storage to clean up).
const PRESETS = [
  { id: 'wallet-logo', label: 'Wallet / logo (square)', group: 'Logo', w: 600, h: 600, mode: 'fit', note: 'Square, padded so nothing gets cropped — best for the FASS Wallet card logo.' },
  { id: 'profile', label: 'Profile photo', group: 'Profile', w: 800, h: 800, mode: 'fill', note: 'Square crop, fills the frame — most profile photo slots.' },
  { id: 'google-business', label: 'Google Business profile photo', group: 'Profile', w: 720, h: 720, mode: 'fill' },
  { id: 'fb-marketplace', label: 'Facebook Marketplace listing', group: 'Marketplace', w: 1200, h: 1200, mode: 'fill' },
  { id: 'etsy-listing', label: 'Etsy listing photo', group: 'Marketplace', w: 2000, h: 2000, mode: 'fill' },
  { id: 'instagram-post', label: 'Instagram post', group: 'Social', w: 1080, h: 1080, mode: 'fill' },
  { id: 'facebook-cover', label: 'Facebook page cover', group: 'Social', w: 820, h: 312, mode: 'fill' },
  { id: 'custom', label: 'Custom size', group: 'Custom', w: null, h: null, mode: 'fit' },
]

const FORMATS = [
  { id: 'image/png', label: 'PNG', ext: 'png', supportsTransparent: true, supportsQuality: false },
  { id: 'image/jpeg', label: 'JPEG', ext: 'jpg', supportsTransparent: false, supportsQuality: true },
  { id: 'image/webp', label: 'WebP', ext: 'webp', supportsTransparent: true, supportsQuality: true },
]

function formatBytes(bytes) {
  if (!bytes) return '0 KB'
  const kb = bytes / 1024
  return kb < 1024 ? `${kb.toFixed(0)} KB` : `${(kb / 1024).toFixed(1)} MB`
}

export default function Resize() {
  const canvasRef = useRef(null)
  const fileInputRef = useRef(null)

  const [imgEl, setImgEl] = useState(null)
  const [fileName, setFileName] = useState('')
  const [presetId, setPresetId] = useState('wallet-logo')
  const [customW, setCustomW] = useState(800)
  const [customH, setCustomH] = useState(800)
  const [mode, setMode] = useState('fit') // 'fit' | 'fill' — overridable per preset
  const [bg, setBg] = useState('#ffffff')
  const [transparent, setTransparent] = useState(true)
  const [format, setFormat] = useState('image/png')
  const [quality, setQuality] = useState(0.9)
  const [resultUrl, setResultUrl] = useState(null)
  const [resultSize, setResultSize] = useState(0)
  const [dragOver, setDragOver] = useState(false)

  const preset = PRESETS.find(p => p.id === presetId)
  const targetW = preset.id === 'custom' ? Number(customW) || 1 : preset.w
  const targetH = preset.id === 'custom' ? Number(customH) || 1 : preset.h
  const fmt = FORMATS.find(f => f.id === format)

  function loadFile(file) {
    if (!file || !file.type.startsWith('image/')) return
    setFileName(file.name)
    setResultUrl(null)
    const reader = new FileReader()
    reader.onload = () => {
      const img = new Image()
      img.onload = () => setImgEl(img)
      img.src = reader.result
    }
    reader.readAsDataURL(file)
  }

  function onDrop(e) {
    e.preventDefault()
    setDragOver(false)
    loadFile(e.dataTransfer.files?.[0])
  }

  // Picking a preset resets mode to that preset's sensible default — fit
  // for logos (never crop a logo), fill for photo slots (platforms expect
  // an exact, cropped fit) — but the toggle below still lets you override.
  function selectPreset(p) {
    setPresetId(p.id)
    setMode(p.mode)
    setResultUrl(null)
  }

  const render = useCallback(() => {
    if (!imgEl) return
    const canvas = canvasRef.current
    const w = targetW, h = targetH
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')

    const wantsTransparent = fmt.supportsTransparent && transparent
    if (!wantsTransparent) {
      ctx.fillStyle = bg
      ctx.fillRect(0, 0, w, h)
    } else {
      ctx.clearRect(0, 0, w, h)
    }

    const srcRatio = imgEl.width / imgEl.height
    const dstRatio = w / h
    let dw, dh, dx, dy

    if (mode === 'fill') {
      // Cover the whole frame, cropping whichever dimension overhangs.
      if (srcRatio > dstRatio) {
        dh = imgEl.height
        dw = dh * dstRatio
      } else {
        dw = imgEl.width
        dh = dw / dstRatio
      }
      const sx = (imgEl.width - dw) / 2
      const sy = (imgEl.height - dh) / 2
      ctx.drawImage(imgEl, sx, sy, dw, dh, 0, 0, w, h)
    } else {
      // Fit the whole image inside the frame, letterboxed.
      if (srcRatio > dstRatio) {
        dw = w
        dh = w / srcRatio
      } else {
        dh = h
        dw = h * srcRatio
      }
      dx = (w - dw) / 2
      dy = (h - dh) / 2
      ctx.drawImage(imgEl, dx, dy, dw, dh)
    }

    canvas.toBlob(blob => {
      if (!blob) return
      setResultUrl(prev => { if (prev) URL.revokeObjectURL(prev); return URL.createObjectURL(blob) })
      setResultSize(blob.size)
    }, format, fmt.supportsQuality ? quality : undefined)
  }, [imgEl, targetW, targetH, mode, bg, transparent, format, quality, fmt])

  function downloadResult() {
    if (!resultUrl) return
    const a = document.createElement('a')
    a.href = resultUrl
    const base = (fileName.split('.').slice(0, -1).join('.') || 'image').replace(/\s+/g, '-')
    a.download = `${base}-${preset.id}.${fmt.ext}`
    a.click()
  }

  function reset() {
    setImgEl(null)
    setFileName('')
    setResultUrl(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <div className="rs">
      <div className="rs-container">
        <div className="rs-head">
          <Crop size={22} className="rs-head-icon" />
          <div>
            <h1>Resize &amp; reformat</h1>
            <p>Drop a logo or photo, pick where it's going, get back the exact size and format that platform wants. Free, no account needed — nothing leaves your browser.</p>
          </div>
        </div>

        {!imgEl ? (
          <div
            className={`rs-drop ${dragOver ? 'rs-drop--active' : ''}`}
            onDragOver={e => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload size={28} />
            <p><strong>Click to choose a file</strong> or drag one in</p>
            <span className="rs-note">PNG, JPG, or WebP</span>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              hidden
              onChange={e => loadFile(e.target.files?.[0])}
            />
          </div>
        ) : (
          <>
            <div className="rs-card">
              <div className="rs-card-head"><ImageIcon size={16} /> <span>Where's this going?</span></div>
              <div className="rs-preset-grid">
                {PRESETS.map(p => (
                  <button key={p.id} type="button" className={`rs-preset-btn ${presetId === p.id ? 'active' : ''}`} onClick={() => selectPreset(p)}>
                    <span className="rs-preset-label">{p.label}</span>
                    <span className="rs-preset-dim">{p.id === 'custom' ? 'Set your own' : `${p.w}×${p.h}`}</span>
                  </button>
                ))}
              </div>
              {preset.note && <p className="rs-note rs-note-block">{preset.note}</p>}

              {preset.id === 'custom' && (
                <div className="rs-custom-dims">
                  <label>Width <input type="number" min="1" value={customW} onChange={e => setCustomW(e.target.value)} /></label>
                  <label>Height <input type="number" min="1" value={customH} onChange={e => setCustomH(e.target.value)} /></label>
                </div>
              )}

              <div className="rs-controls-row">
                <div className="rs-toggle-group">
                  <button type="button" className={`rs-toggle ${mode === 'fit' ? 'active' : ''}`} onClick={() => setMode('fit')}>Fit — keep whole image</button>
                  <button type="button" className={`rs-toggle ${mode === 'fill' ? 'active' : ''}`} onClick={() => setMode('fill')}>Fill — crop to exact size</button>
                </div>
              </div>

              {mode === 'fit' && (
                <div className="rs-controls-row">
                  <label className="rs-inline-label">
                    <input type="checkbox" checked={transparent && fmt.supportsTransparent} disabled={!fmt.supportsTransparent} onChange={e => setTransparent(e.target.checked)} />
                    Transparent background
                  </label>
                  {(!transparent || !fmt.supportsTransparent) && (
                    <label className="rs-inline-label">
                      Background <input type="color" value={bg} onChange={e => setBg(e.target.value)} />
                    </label>
                  )}
                </div>
              )}

              <div className="rs-controls-row">
                <label className="rs-inline-label">
                  Format
                  <select value={format} onChange={e => setFormat(e.target.value)}>
                    {FORMATS.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
                  </select>
                </label>
                {fmt.supportsQuality && (
                  <label className="rs-inline-label rs-quality">
                    Quality
                    <input type="range" min="0.4" max="1" step="0.05" value={quality} onChange={e => setQuality(Number(e.target.value))} />
                    <span>{Math.round(quality * 100)}%</span>
                  </label>
                )}
              </div>

              <div className="rs-actions">
                <button type="button" className="btn-primary" onClick={render}>
                  <Crop size={14} /> Resize
                </button>
                <button type="button" className="btn-outline" onClick={reset}>
                  <RefreshCw size={14} /> Start over
                </button>
              </div>
            </div>

            <div className="rs-card rs-preview-card">
              <div className="rs-preview-cols">
                <div className="rs-preview-col">
                  <span className="rs-preview-label">Original — {imgEl.width}×{imgEl.height}</span>
                  <img className="rs-preview-img" src={imgEl.src} alt="Original" />
                </div>
                <div className="rs-preview-col">
                  <span className="rs-preview-label">Result — {targetW}×{targetH}{resultUrl ? ` · ${formatBytes(resultSize)}` : ''}</span>
                  <canvas ref={canvasRef} className="rs-preview-canvas" />
                  {!resultUrl && <p className="rs-note">Click Resize to generate it.</p>}
                </div>
              </div>
              {resultUrl && (
                <button type="button" className="btn-primary rs-download-btn" onClick={downloadResult}>
                  <Download size={14} /> Download
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
