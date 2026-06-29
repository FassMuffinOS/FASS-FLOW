import { useState, useEffect, useCallback } from 'react'
import { MessageCircle, Send, Loader, Plus, X, Sparkles, Pencil, Check } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { apiFetch } from '../lib/apiClient'
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
  const [contact, setContact] = useState(null)
  const [editingContact, setEditingContact] = useState(false)
  const [contactForm, setContactForm] = useState({ name: '', company: '', naics: '', last_award_date: '', notes: '' })

  const loadThreads = useCallback(async () => {
    if (!userId || !API_BASE) { setLoading(false); return }
    try {
      const res = await apiFetch(`/api/v1/comms/threads?business_user_id=${userId}`)
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
      const res = await apiFetch(`/api/v1/comms/thread?business_user_id=${userId}&phone=${encodeURIComponent(phone)}`)
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

  const loadContact = useCallback(async (phone) => {
    if (!userId || !phone) return
    try {
      const res = await apiFetch(`/api/v1/comms/contact?business_user_id=${userId}&phone=${encodeURIComponent(phone)}`)
      if (res.ok) {
        const data = await res.json()
        setContact(data.contact || null)
        setContactForm({
          name: data.contact?.name || '',
          company: data.contact?.company || '',
          naics: data.contact?.naics || '',
          last_award_date: data.contact?.last_award_date || '',
          notes: data.contact?.notes || '',
        })
      }
    } catch (err) {
      console.error('CommsHub: failed to load contact', err)
    }
  }, [userId])

  function openThread(phone) {
    setActivePhone(phone)
    setShowNew(false)
    setEditingContact(false)
    loadThread(phone)
    loadContact(phone)
  }

  async function saveContact(phone) {
    if (!userId || !phone) return
    try {
      const res = await apiFetch(`/api/v1/comms/contact`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ business_user_id: userId, phone, ...contactForm }),
      })
      if (res.ok) {
        const data = await res.json()
        setContact(data.contact || null)
        setEditingContact(false)
      }
    } catch (err) {
      console.error('CommsHub: failed to save contact', err)
    }
  }

  async function dismissNudge(phone, e) {
    e.stopPropagation()
    if (!userId || !phone) return
    try {
      await apiFetch(`/api/v1/comms/contact/dismiss-nudge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ business_user_id: userId, phone, days: 14 }),
      })
      await loadThreads()
    } catch (err) {
      console.error('CommsHub: failed to dismiss nudge', err)
    }
  }

  async function sendMessage(phone, body) {
    if (!userId || !phone.trim() || !body.trim()) return
    setSending(true)
    try {
      const res = await apiFetch(`/api/v1/comms/send`, {
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
                <span className="ch-thread-phone">{t.contact_name || t.phone}</span>
                <span className="ch-thread-time">{timeAgo(t.last_at)}</span>
              </div>
              <div className="ch-thread-preview">
                {t.last_direction === 'out' ? 'You: ' : ''}{t.last_body}
              </div>
              {t.unread > 0 && <span className="ch-thread-unread">{t.unread}</span>}
              {t.show_nudge && (
                <div className="ch-nudge" title="No activity in a while — might be worth a check-in">
                  <Sparkles size={12} />
                  <span>Quiet {t.days_quiet}d</span>
                  <button className="ch-nudge-dismiss" onClick={(e) => dismissNudge(t.phone, e)}>Dismiss</button>
                </div>
              )}
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
              <div className="ch-panel-head">{contact?.name || activePhone}</div>
              <ContactIdentity
                phone={activePhone}
                contact={contact}
                editing={editingContact}
                form={contactForm}
                setForm={setContactForm}
                onEdit={() => setEditingContact(true)}
                onCancel={() => setEditingContact(false)}
                onSave={() => saveContact(activePhone)}
              />
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

// The "blue bubble trust" layer — a thin strip of business context above
// the message timeline so a prime/KO contact reads this as a system that
// knows who they are, not a personal text. Every field is optional; an
// empty strip just shows "Add company / NAICS" so the prompt to fill it in
// is there without ever blocking a send.
function ContactIdentity({ phone, contact, editing, form, setForm, onEdit, onCancel, onSave }) {
  if (editing) {
    return (
      <div className="ch-identity ch-identity-edit">
        <input placeholder="Contact name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
        <input placeholder="Company" value={form.company} onChange={e => setForm({ ...form, company: e.target.value })} />
        <input placeholder="NAICS code(s)" value={form.naics} onChange={e => setForm({ ...form, naics: e.target.value })} />
        <input type="date" placeholder="Last award date" value={form.last_award_date || ''} onChange={e => setForm({ ...form, last_award_date: e.target.value })} />
        <input placeholder="Notes" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
        <div className="ch-identity-actions">
          <button className="btn-primary" onClick={onSave}><Check size={14} /> Save</button>
          <button className="btn-outline" onClick={onCancel}>Cancel</button>
        </div>
      </div>
    )
  }

  const hasIdentity = contact?.company || contact?.naics || contact?.last_award_date
  return (
    <div className="ch-identity" onClick={onEdit} title="Click to edit contact details">
      {hasIdentity ? (
        <>
          {contact.company && <span className="ch-identity-chip">{contact.company}</span>}
          {contact.naics && <span className="ch-identity-chip">NAICS {contact.naics}</span>}
          {contact.last_award_date && <span className="ch-identity-chip">Last award {contact.last_award_date}</span>}
        </>
      ) : (
        <span className="ch-identity-empty"><Pencil size={11} /> Add company / NAICS for {phone}</span>
      )}
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
