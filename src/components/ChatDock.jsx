import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { MessageCircle, X, Minus, Send, Loader, Search, Plus } from 'lucide-react'
import { supabase } from '../lib/supabase'
import './ChatDock.css'

const API_BASE = import.meta.env.VITE_API_URL || ''
const MAX_POPUPS = 3

// Persistent, old-Facebook-style chat dock — fixed to the bottom-right of
// every authenticated page (mounted once in AppShell, not per-route), so a
// conversation stays open while you navigate between WARDOG, Pipeline, etc.
// The dedicated /messages page (Messages.jsx) is still the full inbox for
// browsing/searching everything; this dock is for "keep chatting while I do
// something else." Both read/write the same chat_threads/chat_messages
// tables, so a message sent from one shows up instantly in the other via
// the same Realtime postgres_changes pattern.
export default function ChatDock({ userId }) {
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState(true)
  const [threads, setThreads] = useState([])
  const [popups, setPopups] = useState([]) // [{ id, name, minimized }]
  const [showSearch, setShowSearch] = useState(false)

  const loadThreads = useCallback(async () => {
    if (!userId || !API_BASE) return
    try {
      const res = await fetch(`${API_BASE}/api/v1/chat/threads/mine?user_id=${userId}`)
      if (res.ok) setThreads((await res.json()).threads || [])
    } catch (err) {
      console.error('ChatDock: failed to load threads', err)
    }
  }, [userId])

  useEffect(() => { loadThreads() }, [loadThreads])

  // Lightweight list-level subscription just to keep the dock bar's preview
  // text, ordering, and unread badges fresh — each open popup additionally
  // subscribes to its own thread (filtered) so it can append live without
  // waiting on this broader refresh.
  useEffect(() => {
    if (!userId) return
    const channel = supabase
      .channel('chat-dock-list')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' }, () => loadThreads())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [userId, loadThreads])

  function openPopup(thread) {
    const name = thread.other_participants?.map(p => p.full_name || 'Member').join(', ') || 'Conversation'
    setPopups(prev => {
      const exists = prev.find(p => p.id === thread.id)
      if (exists) return prev.map(p => p.id === thread.id ? { ...p, minimized: false } : p)
      return [...prev, { id: thread.id, name, minimized: false }].slice(-MAX_POPUPS)
    })
    setCollapsed(true)
  }

  function closePopup(id) {
    setPopups(prev => prev.filter(p => p.id !== id))
  }

  function toggleMinimize(id) {
    setPopups(prev => prev.map(p => p.id === id ? { ...p, minimized: !p.minimized } : p))
  }

  async function startWith(person) {
    setShowSearch(false)
    const res = await fetch(`${API_BASE}/api/v1/chat/threads/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, other_user_id: person.id, post_id: null }),
    })
    if (res.ok) {
      const data = await res.json()
      openPopup({ id: data.thread_id, other_participants: [{ full_name: person.full_name || person.company_name }] })
      loadThreads()
    }
  }

  if (!userId) return null

  const totalUnread = threads.reduce((sum, t) => sum + (t.unread_count || 0), 0)

  return (
    <div className="dock-root">
      {popups.map(p => (
        <ChatPopup
          key={p.id}
          userId={userId}
          threadId={p.id}
          name={p.name}
          minimized={p.minimized}
          onClose={() => closePopup(p.id)}
          onToggleMinimize={() => toggleMinimize(p.id)}
          onMessageSent={loadThreads}
        />
      ))}

      <div className="dock-bar">
        <button className="dock-bar-head" onClick={() => setCollapsed(v => !v)}>
          <MessageCircle size={15} />
          <span>Chats</span>
          {totalUnread > 0 && <span className="dock-unread-badge">{totalUnread}</span>}
        </button>
        {!collapsed && (
          <div className="dock-list">
            <div className="dock-list-head">
              <span>Conversations</span>
              <div className="dock-list-actions">
                <button onClick={() => setShowSearch(true)} aria-label="New chat"><Plus size={14} /></button>
                <button onClick={() => navigate('/messages')}>Open inbox</button>
              </div>
            </div>
            {threads.length === 0 ? (
              <div className="dock-empty">No conversations yet.</div>
            ) : (
              threads.map(t => {
                const name = t.other_participants?.map(p => p.full_name || 'Member').join(', ') || 'Conversation'
                return (
                  <button key={t.id} className="dock-list-row" onClick={() => openPopup(t)}>
                    <span className="dock-avatar">{initials(name)}</span>
                    <span className="dock-list-info">
                      <span className="dock-list-name">{name}</span>
                      <span className="dock-list-preview">{t.last_message?.body || 'No messages yet'}</span>
                    </span>
                    {t.unread_count > 0 && <span className="dock-unread-badge">{t.unread_count}</span>}
                  </button>
                )
              })
            )}
          </div>
        )}
      </div>

      {showSearch && <DockSearch userId={userId} onPick={startWith} onClose={() => setShowSearch(false)} />}
    </div>
  )
}

function ChatPopup({ userId, threadId, name, minimized, onClose, onToggleMinimize, onMessageSent }) {
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef(null)

  const loadMessages = useCallback(async () => {
    if (!API_BASE) return
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/v1/chat/threads/${threadId}/messages?user_id=${userId}`)
      if (res.ok) setMessages((await res.json()).messages || [])
      fetch(`${API_BASE}/api/v1/chat/threads/${threadId}/read`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId }),
      }).catch(() => {})
    } catch (err) {
      console.error('ChatPopup: failed to load messages', err)
    } finally {
      setLoading(false)
    }
  }, [threadId, userId])

  useEffect(() => { loadMessages() }, [loadMessages])

  useEffect(() => {
    if (!minimized) bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length, minimized])

  // Filtered to this thread only, so opening several popups at once doesn't
  // mean each one re-renders on every message sent platform-wide.
  useEffect(() => {
    const channel = supabase
      .channel(`dock-thread-${threadId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `thread_id=eq.${threadId}` }, payload => {
        const msg = payload.new
        setMessages(prev => prev.some(m => m.id === msg.id) ? prev : [...prev, msg])
        if (msg.sender_id !== userId) {
          fetch(`${API_BASE}/api/v1/chat/threads/${threadId}/read`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: userId }),
          }).catch(() => {})
        }
        onMessageSent()
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [threadId, userId, onMessageSent])

  async function send() {
    const body = draft.trim()
    if (!body || sending) return
    setSending(true)
    setDraft('')
    try {
      const res = await fetch(`${API_BASE}/api/v1/chat/threads/${threadId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, body }),
      })
      if (res.ok) {
        const created = await res.json()
        setMessages(prev => prev.some(m => m.id === created.id) ? prev : [...prev, created])
        onMessageSent()
      }
    } finally {
      setSending(false)
    }
  }

  return (
    <div className={`dock-popup ${minimized ? 'dock-popup-min' : ''}`}>
      <div className="dock-popup-head" onClick={onToggleMinimize}>
        <span className="dock-avatar dock-avatar-sm">{initials(name)}</span>
        <span className="dock-popup-name">{name}</span>
        <div className="dock-popup-actions">
          <button onClick={e => { e.stopPropagation(); onToggleMinimize() }} aria-label="Minimize"><Minus size={13} /></button>
          <button onClick={e => { e.stopPropagation(); onClose() }} aria-label="Close"><X size={13} /></button>
        </div>
      </div>
      {!minimized && (
        <>
          <div className="dock-popup-body">
            {loading ? (
              <div className="dock-loading"><Loader size={14} className="spin" /></div>
            ) : messages.length === 0 ? (
              <div className="dock-empty-thread">Say hello.</div>
            ) : (
              messages.map(m => (
                <div key={m.id} className={`dock-bubble ${m.sender_id === userId ? 'dock-bubble-mine' : ''}`}>{m.body}</div>
              ))
            )}
            <div ref={bottomRef} />
          </div>
          <div className="dock-popup-input">
            <input
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') send() }}
              placeholder="Type a message…"
            />
            <button onClick={send} disabled={sending || !draft.trim()} aria-label="Send"><Send size={13} /></button>
          </div>
        </>
      )}
    </div>
  )
}

