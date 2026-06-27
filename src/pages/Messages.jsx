import { useState, useEffect, useRef, useCallback } from 'react'
import { useLocation } from 'react-router-dom'
import {
  MessageCircle, Search, Send, Loader, X, Plus, ArrowLeft, Paperclip,
  Smile, MoreHorizontal, Pencil, Trash2, Bell, BellOff, Check, CheckCheck,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { usePresence } from '../hooks/usePresence'
import { useTyping } from '../hooks/useTyping'
import { usePushNotifications } from '../hooks/usePushNotifications'
import './Messages.css'

const API_BASE = import.meta.env.VITE_API_URL || ''
const REACTION_EMOJI = ['👍', '❤️', '😂', '😮', '😢', '🙏']

// Platform-wide Messenger — replaces the old "Messages" tab buried inside
// Team Up. Anyone can find and DM anyone else here (see GET
// /chat/people/search), not just someone who posted to the partner board.
// Delivery is push-based: one Supabase Realtime subscription on
// chat_messages (INSERT + UPDATE) for the life of this page, instead of
// polling. RLS already scopes each row to its participants
// (partner_network.sql), so Realtime only ever delivers rows this user is
// actually allowed to see — no thread-id allowlist needed client-side.
//
// v2: presence dots + typing (Supabase Presence/Broadcast, no schema),
// "Seen" via the existing read_by column reacting to UPDATE events,
// attachments, emoji reactions, edit/delete, and Web Push opt-in.
export default function Messages() {
  const { session } = useAuth()
  const location = useLocation()
  const userId = session?.user?.id

  const [threads, setThreads] = useState([])
  const [loadingThreads, setLoadingThreads] = useState(true)
  const [activeId, setActiveId] = useState(location.state?.openThreadId || null)
  const [activeName, setActiveName] = useState(location.state?.openName || null)
  const [activeOtherId, setActiveOtherId] = useState(null)
  const [messages, setMessages] = useState([])
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const [mobileShowThread, setMobileShowThread] = useState(Boolean(location.state?.openThreadId))
  const [editingId, setEditingId] = useState(null)
  const [editDraft, setEditDraft] = useState('')
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)
  const [openMenuId, setOpenMenuId] = useState(null)
  const [openPickerId, setOpenPickerId] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [startError, setStartError] = useState(null)
  const bottomRef = useRef(null)
  const fileInputRef = useRef(null)

  const onlineIds = usePresence(userId)
  const { typingUserIds, sendTyping } = useTyping(activeId, userId)
  const { permission: pushPermission, enable: enablePush, supported: pushSupported } = usePushNotifications(userId)

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

  // One realtime channel for the page's lifetime. INSERT events append new
  // messages / refresh previews; UPDATE events cover both "Seen" (read_by
  // changed) and edit/delete (body/edited_at/deleted_at changed) — all three
  // are just "this row changed, reconcile it" from the client's perspective.
  useEffect(() => {
    if (!userId) return
    const channel = supabase
      .channel('messages-inbox')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' }, payload => {
        const msg = payload.new
        loadThreads()
        if (msg.thread_id === activeId) {
          setMessages(prev => prev.some(m => m.id === msg.id) ? prev : [...prev, { ...msg, reactions: [] }])
          if (msg.sender_id !== userId) {
            fetch(`${API_BASE}/api/v1/chat/threads/${msg.thread_id}/read`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ user_id: userId }),
            }).catch(() => {})
          }
        }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'chat_messages' }, payload => {
        const msg = payload.new
        if (msg.thread_id === activeId) {
          setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, ...msg, reactions: m.reactions } : m))
        }
        loadThreads()
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- activeId read inside the callback via closure on purpose; resubscribing per change would drop in-flight events
  }, [userId])

  function openThread(t) {
    setActiveId(t.id)
    setActiveName(t.other_participants?.map(p => p.full_name || 'Member').join(', ') || 'Conversation')
    setActiveOtherId(t.other_participants?.[0]?.user_id || null)
    setMobileShowThread(true)
  }

  async function startThreadWith(person) {
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
      setActiveId(data.thread_id)
      setActiveName(person.full_name || person.company_name || 'Conversation')
      setActiveOtherId(person.id)
      setMobileShowThread(true)
      loadThreads()
    } catch {
      setStartError('Network error — could not reach the server.')
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

  function onDraftChange(value) {
    setDraft(value)
    sendTyping()
  }

  async function uploadFile(file) {
    if (!file || !activeId) return
    setUploading(true)
    try {
      const form = new FormData()
      form.append('user_id', userId)
      form.append('file', file)
      const res = await fetch(`${API_BASE}/api/v1/chat/threads/${activeId}/attachments`, { method: 'POST', body: form })
      if (res.ok) {
        const created = await res.json()
        setMessages(prev => prev.some(m => m.id === created.id) ? prev : [...prev, created])
        loadThreads()
      }
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  function startEdit(m) {
    setOpenMenuId(null)
    setEditingId(m.id)
    setEditDraft(m.body)
  }

  async function saveEdit() {
    const body = editDraft.trim()
    if (!body || !activeId || !editingId) return
    const res = await fetch(`${API_BASE}/api/v1/chat/threads/${activeId}/messages/${editingId}`, {
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
    const res = await fetch(`${API_BASE}/api/v1/chat/threads/${activeId}/messages/${messageId}`, {
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

  const lastMineId = [...messages].reverse().find(m => m.sender_id === userId)?.id
  const lastMine = messages.find(m => m.id === lastMineId)
  const seenByOther = activeOtherId && lastMine && (lastMine.read_by || []).includes(activeOtherId)

  return (
    <div className="msg-page">
      <div className={`msg-sidebar ${mobileShowThread ? 'msg-sidebar-hidden-mobile' : ''}`}>
        <div className="msg-sidebar-head">
          <h1><MessageCircle size={19} /> Messages</h1>
          <div className="msg-sidebar-head-actions">
            {pushSupported && pushPermission !== 'granted' && (
              <button className="msg-bell-btn" onClick={enablePush} title="Enable notifications" aria-label="Enable notifications">
                <BellOff size={15} />
              </button>
            )}
            {pushPermission === 'granted' && <Bell size={15} className="msg-bell-on" title="Notifications on" />}
            <button className="msg-new-btn" onClick={() => setShowSearch(true)} aria-label="New message">
              <Plus size={16} />
            </button>
          </div>
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
              const otherId = t.other_participants?.[0]?.user_id
              return (
                <button
                  key={t.id}
                  className={`msg-thread-row ${t.id === activeId ? 'msg-thread-row-active' : ''}`}
                  onClick={() => openThread(t)}
                >
                  <span className="msg-avatar-wrap">
                    <span className="msg-avatar">{initials(name)}</span>
                    {otherId && onlineIds.has(otherId) && <span className="msg-online-dot" />}
                  </span>
                  <span className="msg-thread-info">
                    <span className="msg-thread-name">{name}</span>
                    <span className="msg-thread-preview">
                      {t.last_message?.deleted_at ? 'Message deleted' : (t.last_message?.body || (t.last_message ? '📎 Attachment' : 'No messages yet'))}
                    </span>
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
              <span className="msg-avatar-wrap">
                <span className="msg-avatar">{initials(activeName)}</span>
                {activeOtherId && onlineIds.has(activeOtherId) && <span className="msg-online-dot" />}
              </span>
              <span>
                {activeName}
                {activeOtherId && (
                  <span className="msg-presence-label">{onlineIds.has(activeOtherId) ? 'Online' : ''}</span>
                )}
              </span>
            </div>
            <div className="msg-body">
              {loadingMessages ? (
                <div className="msg-loading"><Loader size={18} className="spin" /></div>
              ) : messages.length === 0 ? (
                <div className="msg-empty-thread">Say hello — this is the start of your conversation.</div>
              ) : (
                messages.map(m => {
                  const mine = m.sender_id === userId
                  const isEditing = editingId === m.id
                  return (
                    <div key={m.id} className={`msg-row ${mine ? 'msg-row-mine' : ''}`}>
                      <div className={`msg-bubble ${mine ? 'msg-bubble-mine' : ''}`}>
                        {m.deleted_at ? (
                          <span className="msg-deleted-text">Message deleted</span>
                        ) : isEditing ? (
                          <div className="msg-edit-row">
                            <input
                              autoFocus
                              value={editDraft}
                              onChange={e => setEditDraft(e.target.value)}
                              onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditingId(null) }}
                            />
                            <button onClick={saveEdit}><Check size={13} /></button>
                            <button onClick={() => setEditingId(null)}><X size={13} /></button>
                          </div>
                        ) : (
                          <>
                            {m.attachment_url && (
                              isImageType(m.attachment_type) ? (
                                <a href={m.attachment_url} target="_blank" rel="noreferrer">
                                  <img src={m.attachment_url} alt={m.attachment_name || 'attachment'} className="msg-attachment-img" />
                                </a>
                              ) : (
                                <a href={m.attachment_url} target="_blank" rel="noreferrer" className="msg-attachment-file">
                                  <Paperclip size={13} /> {m.attachment_name || 'Attachment'}
                                </a>
                              )
                            )}
                            {m.body && <span>{m.body}</span>}
                            {m.edited_at && <span className="msg-edited-tag"> (edited)</span>}
                          </>
                        )}

                        {!m.deleted_at && m.reactions?.length > 0 && (
                          <div className="msg-reactions">
                            {m.reactions.map(r => (
                              <button
                                key={r.emoji}
                                className={`msg-reaction-chip ${r.user_ids.includes(userId) ? 'msg-reaction-mine' : ''}`}
                                onClick={() => toggleReaction(m.id, r.emoji)}
                              >
                                {r.emoji} {r.user_ids.length}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {!m.deleted_at && !isEditing && (
                        <div className="msg-hover-actions">
                          <button onClick={() => setOpenPickerId(openPickerId === m.id ? null : m.id)} aria-label="React"><Smile size={14} /></button>
                          {mine && (
                            <button onClick={() => setOpenMenuId(openMenuId === m.id ? null : m.id)} aria-label="More"><MoreHorizontal size={14} /></button>
                          )}
                        </div>
                      )}

                      {openPickerId === m.id && (
                        <div className="msg-emoji-picker">
                          {REACTION_EMOJI.map(e => (
                            <button key={e} onClick={() => toggleReaction(m.id, e)}>{e}</button>
                          ))}
                        </div>
                      )}

                      {openMenuId === m.id && (
                        <div className="msg-action-menu">
                          <button onClick={() => startEdit(m)}><Pencil size={12} /> Edit</button>
                          <button onClick={() => { setOpenMenuId(null); setConfirmDeleteId(m.id) }}><Trash2 size={12} /> Delete</button>
                        </div>
                      )}

                      {confirmDeleteId === m.id && (
                        <div className="msg-confirm-overlay" onClick={() => setConfirmDeleteId(null)}>
                          <div className="msg-confirm-box" onClick={e => e.stopPropagation()}>
                            <p>Delete this message?</p>
                            <div className="msg-confirm-actions">
                              <button className="btn-outline" onClick={() => setConfirmDeleteId(null)}>Cancel</button>
                              <button className="msg-confirm-delete" onClick={() => confirmDelete(m.id)}>Delete</button>
                            </div>
                          </div>
                        </div>
                      )}

                      {mine && m.id === lastMineId && !m.deleted_at && (
                        <span className="msg-seen-label">
                          {seenByOther ? (<><CheckCheck size={11} /> Seen</>) : (<><Check size={11} /> Sent</>)}
                        </span>
                      )}
                    </div>
                  )
                })
              )}
              {typingUserIds.size > 0 && (
                <div className="msg-typing-indicator">{activeName?.split(' ')[0] || 'They'} is typing…</div>
              )}
              <div ref={bottomRef} />
            </div>
            <div className="msg-input-row">
              <input type="file" ref={fileInputRef} className="msg-file-input" onChange={e => uploadFile(e.target.files?.[0])} />
              <button
                className="msg-attach-btn"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                aria-label="Attach file"
              >
                {uploading ? <Loader size={15} className="spin" /> : <Paperclip size={15} />}
              </button>
              <input
                value={draft}
                onChange={e => onDraftChange(e.target.value)}
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

      {showSearch && (
        <PeopleSearch
          userId={userId}
          onPick={startThreadWith}
          onClose={() => { setShowSearch(false); setStartError(null) }}
          error={startError}
        />
      )}
    </div>
  )
}

function isImageType(mime) {
  return Boolean(mime && mime.startsWith('image/'))
}

function PeopleSearch({ userId, onPick, onClose, error }) {
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
        {error && <div className="msg-search-error">{error}</div>}
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
