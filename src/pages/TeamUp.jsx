import { useState, useEffect, useCallback } from 'react'
import { useLocation } from 'react-router-dom'
import { Handshake, Plus, Loader, MessageCircle, X, Inbox as InboxIcon } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { logBusinessEvent } from '../lib/businessEvents'
import ChatThread from '../components/ChatThread'
import './TeamUp.css'

const API_BASE = import.meta.env.VITE_API_URL || ''

// Team Up — the public "looking for partners" board. Any signed-in user can
// browse open posts and start a chat with the author (see ChatThread.jsx /
// chat.py). Posts can be written from scratch here, or pre-filled from a
// Pipeline record via the "Find a Partner" button, which navigates here with
// router state (the same pattern R-E-A-D's WARDOG prefill uses) rather than
// a prop, since this page is reached via a route, not direct composition.
export default function TeamUp() {
  const { session } = useAuth()
  const location = useLocation()
  const prefill = location.state?.prefill || null
  const userId = session?.user?.id
  const [tab, setTab] = useState('board') // 'board' | 'mine' | 'inbox'
  const [posts, setPosts] = useState([])
  const [myPosts, setMyPosts] = useState([])
  const [threads, setThreads] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(Boolean(prefill))
  const [openThread, setOpenThread] = useState(null) // { id, name }

  const [title, setTitle] = useState(prefill?.title || '')
  const [bring, setBring] = useState('')
  const [need, setNeed] = useState('')
  const [naics, setNaics] = useState(prefill?.naics || '')
  const [submitting, setSubmitting] = useState(false)

  const loadBoard = useCallback(async () => {
    if (!API_BASE) return
    const res = await fetch(`${API_BASE}/api/v1/partners/posts`)
    if (res.ok) setPosts((await res.json()).posts || [])
  }, [])

  const loadMine = useCallback(async () => {
    if (!userId || !API_BASE) return
    const res = await fetch(`${API_BASE}/api/v1/partners/posts/mine?user_id=${userId}`)
    if (res.ok) setMyPosts((await res.json()).posts || [])
  }, [userId])

  const loadThreads = useCallback(async () => {
    if (!userId || !API_BASE) return
    const res = await fetch(`${API_BASE}/api/v1/chat/threads/mine?user_id=${userId}`)
    if (res.ok) setThreads((await res.json()).threads || [])
  }, [userId])

  useEffect(() => {
    let cancelled = false
    async function loadAll() {
      await Promise.all([loadBoard(), loadMine(), loadThreads()])
      if (!cancelled) setLoading(false)
    }
    loadAll()
    return () => { cancelled = true }
  }, [loadBoard, loadMine, loadThreads])

  async function submitPost(e) {
    e.preventDefault()
    if (!title.trim() || !bring.trim() || !need.trim() || submitting) return
    setSubmitting(true)
    try {
      const res = await fetch(`${API_BASE}/api/v1/partners/posts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          title: title.trim(),
          what_i_bring: bring.trim(),
          what_i_need: need.trim(),
          naics_code: naics.trim() || null,
          proposal_id: prefill?.proposalId || null,
        }),
      })
      if (res.ok) {
        await logBusinessEvent(userId, 'customer_growth', 'partner_post_created', 5, title.trim())
        setTitle(''); setBring(''); setNeed(''); setNaics('')
        setShowForm(false)
        loadBoard(); loadMine()
      }
    } finally {
      setSubmitting(false)
    }
  }

  async function closePost(postId) {
    await fetch(`${API_BASE}/api/v1/partners/posts/${postId}/close`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId }),
    })
    loadMine(); loadBoard()
  }

  async function messageAuthor(post) {
    const res = await fetch(`${API_BASE}/api/v1/chat/threads/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, other_user_id: post.user_id, post_id: post.id }),
    })
    if (res.ok) {
      const data = await res.json()
      setOpenThread({ id: data.thread_id, name: post.profiles?.full_name || 'Business' })
    }
  }

  return (
    <div className="teamup">
      <header className="teamup-header">
        <div>
          <h1><Handshake size={22} /> Team Up</h1>
          <p>Looking for a partner on a bid, or have capacity to offer someone else's? Post it here.</p>
        </div>
        <button className="btn-primary" onClick={() => setShowForm(true)}>
          <Plus size={15} /> New post
        </button>
      </header>

      <div className="teamup-tabs">
        <button className={tab === 'board' ? 'active' : ''} onClick={() => setTab('board')}>Board</button>
        <button className={tab === 'mine' ? 'active' : ''} onClick={() => setTab('mine')}>My posts</button>
        <button className={tab === 'inbox' ? 'active' : ''} onClick={() => setTab('inbox')}>
          <InboxIcon size={14} /> Messages {threads.length > 0 && `(${threads.length})`}
        </button>
      </div>

      {showForm && (
        <div className="teamup-modal-overlay" onClick={() => setShowForm(false)}>
          <form className="teamup-form" onClick={e => e.stopPropagation()} onSubmit={submitPost}>
            <div className="teamup-form-head">
              <h3>New partner post</h3>
              <button type="button" onClick={() => setShowForm(false)} aria-label="Close"><X size={16} /></button>
            </div>
            <label>Title<input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Looking for a sub with bonding capacity" required /></label>
            <label>What I bring<textarea value={bring} onChange={e => setBring(e.target.value)} placeholder="e.g. Awarded $400k janitorial contract, need help meeting bonding requirement" required /></label>
            <label>What I need<textarea value={need} onChange={e => setNeed(e.target.value)} placeholder="e.g. A bonded sub or teaming partner in the DC metro area" required /></label>
            <label>NAICS code (optional)<input value={naics} onChange={e => setNaics(e.target.value)} placeholder="561720" /></label>
            <button className="btn-primary" type="submit" disabled={submitting}>
              {submitting ? <Loader size={14} className="spin" /> : 'Post to the board'}
            </button>
          </form>
        </div>
      )}

      {loading ? (
        <div className="teamup-loading"><Loader size={18} className="spin" /></div>
      ) : tab === 'board' ? (
        <BoardList posts={posts} userId={userId} onMessage={messageAuthor} />
      ) : tab === 'mine' ? (
        <MyPosts posts={myPosts} onClose={closePost} />
      ) : (
        <ThreadList threads={threads} onOpen={t => setOpenThread({ id: t.id, name: t.other_participants?.[0]?.full_name || 'Conversation' })} />
      )}

      {openThread && (
        <ChatThread threadId={openThread.id} otherName={openThread.name} onClose={() => { setOpenThread(null); loadThreads() }} />
      )}
    </div>
  )
}

