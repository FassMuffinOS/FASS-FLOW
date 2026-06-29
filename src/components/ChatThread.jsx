import { useState, useEffect, useRef, useCallback } from 'react'
import { Send, Loader, X } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { apiFetch } from '../lib/apiClient'
import './ChatThread.css'

const API_BASE = import.meta.env.VITE_API_URL || ''
const POLL_MS = 4000

// Reusable thread view — used as an overlay from Team Up (and anywhere else
// a conversation needs to open later). Polls instead of using realtime
// websockets, matching this codebase's existing "good enough" pattern for
// background refresh (see AlertsBell). Marks the thread read on open and on
// every successful poll so an unread badge elsewhere clears promptly.
export default function ChatThread({ threadId, otherName, onClose }) {
  const { session } = useAuth()
  const userId = session?.user?.id
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef(null)

  const load = useCallback(async () => {
    if (!userId || !API_BASE || !threadId) return
    try {
      const res = await apiFetch(`/api/v1/chat/threads/${threadId}/messages?user_id=${userId}`)
      if (res.ok) {
        const data = await res.json()
        setMessages(data.messages || [])
      }
      apiFetch(`/api/v1/chat/threads/${threadId}/read`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId }),
      }).catch(() => {})
    } finally {
      setLoading(false)
    }
  }, [userId, threadId])

  useEffect(() => {
    load()
    const id = setInterval(load, POLL_MS)
    return () => clearInterval(id)
  }, [load])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  async function send() {
    const body = draft.trim()
    if (!body || sending) return
    setSending(true)
    setDraft('')
    try {
      const res = await apiFetch(`/api/v1/chat/threads/${threadId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, body }),
      })
      if (res.ok) {
        const created = await res.json()
        setMessages(prev => [...prev, created])
      }
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="chat-overlay" onClick={onClose}>
      <div className="chat-panel" onClick={e => e.stopPropagation()}>
        <div className="chat-header">
          <span>{otherName || 'Conversation'}</span>
          <button className="chat-close" onClick={onClose} aria-label="Close"><X size={16} /></button>
        </div>

        <div className="chat-body">
          {loading ? (
            <div className="chat-loading"><Loader size={16} className="spin" /></div>
          ) : messages.length === 0 ? (
            <div className="chat-empty">Say hello — this is the start of your conversation.</div>
          ) : (
            messages.map(m => (
              <div key={m.id} className={`chat-bubble ${m.sender_id === userId ? 'chat-bubble-mine' : ''}`}>
                {m.body}
              </div>
            ))
          )}
          <div ref={bottomRef} />
        </div>

        <div className="chat-input-row">
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
      </div>
    </div>
  )
}
