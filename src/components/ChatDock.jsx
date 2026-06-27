import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  MessageCircle, X, Minus, Send, Loader, Search, Plus, Paperclip,
  Smile, MoreHorizontal, Pencil, Trash2, Check, CheckCheck,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { usePresence } from '../hooks/usePresence'
import './ChatDock.css'

const REACTION_EMOJI = ['👍', '❤️', '😂', '😮', '😢', '🙏']

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
  const [popups, setPopups] = useState([]) // [{ id, name, minimized, otherId }]
  const [showSearch, setShowSearch] = useState(false)
  const [startError, setStartError] = useState(null)
  const onlineIds = usePresence(userId)

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
    const otherId = thread.other_participants?.[0]?.user_id || null
    setPopups(prev => {
      const exists = prev.find(p => p.id === thread.id)
      if (exists) return prev.map(p => p.id === thread.id ? { ...p, minimized: false } : p)
      return [...prev, { id: thread.id, name, minimized: false, otherId }].slice(-MAX_POPUPS)
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
    setStartError(null)
    try {
      const res = await fetch(`${API_BASE}/api/v1/chat/threads/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, other_user_id: person.id, post_id: null }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        setStartError(err.detail || `Couldn't start that conversation (${res.status}).`)
        return
      }
      const data = await res.json()
      setShowSearch(false)
      openPopup({ id: data.thread_id, other_participants: [{ user_id: person.id, full_name: person.full_name || person.company_name }] })
      loadThreads()
    } catch {
      setStartError('Network error — could not reach the server.')
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
          online={p.otherId ? onlineIds.has(p.otherId) : false}
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
                const otherId = t.other_participants?.[0]?.user_id
                return (
                  <button key={t.id} className="dock-list-row" onClick={() => openPopup(t)}>
                    <span className="dock-avatar-wrap">
                      <span className="dock-avatar">{initials(name)}</span>
                      {otherId && onlineIds.has(otherId) && <span className="dock-online-dot" />}
                    </span>
                    <span className="dock-list-info">
                      <span className="dock-list-name">{name}</span>
                      <span className="dock-list-preview">
                        {t.last_message?.deleted_at ? 'Message deleted' : (t.last_message?.body || (t.last_message ? '📎 Attachment' : 'No messages yet'))}
                      </span>
                    </span>
                    {t.unread_count > 0 && <span className="dock-unread-badge">{t.unread_count}</span>}
                  </button>
                )
              })
            )}
          </div>
        )}
      </div>

      {showSearch && (
        <DockSearch
          userId={userId}
          onPick={startWith}
          onClose={() => { setShowSearch(false); setStartError(null) }}
          error={startError}
        />
      )}
    </div>
  )
}

