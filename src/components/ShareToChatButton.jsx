import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Send, X, Search } from 'lucide-react'
import './ShareToChatButton.css'

const API_BASE = import.meta.env.VITE_API_URL || ''

// Drop a real platform object (a WARDOG opportunity, an R-E-A-D proposal, a
// Team Up post, or a Passport capability statement) straight into a
// Messenger thread as a card, instead of the recipient having to be told
// about it and go look it up themselves. One shared component so every page
// that has something worth sharing (WARDOG, R-E-A-D, TeamUp, Passport) gets
// the same picker + behavior rather than four bespoke implementations.
//
// Flow: pick a person (reuses /chat/people/search, same pinned-Admin/AI
// behavior as "New message") -> /chat/threads/start to get-or-create the
// thread -> /chat/threads/{id}/share to post the card. Two round trips, but
// thread reuse means repeat shares to the same person never create
// duplicate threads.
export default function ShareToChatButton({ objectType, objectId, snapshot, label }) {
  const { session } = useAuth()
  const navigate = useNavigate()
  const userId = session?.user?.id

  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const [people, setPeople] = useState([])
  const [loading, setLoading] = useState(false)
  const [note, setNote] = useState('')
  const [sendingTo, setSendingTo] = useState(null)
  const [sentTo, setSentTo] = useState(null)
  const [error, setError] = useState('')
  const debounceRef = useRef(null)
  const popRef = useRef(null)

  useEffect(() => {
    if (!open) return
    function onClick(e) {
      if (popRef.current && !popRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open])

  function search(query) {
    if (!userId || !API_BASE) return
    setLoading(true)
    fetch(`${API_BASE}/api/v1/chat/people/search?user_id=${userId}&q=${encodeURIComponent(query)}`)
      .then(res => res.ok ? res.json() : { people: [] })
      .then(data => setPeople(data.people || []))
      .catch(() => setPeople([]))
      .finally(() => setLoading(false))
  }

  function toggleOpen() {
    setOpen(o => {
      const next = !o
      if (next) { setError(''); setSentTo(null); search('') }
      return next
    })
  }

  function onChange(value) {
    setQ(value)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => search(value), 300)
  }

  async function shareWith(person) {
    if (!userId || !API_BASE) return
    setSendingTo(person.id)
    setError('')
    try {
      const startRes = await fetch(`${API_BASE}/api/v1/chat/threads/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, other_user_id: person.id, post_id: null }),
      })
      if (!startRes.ok) {
        const err = await startRes.json().catch(() => ({}))
        setError(err.detail || `Couldn't start that conversation (${startRes.status}).`)
        return
      }
      const { thread_id } = await startRes.json()
      const shareRes = await fetch(`${API_BASE}/api/v1/chat/threads/${thread_id}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          object_type: objectType,
          object_id: objectId,
          note: note.trim() || null,
          snapshot: snapshot || null,
        }),
      })
      if (!shareRes.ok) {
        const err = await shareRes.json().catch(() => ({}))
        setError(err.detail || `Couldn't share that (${shareRes.status}).`)
        return
      }
      setSentTo(person.id)
      setNote('')
    } catch (e) {
      console.error('ShareToChatButton: share failed', e)
      setError('Something went wrong sharing this.')
    } finally {
      setSendingTo(null)
    }
  }

  return (
    <div className="stc-wrap" ref={popRef}>
      <button type="button" className="stc-trigger" onClick={toggleOpen}>
        <Send size={14} /> {label || 'Share to chat'}
      </button>

      {open && (
        <div className="stc-pop">
          <div className="stc-pop-head">
            <span>Share to chat</span>
            <button className="stc-close" onClick={() => setOpen(false)}><X size={14} /></button>
          </div>

          <textarea
            className="stc-note"
            placeholder="Add a note (optional)…"
            value={note}
            onChange={e => setNote(e.target.value)}
            rows={2}
          />

          <div className="stc-search">
            <Search size={14} />
            <input
              autoFocus
              placeholder="Search people by name…"
              value={q}
              onChange={e => onChange(e.target.value)}
            />
          </div>

          {error && <div className="stc-error">{error}</div>}

          <div className="stc-list">
            {loading && <div className="stc-empty">Searching…</div>}
            {!loading && people.length === 0 && <div className="stc-empty">No one found.</div>}
            {!loading && people.map(p => (
              <button
                key={p.id}
                className="stc-person"
                disabled={sendingTo === p.id}
                onClick={() => shareWith(p)}
              >
                <span className="stc-avatar">{(p.full_name || p.company_name || '?').slice(0, 2).toUpperCase()}</span>
                <span className="stc-person-info">
                  <span className="stc-person-name">{p.full_name || p.company_name || 'Unknown'}</span>
                  {p.company_name && p.full_name && <span className="stc-person-sub">{p.company_name}</span>}
                </span>
                {sentTo === p.id ? (
                  <span className="stc-sent">Sent ✓</span>
                ) : sendingTo === p.id ? (
                  <span className="stc-sent">Sending…</span>
                ) : null}
              </button>
            ))}
          </div>

          {sentTo && (
            <button className="stc-goto" onClick={() => navigate('/messages')}>
              Open in Messages →
            </button>
          )}
        </div>
      )}
    </div>
  )
}
