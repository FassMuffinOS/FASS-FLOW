import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Newspaper, Heart, MessageSquare, Send, Loader, Trash2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import './Feed.css'

const API_BASE = import.meta.env.VITE_API_URL || ''

// The global business feed — "LinkedIn+Slack" social layer over Business
// Profiles. Posts are either typed by hand here (source='manual') or
// generated off a real milestone elsewhere in the app (source='auto', e.g.
// Pipeline.jsx after a contract is marked 'awarded'). Both render the same
// way; only the composer is skipped for posts the user didn't write
// themselves. See feed.py for the backend.
export default function Feed() {
  const { session } = useAuth()
  const userId = session?.user?.id
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [body, setBody] = useState('')
  const [posting, setPosting] = useState(false)
  // Founder-only seed tool for the empty-feed state — not linked from nav,
  // same "type the shared secret in by hand" model as Admin.jsx/AffiliateAdmin.jsx.
  // Anyone can click "Seed starter content," but the backend rejects the
  // request without the real ADMIN_SECRET, so this is safe to leave visible.
  const [seedOpen, setSeedOpen] = useState(false)
  const [seedSecret, setSeedSecret] = useState(sessionStorage.getItem('fass_admin_secret') || '')
  const [seeding, setSeeding] = useState(false)
  const [seedMsg, setSeedMsg] = useState('')

  const loadFeed = useCallback(async () => {
    if (!API_BASE) return
    try {
      const res = await fetch(`${API_BASE}/api/v1/feed?viewer_id=${userId || ''}`)
      if (res.ok) setPosts((await res.json()).posts || [])
    } catch (err) {
      console.error('Feed: failed to load', err)
    }
  }, [userId])

  useEffect(() => {
    let cancelled = false
    loadFeed().finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [loadFeed])

  async function submitPost(e) {
    e.preventDefault()
    if (!body.trim() || posting || !userId) return
    setPosting(true)
    try {
      const res = await fetch(`${API_BASE}/api/v1/feed/posts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, body: body.trim(), source: 'manual' }),
      })
      if (res.ok) {
        setBody('')
        loadFeed()
      }
    } finally {
      setPosting(false)
    }
  }

  async function toggleLike(postId) {
    if (!userId) return
    // Optimistic update so the heart responds instantly, then reconcile
    // with the server's actual liked state.
    setPosts(prev => prev.map(p => p.id === postId
      ? { ...p, liked_by_me: !p.liked_by_me, like_count: p.like_count + (p.liked_by_me ? -1 : 1) }
      : p))
    try {
      const res = await fetch(`${API_BASE}/api/v1/feed/posts/${postId}/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId }),
      })
      if (!res.ok) loadFeed()
    } catch {
      loadFeed()
    }
  }

  async function seedFeed(e) {
    e.preventDefault()
    if (!seedSecret.trim() || seeding) return
    setSeeding(true)
    setSeedMsg('')
    sessionStorage.setItem('fass_admin_secret', seedSecret)
    try {
      const res = await fetch(`${API_BASE}/api/v1/feed/admin/seed`, {
        method: 'POST',
        headers: { 'X-Admin-Secret': seedSecret },
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.detail || `Request failed (${res.status})`)
      setSeedMsg(`Added ${data.created} post${data.created === 1 ? '' : 's'}${data.skipped ? ` (${data.skipped} already there)` : ''}.`)
      loadFeed()
    } catch (err) {
      setSeedMsg(err.message || 'Seed failed')
    } finally {
      setSeeding(false)
    }
  }

  async function deletePost(postId) {
    if (!userId) return
    await fetch(`${API_BASE}/api/v1/feed/posts/${postId}?user_id=${userId}`, { method: 'DELETE' })
    setPosts(prev => prev.filter(p => p.id !== postId))
  }

  return (
    <div className="feed">
      <div className="feed-wrap">
        <header className="feed-header">
          <h1><Newspaper size={22} /> Feed</h1>
          <p>What's happening across the network — wins, launches, and asks, all in one place.</p>
        </header>

        <form className="feed-composer" onSubmit={submitPost}>
          <textarea
            value={body}
            onChange={e => setBody(e.target.value)}
            placeholder="Share an update — what did you just ship, win, or need help with?"
            rows={2}
          />
          <button className="btn-primary" type="submit" disabled={posting || !body.trim()}>
            {posting ? <Loader size={14} className="spin" /> : <><Send size={14} /> Post</>}
          </button>
        </form>

        {loading ? (
          <div className="feed-state"><Loader className="spin" size={18} /> Loading…</div>
        ) : posts.length === 0 ? (
          <div className="feed-state">
            No posts yet — be the first to share an update.
            {!seedOpen ? (
              <button className="feed-seed-link" onClick={() => setSeedOpen(true)}>
                Seed starter content
              </button>
            ) : (
              <form className="feed-seed-form" onSubmit={seedFeed}>
                <input
                  type="password"
                  value={seedSecret}
                  onChange={e => setSeedSecret(e.target.value)}
                  placeholder="Admin secret"
                />
                <button className="btn-primary" type="submit" disabled={seeding || !seedSecret.trim()}>
                  {seeding ? <Loader size={14} className="spin" /> : 'Seed'}
                </button>
              </form>
            )}
            {seedMsg && <div className="feed-seed-msg">{seedMsg}</div>}
          </div>
        ) : (
          <div className="feed-list">
            {posts.map(p => (
              <PostCard key={p.id} post={p} userId={userId} onLike={toggleLike} onDelete={deletePost} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function PostCard({ post, userId, onLike, onDelete }) {
  const [showComments, setShowComments] = useState(false)
  const author = post.profiles?.company_name || post.profiles?.full_name || 'FASS Flow member'

  return (
    <div className="feed-card">
      <div className="feed-card-top">
        <Link to={`/profile/${post.user_id}`} className="feed-author">{author}</Link>
        <span className="feed-time">{timeAgo(post.created_at)}</span>
        {post.source === 'auto' && <span className="feed-auto-tag">Milestone</span>}
      </div>
      <p className="feed-body">{post.body}</p>
      <div className="feed-card-actions">
        <button
          className={`feed-action ${post.liked_by_me ? 'liked' : ''}`}
          onClick={() => onLike(post.id)}
        >
          <Heart size={15} fill={post.liked_by_me ? 'currentColor' : 'none'} /> {post.like_count || 0}
        </button>
        <button className="feed-action" onClick={() => setShowComments(s => !s)}>
          <MessageSquare size={15} /> {post.comment_count || 0}
        </button>
        {post.user_id === userId && (
          <button className="feed-action feed-action-delete" onClick={() => onDelete(post.id)}>
            <Trash2 size={14} />
          </button>
        )}
      </div>
      {showComments && <CommentThread postId={post.id} userId={userId} />}
    </div>
  )
}

function CommentThread({ postId, userId }) {
  const [comments, setComments] = useState([])
  const [loading, setLoading] = useState(true)
  const [text, setText] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const load = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/v1/feed/posts/${postId}/comments`)
      if (res.ok) setComments((await res.json()).comments || [])
    } finally {
      setLoading(false)
    }
  }, [postId])

  useEffect(() => { load() }, [load])

  async function submitComment(e) {
    e.preventDefault()
    if (!text.trim() || submitting || !userId) return
    setSubmitting(true)
    try {
      const res = await fetch(`${API_BASE}/api/v1/feed/posts/${postId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, body: text.trim() }),
      })
      if (res.ok) { setText(''); load() }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="feed-comments">
      {loading ? (
        <div className="feed-comments-loading"><Loader size={13} className="spin" /></div>
      ) : (
        comments.map(c => (
          <div key={c.id} className="feed-comment">
            <Link to={`/profile/${c.user_id}`} className="feed-comment-author">
              {c.profiles?.company_name || c.profiles?.full_name || 'Member'}
            </Link>
            <span className="feed-comment-body">{c.body}</span>
          </div>
        ))
      )}
      <form className="feed-comment-form" onSubmit={submitComment}>
        <input value={text} onChange={e => setText(e.target.value)} placeholder="Write a comment…" />
        <button type="submit" disabled={submitting || !text.trim()} aria-label="Send comment">
          <Send size={14} />
        </button>
      </form>
    </div>
  )
}

function timeAgo(iso) {
  if (!iso) return ''
  const diffMs = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  return new Date(iso).toLocaleDateString()
}
