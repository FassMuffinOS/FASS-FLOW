import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import {
  ArrowLeft, Camera, Mic, RefreshCw, Check, RotateCcw,
  MapPin, Link2, ImageOff,
} from 'lucide-react'
import './ContractorCamera.css'

// Web Speech API — solid on Android Chrome, flaky on iOS Safari, so the
// typed note is always available as a fallback.
const SR = typeof window !== 'undefined'
  ? (window.SpeechRecognition || window.webkitSpeechRecognition)
  : null

export default function ContractorCamera() {
  const { session } = useAuth()
  const navigate = useNavigate()
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const recognitionRef = useRef(null)

  const [proposals, setProposals] = useState([])
  const [proposalId, setProposalId] = useState(
    () => new URLSearchParams(window.location.search).get('proposalId') || ''
  )
  const [area, setArea] = useState('')
  const [note, setNote] = useState('')
  const [listening, setListening] = useState(false)
  const [shot, setShot] = useState(null) // { blob, url }
  const [saving, setSaving] = useState(false)
  const [savedFlash, setSavedFlash] = useState(false)
  const [recent, setRecent] = useState([])
  const [camError, setCamError] = useState('')

  useEffect(() => {
    startCamera()
    return stopEverything
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (session?.user?.id) loadProposals()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id])

  useEffect(() => {
    if (proposalId) loadRecent(proposalId)
    else setRecent([])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [proposalId])

  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }, audio: false,
      })
      streamRef.current = stream
      if (videoRef.current) videoRef.current.srcObject = stream
      setCamError('')
    } catch {
      setCamError('Camera unavailable — allow camera access in your browser settings, then reload.')
    }
  }

  function stopEverything() {
    streamRef.current?.getTracks().forEach(t => t.stop())
    try { recognitionRef.current?.stop() } catch { /* noop */ }
  }

  async function loadProposals() {
    const { data } = await supabase
      .from('proposals')
      .select('id, title, stage')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })
    setProposals(data || [])
  }

  async function loadRecent(pid) {
    const { data } = await supabase
      .from('site_captures')
      .select('*')
      .eq('proposal_id', pid)
      .order('created_at', { ascending: false })
      .limit(12)
    setRecent(data || [])
  }

  function capture() {
    const v = videoRef.current
    if (!v || !v.videoWidth) return
    const canvas = document.createElement('canvas')
    canvas.width = v.videoWidth
    canvas.height = v.videoHeight
    canvas.getContext('2d').drawImage(v, 0, 0)
    canvas.toBlob(
      blob => setShot({ blob, url: URL.createObjectURL(blob) }),
      'image/jpeg', 0.9
    )
  }

  function retake() {
    if (shot?.url) URL.revokeObjectURL(shot.url)
    setShot(null)
    setNote('')
    if (listening) toggleVoice()
  }

  function toggleVoice() {
    if (!SR) return
    if (listening) {
      try { recognitionRef.current?.stop() } catch { /* noop */ }
      setListening(false)
      return
    }
    const rec = new SR()
    rec.continuous = true
    rec.interimResults = false
    rec.lang = 'en-US'
    rec.onresult = e => {
      const txt = e.results[e.results.length - 1][0].transcript.trim()
      setNote(prev => (prev ? prev + ' ' : '') + txt)
    }
    rec.onend = () => setListening(false)
    rec.onerror = () => setListening(false)
    recognitionRef.current = rec
    rec.start()
    setListening(true)
  }

  async function save() {
    if (!shot || saving) return
    setSaving(true)
    const uid = session.user.id
    const path = `${uid}/${proposalId || 'unassigned'}/${Date.now()}.jpg`

    const { error: upErr } = await supabase.storage
      .from('site-captures')
      .upload(path, shot.blob, { contentType: 'image/jpeg', upsert: true })
    if (upErr) { setSaving(false); setCamError('Upload failed: ' + upErr.message); return }

    const { data: pub } = supabase.storage.from('site-captures').getPublicUrl(path)
    const { error: insErr } = await supabase.from('site_captures').insert({
      user_id: uid,
      proposal_id: proposalId || null,
      area: area || null,
      kind: 'photo',
      media_url: pub.publicUrl,
      storage_path: path,
      note: note || null,
    })
    setSaving(false)
    if (insErr) { setCamError('Save failed: ' + insErr.message); return }

    retake()
    setSavedFlash(true)
    setTimeout(() => setSavedFlash(false), 1500)
    if (proposalId) loadRecent(proposalId)
  }

  const linkedTitle = proposals.find(p => p.id === proposalId)?.title

  return (
    <div className="cc">
      <header className="cc-header">
        <button className="cc-back" onClick={() => navigate('/dashboard')}>
          <ArrowLeft size={16} /> Dashboard
        </button>
        <span className="cc-title"><Camera size={15} /> Contractor Camera</span>
        <span className="cc-spacer" />
      </header>

      {/* Job + area bar */}
      <div className="cc-meta">
        <label className="cc-meta-field">
          <Link2 size={13} />
          <select value={proposalId} onChange={e => setProposalId(e.target.value)}>
            <option value="">Link to a job…</option>
            {proposals.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
          </select>
        </label>
        <label className="cc-meta-field">
          <MapPin size={13} />
          <input
            placeholder="Area / room (e.g. Roof, Unit 2B)"
            value={area}
            onChange={e => setArea(e.target.value)}
          />
        </label>
      </div>

      {/* Viewport */}
      <div className="cc-stage">
        {camError && (
          <div className="cc-camerr"><ImageOff size={26} /><p>{camError}</p>
            <button className="cc-btn" onClick={startCamera}><RefreshCw size={14} /> Retry</button>
          </div>
        )}
        <video
          ref={videoRef}
          className={`cc-video ${shot || camError ? 'cc-hidden' : ''}`}
          autoPlay playsInline muted
        />
        {shot && <img className="cc-preview" src={shot.url} alt="Captured" />}
        {savedFlash && <div className="cc-saved-flash"><Check size={20} /> Saved to job</div>}
      </div>

      {/* Note (when a shot is taken) */}
      {shot && (
        <div className="cc-note">
          <textarea
            placeholder="Add a note — speak or type what this shows…"
            value={note}
            onChange={e => setNote(e.target.value)}
          />
          {SR && (
            <button
              className={`cc-mic ${listening ? 'cc-mic-on' : ''}`}
              onClick={toggleVoice}
              title="Dictate note"
            >
              <Mic size={16} /> {listening ? 'Listening…' : 'Speak'}
            </button>
          )}
        </div>
      )}

      {/* Controls */}
      <div className="cc-controls">
        {!shot ? (
          <button className="cc-shutter" onClick={capture} disabled={!!camError} aria-label="Capture photo">
            <span className="cc-shutter-ring" />
          </button>
        ) : (
          <div className="cc-confirm">
            <button className="cc-btn cc-btn-ghost" onClick={retake}><RotateCcw size={16} /> Retake</button>
            <button className="cc-btn cc-btn-primary" onClick={save} disabled={saving}>
              <Check size={16} /> {saving ? 'Saving…' : 'Save to job'}
            </button>
          </div>
        )}
      </div>

      {/* Recent strip */}
      {proposalId && (
        <div className="cc-recent">
          <p className="cc-recent-label">
            {linkedTitle ? `Recent on “${linkedTitle}”` : 'Recent captures'}
            {recent.length > 0 && <span> · {recent.length}</span>}
          </p>
          {recent.length === 0 ? (
            <p className="cc-recent-empty">No captures yet for this job.</p>
          ) : (
            <div className="cc-recent-row">
              {recent.map(r => (
                <div className="cc-thumb" key={r.id} title={r.note || ''}>
                  <img src={r.media_url} alt={r.area || 'capture'} />
                  {r.area && <span className="cc-thumb-area">{r.area}</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