function ChatPopup({ userId, threadId, name, minimized, online, onClose, onToggleMinimize, onMessageSent }) {
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [openMenuId, setOpenMenuId] = useState(null)
  const [openPickerId, setOpenPickerId] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [editDraft, setEditDraft] = useState('')
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)
  const bottomRef = useRef(null)
  const fileInputRef = useRef(null)

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
  // mean each one re-renders on every message sent platform-wide. UPDATE
  // events cover Seen / edit / delete the same way Messages.jsx handles them.
  useEffect(() => {
    const channel = supabase
      .channel(`dock-thread-${threadId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `thread_id=eq.${threadId}` }, payload => {
        const msg = payload.new
        setMessages(prev => prev.some(m => m.id === msg.id) ? prev : [...prev, { ...msg, reactions: [] }])
        if (msg.sender_id !== userId) {
          fetch(`${API_BASE}/api/v1/chat/threads/${threadId}/read`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: userId }),
          }).catch(() => {})
        }
        onMessageSent()
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'chat_messages', filter: `thread_id=eq.${threadId}` }, payload => {
        const msg = payload.new
        setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, ...msg, reactions: m.reactions } : m))
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

  async function uploadFile(file) {
    if (!file) return
    setUploading(true)
    try {
      const form = new FormData()
      form.append('user_id', userId)
      form.append('file', file)
      const res = await fetch(`${API_BASE}/api/v1/chat/threads/${threadId}/attachments`, { method: 'POST', body: form })
      if (res.ok) {
        const created = await res.json()
        setMessages(prev => prev.some(m => m.id === created.id) ? prev : [...prev, created])
        onMessageSent()
      }
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  async function saveEdit() {
    const body = editDraft.trim()
    if (!body || !editingId) return
    const res = await fetch(`${API_BASE}/api/v1/chat/threads/${threadId}/messages/${editingId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, body }),
    })
    if (res.ok) {
      const updated = await res.json()
      setMessages(prev => prev.map(m => m.id === updated.id ? updated : m))
    }
    setEditingId(null)
  }

  async function confirmDelete(messageId) {
    setConfirmDeleteId(null)
    const res = await fetch(`${API_BASE}/api/v1/chat/threads/${threadId}/messages/${messageId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId }),
    })
    if (res.ok) {
      const updated = await res.json()
      setMessages(prev => prev.map(m => m.id === updated.id ? updated : m))
    }
  }

  async function toggleReaction(messageId, emoji) {
    setOpenPickerId(null)
    const res = await fetch(`${API_BASE}/api/v1/chat/messages/${messageId}/reactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, emoji }),
    })
    if (res.ok) {
      const { reactions } = await res.json()
      setMessages(prev => prev.map(m => m.id === messageId ? { ...m, reactions } : m))
    }
  }

  return (
    <div className={`dock-popup ${minimized ? 'dock-popup-min' : ''}`}>
      <div className="dock-popup-head" onClick={onToggleMinimize}>
        <span className="dock-avatar-wrap">
          <span className="dock-avatar dock-avatar-sm">{initials(name)}</span>
          {online && <span className="dock-online-dot" />}
        </span>
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
              messages.map(m => {
                const mine = m.sender_id === userId
                const isEditing = editingId === m.id
                return (
                  <div key={m.id} className="dock-msg-row">
                    <div className={`dock-bubble ${mine ? 'dock-bubble-mine' : ''}`}>
                      {m.deleted_at ? (
                        <span className="dock-deleted-text">Message deleted</span>
                      ) : isEditing ? (
                        <div className="dock-edit-row">
                          <input
                            autoFocus
                            value={editDraft}
                            onChange={e => setEditDraft(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditingId(null) }}
                          />
                          <button onClick={saveEdit}><Check size={11} /></button>
                        </div>
                      ) : (
                        <>
                          {m.attachment_url && (
                            isImageType(m.attachment_type) ? (
                              <a href={m.attachment_url} target="_blank" rel="noreferrer">
                                <img src={m.attachment_url} alt={m.attachment_name || 'attachment'} className="dock-attachment-img" />
                              </a>
                            ) : (
                              <a href={m.attachment_url} target="_blank" rel="noreferrer" className="dock-attachment-file">
                                <Paperclip size={11} /> {m.attachment_name || 'Attachment'}
                              </a>
                            )
                          )}
                          {m.body && <span>{m.body}</span>}
                          {m.edited_at && <span className="dock-edited-tag"> (edited)</span>}
                        </>
                      )}
                      {!m.deleted_at && m.reactions?.length > 0 && (
                        <div className="dock-reactions">
                          {m.reactions.map(r => (
                            <button key={r.emoji} className="dock-reaction-chip" onClick={() => toggleReaction(m.id, r.emoji)}>
                              {r.emoji} {r.user_ids.length}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {!m.deleted_at && !isEditing && (
                      <div className="dock-hover-actions">
                        <button onClick={() => setOpenPickerId(openPickerId === m.id ? null : m.id)} aria-label="React"><Smile size={12} /></button>
                        {mine && <button onClick={() => setOpenMenuId(openMenuId === m.id ? null : m.id)} aria-label="More"><MoreHorizontal size={12} /></button>}
                      </div>
                    )}

                    {openPickerId === m.id && (
                      <div className="dock-emoji-picker">
                        {REACTION_EMOJI.map(e => <button key={e} onClick={() => toggleReaction(m.id, e)}>{e}</button>)}
                      </div>
                    )}

                    {openMenuId === m.id && (
                      <div className="dock-action-menu">
                        <button onClick={() => { setOpenMenuId(null); setEditingId(m.id); setEditDraft(m.body) }}><Pencil size={11} /> Edit</button>
                        <button onClick={() => { setOpenMenuId(null); setConfirmDeleteId(m.id) }}><Trash2 size={11} /> Delete</button>
                      </div>
                    )}

                    {confirmDeleteId === m.id && (
                      <div className="dock-confirm-overlay" onClick={() => setConfirmDeleteId(null)}>
                        <div className="dock-confirm-box" onClick={e => e.stopPropagation()}>
                          <p>Delete this message?</p>
                          <div className="dock-confirm-actions">
                            <button onClick={() => setConfirmDeleteId(null)}>Cancel</button>
                            <button className="dock-confirm-delete" onClick={() => confirmDelete(m.id)}>Delete</button>
                          </div>
                        </div>
                      </div>
                    )}

                    {mine && m.id === [...messages].reverse().find(x => x.sender_id === userId)?.id && !m.deleted_at && (
                      <span className="dock-seen-label">
                        {(m.read_by || []).length > 1 ? (<><CheckCheck size={10} /> Seen</>) : (<><Check size={10} /> Sent</>)}
                      </span>
                    )}
                  </div>
                )
              })
            )}
            <div ref={bottomRef} />
          </div>
          <div className="dock-popup-input">
            <input type="file" ref={fileInputRef} className="dock-file-input" onChange={e => uploadFile(e.target.files?.[0])} />
            <button className="dock-attach-btn" onClick={() => fileInputRef.current?.click()} disabled={uploading} aria-label="Attach file">
              {uploading ? <Loader size={12} className="spin" /> : <Paperclip size={12} />}
            </button>
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

function isImageType(mime) {
  return Boolean(mime && mime.startsWith('image/'))
}

function DockSearch({ userId, onPick, onClose, error }) {
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
        {error && <div className="dock-search-error">{error}</div>}
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