function DockSearch({ userId, onPick, onClose }) {
  const [q, setQ] = useState('')
  const [people, setPeople] = useState([])
  const [loading, setLoading] = useState(true)
  const debounceRef = useRef(null)

  const search = useCallback((query) => {
    if (!userId || !API_BASE) return
    setLoading(true)
    fetch(`${API_BASE}/api/v1/chat/people/search?user_id=${userId}&q=${encodeURIComponent(query)}`)
      .then(res => res.ok ? res.json() : { people: [] })
      .then(data => setPeople(data.people || []))
      .catch(() => setPeople([]))
      .finally(() => setLoading(false))
  }, [userId])

  useEffect(() => { search('') }, [search])

  function onChange(value) {
    setQ(value)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => search(value), 300)
  }

  return (
    <div className="dock-search-overlay" onClick={onClose}>
      <div className="dock-search-panel" onClick={e => e.stopPropagation()}>
        <div className="dock-search-head">
          <span>New chat</span>
          <button onClick={onClose} aria-label="Close"><X size={14} /></button>
        </div>
        <div className="dock-search-input-row">
          <Search size={13} />
          <input autoFocus value={q} onChange={e => onChange(e.target.value)} placeholder="Search people…" />
        </div>
        <div className="dock-search-results">
          {loading ? (
            <div className="dock-loading"><Loader size={14} className="spin" /></div>
          ) : people.length === 0 ? (
            <div className="dock-empty-thread">No one found.</div>
          ) : (
            people.map(p => (
              <button key={p.id} className="dock-list-row" onClick={() => onPick(p)}>
                <span className="dock-avatar">{initials(p.full_name || p.company_name)}</span>
                <span className="dock-list-info">
                  <span className="dock-list-name">{p.full_name || 'FASS Flow member'}</span>
                  {p.company_name && <span className="dock-list-preview">{p.company_name}</span>}
                </span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

function initials(name) {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0][0].toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}
