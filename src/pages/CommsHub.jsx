import { useState, useEffect, useCallback } from 'react'
import { MessageCircle, Send, Loader, Plus, X } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import './CommsHub.css'

const API_BASE = import.meta.env.VITE_API_URL || ''

function timeAgo(iso) {
  if (!iso) return ''
  const diffMs = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

// Comms Hub — the CRM-style timeline on top of the self-hosted iMessage/SMS
// relay (see /mac-relay at the repo root). This page only talks to the
// queue (/comms/*) — actual delivery happens on a Mac running Messages.app,
// polling that same queue. A message can sit at "queued" for a few seconds
// after sending here if the relay's poll interval hasn't ticked yet; that's
// expected, not a bug.
export default function CommsHub() {
  const { session } = useAuth()
  const userId = session?.user?.id
  const [threads, setThreads] = useState([])
  const [loading, setLoading] = useState(true)
  const [activePhone, setActivePhone] = useState(null)
  const [thread, setThread] = useState([])
  const [threadLoading, setThreadLoading] = useState(false)
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [newPhone, setNewPhone] = useState('')

  const loadThreads = useCallback(async () => {
    if (!userId || !API_BASE) { setLoading(false); return }
    try {
      const res = await fetch(`${API_BASE}/api/v1/comms/threads?business_user_id=${userId}`)
      if (res.ok) {
        const data = await res.json()
        setThreads((data.threads || []).sort((a, b) => new Date(b.last_at) - new Date(a.last_at)))
      }
    } catch (err) {
      console.error('CommsHub: failed to load threads', err)
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    let cancelled = false
    async function loadAll() {
      await loadThreads()
      if (cancelled) return
    }
    loadAll()
    return () => { cancelled = true }
  }, [loadThreads])

  const loadThread = useCallback(async (phone) => {
    if (!userId || !phone) return
    setThreadLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/v1/comms/thread?business_user_id=${userId}&phone=${encodeURIComponent(phone)}`)
      if (res.ok) {
        const data = await res.json()
        setThread(data.messages || [])
      }
    } catch (err) {
      console.error('CommsHub: failed to load thread', err)
    } finally {
      setThreadLoading(false)
    }
  }, [userId])

  function openThread(phone) {
    setActivePhone(phone)
    setShowNew(false)
    loadThread(phone)
  }

  async function sendMessage(phone, body) {
    if (!userId || !phone.trim() || !body.trim()) return
    setSending(true)
    try {
      const res = await fetch(`${API_BASE}/api/v1/comms/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ business_user_id: userId, phone: phone.trim(), body: body.trim() }),
      })
      if (res.ok) {
        setDraft('')
        await loadThread(phone)
        await loadThreads()
        if (showNew) {
          setActivePhone(phone.trim())
          setShowNew(false)
        }
      }
    } catch (err) {
      console.error('CommsHub: failed to send', err)
    } finally {
      setSending(false)
    }
  }

  if (loading) {
    return (
      <div className="ch-page">
        <div className="ch-loading"><Loader size={20} className="ch-spin" /> Loading Comms Hub…</div>
      </div>
    )
  }

  return (
    <div className="ch-page">
      <div className="ch-head">
        <h1><MessageCircle size={20} /> Comms Hub</h1>
        <p className="ch-sub">Text reminders, confirmations, and replies — sent through your own iMessage/SMS relay.</p>
      </div>

      <div className="ch-layout">
        <div className="ch-list">
          <div className="ch-list-head">
            <span>Conversations</span>
            <button className="btn-outline ch-new-btn" onClick={() => { setShowNew(true); setActivePhone(null) }}>
              <Plus size={14} /> New
            </button>
          </div>
          {threads.length === 0 && !showNew && (
            <div className="ch-empty">No conversations yet. Start one with "New".</div>
          )}
          {threads.map(t => (
            <div
              key={t.phone}
              className={`ch-thread-row ${activePhone === t.phone ? 'ch-thread-active' : ''}`}
              onClick={() => openThread(t.phone)}
            >
              <div className="ch-thread-top">
                <span className="ch-thread-phone">{t.phone}</span>
                <span className="ch-thread-time">{timeAgo(t.last_at)}</span>
              </div>
              <div className="ch-thread-preview">
                {t.last_direction === 'out' ? 'You: ' : ''}{t.last_body}
              </div>
              {t.unread > 0 && <span className="ch-thread-unread">{t.unread}</span>}
            </div>
          ))}
        </div>

        <div className="ch-panel">
          {showNew && (
            <NewThread
              phone={newPhone}
              setPhone={setNewPhone}
              draft={draft}
              setDraft={setDraft}
              sending={sending}
              onSend={() => sendMessage(newPhone, draft)}
              onCancel={() => setShowNew(false)}
            />
          )}

          {!showNew && !activePhone && (
            <div className="ch-panel-empty">Select a conversation, or start a new one.</div>
          )}

          {!showNew && activePhone && (
            <>
              <div className="ch-panel-head">{activePhone}</div>
              <div className="ch-messages">
                {threadLoading && <div className="ch-empty">Loading…</div>}
                {!threadLoading && thread.map(m => (
                  <div key={m.id} className={`ch-bubble ${m.direction === 'out' ? 'ch-bubble-out' : 'ch-bubble-in'}`}>
                    <div className="ch-bubble-body">{m.body}</div>
                    <div className="ch-bubble-meta">
                      {timeAgo(m.created_at)}
                      {m.direction === 'out' && m.status === 'queued' && ' · sending…'}
                      {m.direction === 'out' && m.status === 'failed' && ' · failed'}
                    </div>
                  </div>
                ))}
              </div>
              <div className="ch-compose">
                <textarea
                  rows={2}
                  placeholder="Type a message…"
                  value={draft}
                  onChange={e => setDraft(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      sendMessage(activePhone, draft)
                    }
                  }}
                />
                <button className="btn-primary" disabled={sending || !draft.trim()} onClick={() => sendMessage(activePhone, draft)}>
                  <Send size={15} />
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function NewThread({ phone, setPhone, draft, setDraft, sending, onSend, onCancel }) {
  return (
    <div className="ch-new">
      <div className="ch-panel-head">
        New conversation
        <button className="ch-close" onClick={onCancel} aria-label="Cancel"><X size={15} /></button>
      </div>
      <input
        className="ch-new-input"
        placeholder="Phone number"
        value={phone}
        onChange={e => setPhone(e.target.value)}
      />
      <textarea
        rows={3}
        placeholder="Type a message…"
        value={draft}
        onChange={e => setDraft(e.target.value)}
      />
      <button className="btn-primary" disabled={sending || !phone.trim() || !draft.trim()} onClick={onSend}>
        <Send size={15} /> Send
      </button>
    </div>
  )
}
