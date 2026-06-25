import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import {
  ArrowLeft, Camera, Trash2, MapPin, ImageOff, RefreshCw,
} from 'lucide-react'
import './CapturesGallery.css'

function fmtTime(str) {
  return new Date(str).toLocaleString('en-US', {
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  })
}

export default function CapturesGallery() {
  const { session } = useAuth()
  const navigate = useNavigate()
  const [captures, setCaptures] = useState([])
  const [proposals, setProposals] = useState([])
  const [filter, setFilter] = useState(
    () => new URLSearchParams(window.location.search).get('proposalId') || 'all'
  )
  const [loading, setLoading] = useState(true)
  // In-app delete confirmation, replacing the browser's native
  // window.confirm() — consistent with the rest of the product's styling
  // and not jarring on mobile (where native confirm dialogs look broken).
  const [pendingDelete, setPendingDelete] = useState(null)

  useEffect(() => {
    if (session?.user?.id) load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id])

  async function load() {
    setLoading(true)
    const [{ data: caps }, { data: props }] = await Promise.all([
      supabase.from('site_captures').select('*').eq('user_id', session.user.id).order('created_at', { ascending: false }),
      supabase.from('proposals').select('id, title').eq('user_id', session.user.id),
    ])
    setCaptures(caps || [])
    setProposals(props || [])
    setLoading(false)
  }

  function requestRemove(c) {
    setPendingDelete(c)
  }

  async function confirmRemove() {
    const c = pendingDelete
    if (!c) return
    setPendingDelete(null)
    setCaptures(prev => prev.filter(x => x.id !== c.id))
    await supabase.from('site_captures').delete().eq('id', c.id)
    if (c.storage_path) await supabase.storage.from('site-captures').remove([c.storage_path])
  }

  const titleOf = id => proposals.find(p => p.id === id)?.title || 'Unassigned'

  const filtered = filter === 'all'
    ? captures
    : captures.filter(c => (filter === 'unassigned' ? !c.proposal_id : c.proposal_id === filter))

  // Group by job, newest first within each.
  const groups = {}
  for (const c of filtered) {
    const k = c.proposal_id || 'unassigned'
    ;(groups[k] ||= []).push(c)
  }
  const groupKeys = Object.keys(groups)

  return (
    <div className="cg">
      <header className="cg-header">
        <button className="cg-back" onClick={() => navigate('/camera')}>
          <ArrowLeft size={16} /> Camera
        </button>
        <span className="cg-title">Captures</span>
        <button className="cg-refresh" onClick={load} title="Refresh">
          <RefreshCw size={15} className={loading ? 'cg-spin' : ''} />
        </button>
      </header>

      <div className="cg-filterbar">
        <select value={filter} onChange={e => setFilter(e.target.value)}>
          <option value="all">All jobs</option>
          {proposals.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
          <option value="unassigned">Unassigned</option>
        </select>
        <span className="cg-count">{filtered.length} {filtered.length === 1 ? 'capture' : 'captures'}</span>
      </div>

      {loading ? (
        <div className="cg-loading"><RefreshCw size={18} className="cg-spin" /> Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="cg-empty">
          <ImageOff size={28} />
          <p>No captures yet.</p>
          <button className="cg-btn-primary" onClick={() => navigate('/camera')}>
            <Camera size={15} /> Open the camera
          </button>
        </div>
      ) : (
        groupKeys.map(k => (
          <section className="cg-group" key={k}>
            <div className="cg-group-head">
              <span className="cg-group-title">{titleOf(k === 'unassigned' ? null : k)}</span>
              <span className="cg-group-count">{groups[k].length}</span>
            </div>
            <div className="cg-list">
              {groups[k].map(c => (
                <div className="cg-card" key={c.id}>
                  <img className="cg-photo" src={c.media_url} alt={c.area || 'capture'} />
                  <div className="cg-body">
                    <div className="cg-row">
                      {c.area && <span className="cg-area"><MapPin size={11} /> {c.area}</span>}
                      <span className="cg-time">{fmtTime(c.created_at)}</span>
                    </div>
                    {c.note ? <p className="cg-note">{c.note}</p> : <p className="cg-note cg-note-empty">No note</p>}
                  </div>
                  <button className="cg-del" onClick={() => requestRemove(c)} title="Delete"><Trash2 size={15} /></button>
                </div>
              ))}
            </div>
          </section>
        ))
      )}

      {pendingDelete && (
        <div className="cg-confirm-scrim" onClick={() => setPendingDelete(null)}>
          <div className="cg-confirm-modal" onClick={e => e.stopPropagation()}>
            <p className="cg-confirm-title">Delete this capture?</p>
            <p className="cg-confirm-body">This removes the photo and note. This can't be undone.</p>
            <div className="cg-confirm-actions">
              <button className="cg-confirm-cancel" onClick={() => setPendingDelete(null)}>Cancel</button>
              <button className="cg-confirm-delete" onClick={confirmRemove}>
                <Trash2 size={14} /> Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
