import { useState, useEffect, useRef, useCallback } from 'react'
import { useLocation } from 'react-router-dom'
import { MessageCircle, Search, Send, Loader, X, Plus, ArrowLeft } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import './Messages.css'

const API_BASE = import.meta.env.VITE_API_URL || ''

// Platform-wide Messenger — replaces the old "Messages" tab buried inside
// Team Up. Anyone can find and DM anyone else here (see GET
// /chat/people/search), not just someone who posted to the partner board.
// Delivery is push-based: one Supabase Realtime subscription on
// chat_messages for the life of this page, instead of polling. RLS already
// scopes each row to its participants (partner_network.sql), so Realtime
// only ever delivers rows this user is actually allowed to see — no
// thread-id allowlist needed client-side.
export default function Messages() {
  const { session } = useAuth()
  const location = useLocation()
  const userId = session?.user?.id

  const [threads, setThreads] = useState([])
  const [loadingThreads, setLoadingThreads] = useState(true)
  const [activeId, setActiveId] = useState(location.state?.openThreadId || null)
  const [activeName, setActiveName] = useState(location.state?.openName || null)
  const [messages, setMessages] = useState([])
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const [mobileShowThread, setMobileShowThread] = useState(Boolean(location.state?.openThreadId))
  const bottomRef = useRef(null)

  const loadThreads = useCallback(async () => {
    if (!userId || !API_BASE) return
    try {
      const res = await fetch(`${API_BASE}/api/v1/chat/threads/mine?user_id=${userId}`)
      if (res.ok) setThreads((await res.json()).threads || [])
    } catch (err) {
      console.error('Messages: failed to load threads', err)
    } finally {
      setLoadingThreads(false)
    }
  }, [userId])

  useEffect(() => { loadThreads() }, [loadThreads])

  const loadMessages = useCallback(async (threadId) => {
    if (!userId || !API_BASE || !threadId) return
    setLoadingMessages(true)
    try {
      const res = await fetch(`${API_BASE}/api/v1/chat/threads/${threadId}/messages?user_id=${userId}`)
      if (res.ok) setMessages((await res.json()).messages || [])
      fetch(`${API_BASE}/api/v1/chat/threads/${threadId}/read`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId }),
      }).then(loadThreads).catch(() => {})
    } catch (err) {
      console.error('Messages: failed to load messages', err)
    } finally {
      setLoadingMessages(false)
    }
  }, [userId, loadThreads])

  useEffect(() => {
    if (activeId) loadMessages(activeId)
  }, [activeId, loadMessages])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  // One realtime channel for the page's lifetime — new-message events both
  // refresh the conversation list (preview + unread badge + reordering) and,
  // if they belong to the thread currently open, append live instead of
  // waiting for a manual refresh.
  useEffect(() => {
    if (!userId) return
    const channel = supabase
      .channel('messages-inbox')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' }, payload => {
        const msg = payload.new
        loadThreads()
        if (msg.thread_id === activeId) {
          setMessages(prev => prev.some(m => m.id === msg.id) ? prev : [...prev, msg])
          if (msg.sender_id !== userId) {
            fetch(`${API_BASE}/api/v1/chat/threads/${msg.thread_id}/read`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ user_id: userId }),
            }).catch(() => {})
          }
        }
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- activeId read inside the callback via closure on purpose; resubscribing per change would drop in-flight events
  }, [userId])

  function openThread(t) {
    setActiveId(t.id)
    setActiveName(t.other_participants?.map(p => p.full_name || 'Member').join(', ') || 'Conversation')
    setMobileShowThread(true)
  }

  async function startThreadWith(person) {
    setShowSearch(false)
    const res = await fetch(`${API_BASE}/api/v1/chat/threads/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, other_user_id: person.id, post_id: null }),
    })
    if (res.ok) {
      const data = await res.json()
      setActiveId(data.thread_id)
      setActiveName(person.full_name || person.company_name || 'Conversation')
      setMobileShowThread(true)
      loadThreads()
    }
  }

  async function send() {
    const body = draft.trim()
    if (!body || sending || !activeId) return
    setSending(true)
    setDraft('')
    try {
      const res = await fetch(`${API_BASE}/api/v1/chat/threads/${activeId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, body }),
      })
      if (res.ok) {
        const created = await res.json()
        setMessages(prev => prev.some(m => m.id === created.id) ? prev : [...prev, created])
        loadThreads()
      }
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="msg-page">
      <div className={`msg-sidebar ${mobileShowThread ? 'msg-sidebar-hidden-mobile' : ''}`}>
        <div className="msg-sidebar-head">
          <h1><MessageCircle size={19} /> Messages</h1>
          <button className="msg-new-btn" onClick={() => setShowSearch(true)} aria-label="New message">
            <Plus size={16} />
          </button>
        </div>
        {loadingThreads ? (
          <div className="msg-loading"><Loader size={18} className="spin" /></div>
        ) : threads.length === 0 ? (
          <div className="msg-empty">
            No conversations yet.
            <button className="btn-outline msg-empty-cta" onClick={() => setShowSearch(true)}>Find someone to message</button>
          </div>
        ) : (
          <div className="msg-thread-list">
            {threads.map(t => {
              const name = t.other_participants?.map(p => p.full_name || 'Member').join(', ') || 'Conversation'
              return (
                <button
                  key={t.id}
                  className={`msg-thread-row ${t.id === activeId ? 'msg-thread-row-active' : ''}`}
                  onClick={() => openThread(t)}
                >
                  <span className="msg-avatar">{initials(name)}</span>
                  <span className="msg-thread-info">
                    <span className="msg-thread-name">{name}</span>
                    <span className="msg-thread-preview">{t.last_message?.body || 'No messages yet'}</span>
                  </span>
                  {t.unread_count > 0 && <span className="msg-unread-badge">{t.unread_count}</span>}
                </button>
              )
            })}
          </div>
        )}
      </div>

      <div className={`msg-panel ${mobileShowThread ? '' : 'msg-panel-hidden-mobile'}`}>
        {!activeId ? (
          <div className="msg-panel-empty">
            <MessageCircle size={28} />
            <p>Pick a conversation, or start a new one.</p>
          </div>
        ) : (
          <>
            <div className="msg-panel-head">
              <button className="msg-back-btn" onClick={() => setMobileShowThread(false)} aria-label="Back"><ArrowLeft size={18} /></button>
              <span className="msg-avatar">{initials(activeName)}</span>
              <span>{activeName}</span>
            </div>
            <div className="msg-body">
              {loadingMessages ? (
                <div className="msg-loading"><Loader size={18} className="spin" /></div>
              ) : messages.length === 0 ? (
                <div className="msg-empty-thread">Say hello — this is the start of your conversation.</div>
              ) : (
                messages.map(m => (
                  <div key={m.id} className={`msg-bubble ${m.sender_id === userId ? 'msg-bubble-mine' : ''}`}>
                    {m.body}
                  </div>
                ))
              )}
              <div ref={bottomRef} />
            </div>
            <div className="msg-input-row">
              <input
                value={draft}
                onChange={e => setDraft(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') send() }}
                placeholder="Type a message…"
              />
              <button onClick={send} disabled={sending || !draft.trim()} aria-label="Send">
                <Send size={15} />
              </button>
            </div>
          </>
        )}
      </div>

      {showSearch && <PeopleSearch userId={userId} onPick={startThreadWith} onClose={() => setShowSearch(false)} />}
    </div>
  )
}

function PeopleSearch({ userId, onPick, onClose }) {
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
    <div className="msg-search-overlay" onClick={onClose}>
      <div className="msg-search-panel" onClick={e => e.stopPropagation()}>
        <div className="msg-search-head">
          <h3>New message</h3>
          <button onClick={onClose} aria-label="Close"><X size={16} /></button>
        </div>
        <div className="msg-search-input-row">
          <Search size={15} />
          <input autoFocus value={q} onChange={e => onChange(e.target.value)} placeholder="Search people by name…" />
        </div>
        <div className="msg-search-results">
          {loading ? (
            <div className="msg-loading"><Loader size={16} className="spin" /></div>
          ) : people.length === 0 ? (
            <div className="msg-empty-thread">No one found.</div>
          ) : (
            people.map(p => (
              <button key={p.id} className="msg-search-result" onClick={() => onPick(p)}>
                <span className="msg-avatar">{initials(p.full_name || p.company_name)}</span>
                <span className="msg-thread-info">
                  <span className="msg-thread-name">{p.full_name || 'FASS Flow member'}</span>
                  {p.company_name && <span className="msg-thread-preview">{p.company_name}</span>}
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
