import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { supabase } from '../lib/supabase'
import {
  ArrowLeft, Sun, Moon, Lock, CheckCircle2, ChevronDown,
  ChevronUp, BookOpen, Target, ClipboardCheck, Star, Unlock, Rocket,
  Download, Award,
} from 'lucide-react'
import { MASTERCLASS_NIGHTS } from '../data/masterclassNights'
import './Classroom.css'

const API_BASE = import.meta.env.VITE_API_URL || ''
const EARLY_UNLOCK_NIGHT = 3

export default function Classroom() {
  const { session } = useAuth()
  const { theme, toggle: toggleTheme } = useTheme()
  const navigate = useNavigate()
  const isDark = theme === 'dark'

  const [progress, setProgress] = useState([])
  const [loading, setLoading] = useState(true)
  const [openNight, setOpenNight] = useState(null)
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [profile, setProfile] = useState(null)
  const [checkingOut, setCheckingOut] = useState(false)
  const [checkoutError, setCheckoutError] = useState('')

  useEffect(() => { loadProgress() }, [])

  useEffect(() => {
    const userId = session?.user?.id
    if (!userId) return
    let cancelled = false
    fetch(`${API_BASE}/api/v1/users/${userId}/profile`)
      .then(res => res.ok ? res.json() : null)
      .then(data => { if (!cancelled) setProfile(data) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [session?.user?.id])

  async function loadProgress() {
    setLoading(true)
    const { data } = await supabase
      .from('masterclass_progress')
      .select('*')
      .eq('user_id', session.user.id)
      .order('night', { ascending: true })
    setProgress(data || [])
    setLoading(false)
  }

  async function startCheckout(plan) {
    if (!session?.user) return
    setCheckingOut(true)
    setCheckoutError('')
    try {
      const res = await fetch(`${API_BASE}/api/v1/subscriptions/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan, user_id: session.user.id, email: session.user.email }),
      })
      const data = await res.json()
      if (data?.url) {
        window.location.href = data.url
        return
      }
      setCheckoutError('Could not start checkout. Try again in a moment.')
    } catch {
      setCheckoutError('Could not start checkout. Try again in a moment.')
    } finally {
      setCheckingOut(false)
    }
  }

  const completedNights = new Set(progress.map(p => p.night))
  const completedCount = completedNights.size
  const isActive = profile?.subscription_status === 'active'
  const earlyUnlocked = completedCount >= EARLY_UNLOCK_NIGHT
  const graduated = completedCount >= MASTERCLASS_NIGHTS.length

  function isUnlocked(n) {
    if (n === 1) return true
    return completedNights.has(n - 1)
  }

  function toggleOpen(n) {
    if (!isUnlocked(n)) return
    if (openNight === n) {
      setOpenNight(null)
      return
    }
    setOpenNight(n)
    const row = progress.find(p => p.night === n)
    setNotes(row?.homework_notes || '')
  }

  async function markComplete(n) {
    setSaving(true)
    await supabase
      .from('masterclass_progress')
      .upsert({ user_id: session.user.id, night: n, homework_notes: notes }, { onConflict: 'user_id,night' })
    await loadProgress()
    setSaving(false)
  }

  async function saveNotesOnly(n) {
    if (!completedNights.has(n)) return
    setSaving(true)
    await supabase
      .from('masterclass_progress')
      .update({ homework_notes: notes })
      .eq('user_id', session.user.id)
      .eq('night', n)
    await loadProgress()
    setSaving(false)
  }

  const pct = Math.round((completedCount / MASTERCLASS_NIGHTS.length) * 100)

  function printWorksheet(night) {
    const items = night.worksheet || []
    const w = window.open('', '_blank')
    if (!w) return
    w.document.write(`
      <html>
        <head>
          <title>Night ${night.n} Worksheet — ${night.title}</title>
          <style>
            body { font-family: -apple-system, Helvetica, Arial, sans-serif; padding: 48px; color: #14242f; }
            .eyebrow { font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase; color: #2a9d8f; font-weight: 700; margin-bottom: 6px; }
            h1 { font-size: 21px; margin: 0 0 4px; }
            h2 { font-size: 14px; color: #5b6b75; margin: 0 0 28px; font-weight: 500; }
            .meta { font-size: 12px; color: #5b6b75; margin-bottom: 32px; border-bottom: 1px solid #d8e2e6; padding-bottom: 16px; }
            .meta span { margin-right: 28px; }
            .field { margin: 24px 0; }
            .field label { display: block; font-size: 13px; font-weight: 700; margin-bottom: 8px; }
            .field .line { border-bottom: 1px solid #9aa7ad; height: 30px; }
            footer { margin-top: 48px; font-size: 11px; color: #9aa7ad; }
            @media print { body { padding: 30px; } }
          </style>
        </head>
        <body>
          <div class="eyebrow">FASS Masterclass — Week ${night.week}</div>
          <h1>Night ${night.n}: ${night.title}</h1>
          <h2>${night.subtitle}</h2>
          <div class="meta"><span>Name: ____________________________</span><span>Date: ______________</span></div>
          ${items.map(i => `<div class="field"><label>${i}</label><div class="line"></div></div>`).join('')}
          <footer>FASS Technologies LLC · 10-Night Government Contracting Masterclass</footer>
        </body>
      </html>
    `)
    w.document.close()
    w.focus()
    setTimeout(() => w.print(), 300)
  }

  function printCertificate() {
    const name = session?.user?.user_metadata?.full_name || session?.user?.email || 'Student'
    const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    const w = window.open('', '_blank')
    if (!w) return
    w.document.write(`
      <html>
        <head>
          <title>Certificate of Completion</title>
          <style>
            body { font-family: Georgia, 'Times New Roman', serif; margin: 0; padding: 0; }
            .cert { border: 10px solid #14242f; border-image: none; margin: 36px; padding: 70px 60px; text-align: center; min-height: 70vh; display: flex; flex-direction: column; justify-content: center; }
            .cert .badge { font-size: 12px; letter-spacing: 0.12em; text-transform: uppercase; color: #2a9d8f; font-weight: 700; margin-bottom: 24px; }
            .cert h1 { font-size: 28px; letter-spacing: 0.04em; text-transform: uppercase; color: #14242f; margin: 0 0 36px; }
            .cert .lead { font-size: 15px; color: #5b6b75; }
            .cert .name { font-size: 38px; font-weight: bold; margin: 18px 0 28px; color: #14242f; border-bottom: 2px solid #14242f; display: inline-block; padding-bottom: 10px; }
            .cert .course { font-size: 17px; line-height: 1.6; margin: 8px 0 36px; color: #14242f; }
            .cert .date { font-size: 13px; color: #5b6b75; margin-top: 8px; }
            .cert .sig { margin-top: 56px; font-size: 14px; font-weight: 700; color: #14242f; }
            .cert .sig span { display: block; font-size: 11px; font-weight: 400; color: #9aa7ad; margin-top: 4px; }
          </style>
        </head>
        <body>
          <div class="cert">
            <div class="badge">Certificate of Completion</div>
            <h1>FASS Government Contracting Masterclass</h1>
            <div class="lead">This certifies that</div>
            <div class="name">${name}</div>
            <div class="course">has successfully completed all ten nights of training in<br/>opportunity scoring, compliance, capability statements, pricing, and proposal assembly.</div>
            <div class="date">Awarded ${date}</div>
            <div class="sig">FASS Technologies LLC<span>10-Night Government Contracting Masterclass</span></div>
          </div>
        </body>
      </html>
    `)
    w.document.close()
    w.focus()
    setTimeout(() => w.print(), 300)
  }

  return (
    <div className="cr">
      <header className="cr-header">
        <div className="cr-header-inner">
          <button className="cr-back" onClick={() => navigate('/dashboard')}>
            <ArrowLeft size={15} /> Dashboard
          </button>

          <div className="cr-header-center">
            <span className="cr-logo-icon">⬡</span>
            <span className="cr-logo-text">FASS <strong>Classroom</strong></span>
          </div>

          <div className="cr-header-right">
            <button className="cr-theme-btn" onClick={toggleTheme} title={isDark ? 'Light mode' : 'Dark mode'}>
              {isDark ? <Sun size={16} /> : <Moon size={16} />}
            </button>
          </div>
        </div>
      </header>

      <main className="cr-main">
        <div className="cr-container">

          <div className="cr-intro">
            <h1>10-Night Government Contracting Masterclass</h1>
            <p>Every session builds on the last. Complete each night to unlock the next.</p>
          </div>

          <div className="cr-progress-wrap">
            <div className="cr-progress-bar">
              <div className="cr-progress-fill" style={{ width: `${pct}%` }} />
            </div>
            <span className="cr-progress-label">{completedCount} of {MASTERCLASS_NIGHTS.length} nights complete</span>
          </div>

          {graduated ? (
            <div className="cr-grad">
              <div className="cr-grad-icon"><Rocket size={28} /></div>
              <h2>You finished the training. Here's the live system you're trained to use.</h2>
              <p>
                You completed all {MASTERCLASS_NIGHTS.length} nights — opportunity scoring, compliance discipline,
                proposal assembly, all of it. WARDOG, R-E-A-D, Pipeline, and FASS FILL are the tools built to run
                what you just learned, every day, on autopilot.
              </p>
              <div className="cr-grad-actions">
                <button className="cr-cert-btn" onClick={printCertificate}>
                  <Award size={15} /> Download Certificate of Completion
                </button>
                {isActive ? (
                  <button className="cr-grad-cta" onClick={() => navigate('/wardog')}>
                    Go to WARDOG <ArrowLeft size={15} style={{ transform: 'rotate(180deg)' }} />
                  </button>
                ) : (
                  <button className="cr-grad-cta" disabled={checkingOut} onClick={() => startCheckout('starter')}>
                    {checkingOut ? 'Starting checkout…' : 'Upgrade to FASS Flow — $99/mo'}
                  </button>
                )}
              </div>
              {!isActive && <p className="cr-grad-note">14-day free trial. Cancel anytime.</p>}
              {checkoutError && <p className="cr-grad-error">{checkoutError}</p>}
            </div>
          ) : earlyUnlocked && !isActive && (
            <div className="cr-early-banner">
              <div className="cr-early-icon"><Unlock size={18} /></div>
              <div className="cr-early-text">
                <strong>Night {EARLY_UNLOCK_NIGHT} complete — WARDOG is unlocked early.</strong>
                <span>You don't have to wait until graduation. See live opportunities matching your NAICS code right now.</span>
              </div>
              <button className="cr-early-cta" onClick={() => navigate('/wardog')}>
                Open WARDOG
              </button>
            </div>
          )}

          {loading ? (
            <p className="cr-loading">Loading your progress…</p>
          ) : (
            <div className="cr-nights">
              {MASTERCLASS_NIGHTS.map(night => {
                const unlocked = isUnlocked(night.n)
                const done = completedNights.has(night.n)
                const open = openNight === night.n

                return (
                  <div key={night.n} className={`cr-night ${!unlocked ? 'cr-locked' : ''} ${done ? 'cr-done' : ''}`}>
                    <div className="cr-night-head" onClick={() => toggleOpen(night.n)}>
                      <div className="cr-night-num">
                        {!unlocked ? <Lock size={16} /> : done ? <CheckCircle2 size={18} /> : <span className="cr-num-dot">{night.n}</span>}
                      </div>
                      <div className="cr-night-titles">
                        <span className="cr-night-week">Week {night.week} · Night {night.n}</span>
                        <h3>{night.title}</h3>
                        <p>{night.subtitle}</p>
                      </div>
                      <div className="cr-night-toggle">
                        {unlocked && (open ? <ChevronUp size={18} /> : <ChevronDown size={18} />)}
                      </div>
                    </div>

                    {open && unlocked && (
                      <div className="cr-night-body">
                        <div className="cr-block">
                          <h4><Target size={14} /> Objectives</h4>
                          <ul>
                            {night.objectives.map((o, i) => <li key={i}>{o}</li>)}
                          </ul>
                        </div>

                        {night.sections.map((s, i) => (
                          <div className="cr-block" key={i}>
                            <h4><BookOpen size={14} /> {s.heading}</h4>
                            <p>{s.body}</p>
                          </div>
                        ))}

                        <div className="cr-block">
                          <h4><ClipboardCheck size={14} /> Homework</h4>
                          <p>{night.homework}</p>
                          {night.worksheet && night.worksheet.length > 0 && (
                            <button className="cr-worksheet-btn" onClick={() => printWorksheet(night)}>
                              <Download size={14} /> Download Worksheet
                            </button>
                          )}
                        </div>

                        <div className="cr-block">
                          <h4><Star size={14} /> Key Takeaways</h4>
                          <ul>
                            {night.takeaways.map((t, i) => <li key={i}>{t}</li>)}
                          </ul>
                        </div>

                        <div className="cr-block">
                          <h4>Your Notes</h4>
                          <textarea
                            className="cr-notes"
                            placeholder="Jot down what you completed, decisions made, or questions for next time..."
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                            onBlur={() => done && saveNotesOnly(night.n)}
                          />
                        </div>

                        <div className="cr-night-actions">
                          {done ? (
                            <span className="cr-completed-tag"><CheckCircle2 size={14} /> Completed</span>
                          ) : (
                            <button className="cr-complete-btn" disabled={saving} onClick={() => markComplete(night.n)}>
                              {saving ? 'Saving…' : 'Mark Night Complete'}
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

        </div>
      </main>
    </div>
  )
}