function BoardList({ posts, userId, onMessage }) {
  if (posts.length === 0) {
    return <div className="teamup-empty">No open posts right now — be the first to post what you're looking for.</div>
  }
  return (
    <div className="teamup-list">
      {posts.map(p => (
        <div key={p.id} className="teamup-card">
          <div className="teamup-card-top">
            <h4>{p.title}</h4>
            {p.naics_code && <span className="teamup-naics">NAICS {p.naics_code}</span>}
          </div>
          {p.proposals?.title && (
            <p className="teamup-linked-proposal">Linked to: {p.proposals.title}{p.proposals.agency ? ` — ${p.proposals.agency}` : ''}</p>
          )}
          <p><strong>Brings:</strong> {p.what_i_bring}</p>
          <p><strong>Needs:</strong> {p.what_i_need}</p>
          <div className="teamup-card-foot">
            <span className="teamup-author">{p.profiles?.full_name || 'FASS Flow member'}</span>
            {p.user_id !== userId && (
              <button className="btn-outline" onClick={() => onMessage(p)}>
                <MessageCircle size={14} /> Message
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

function MyPosts({ posts, onClose }) {
  if (posts.length === 0) {
    return <div className="teamup-empty">You haven't posted anything yet.</div>
  }
  return (
    <div className="teamup-list">
      {posts.map(p => (
        <div key={p.id} className="teamup-card">
          <div className="teamup-card-top">
            <h4>{p.title}</h4>
            <span className={`teamup-status teamup-status-${p.status}`}>{p.status}</span>
          </div>
          <p><strong>Brings:</strong> {p.what_i_bring}</p>
          <p><strong>Needs:</strong> {p.what_i_need}</p>
          {p.status === 'open' && (
            <div className="teamup-card-foot">
              <button className="btn-outline" onClick={() => onClose(p.id)}>Mark filled / close</button>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

function ThreadList({ threads, onOpen }) {
  if (threads.length === 0) {
    return <div className="teamup-empty">No conversations yet — message someone from the board to start one.</div>
  }
  return (
    <div className="teamup-list">
      {threads.map(t => (
        <button key={t.id} className="teamup-thread-row" onClick={() => onOpen(t)}>
          <div>
            <strong>{t.other_participants?.map(p => p.full_name || 'Member').join(', ') || 'Conversation'}</strong>
            {t.post_title && <span className="teamup-thread-post"> · {t.post_title}</span>}
          </div>
          <p>{t.last_message?.body || 'No messages yet'}</p>
        </button>
      ))}
    </div>
  )
}
