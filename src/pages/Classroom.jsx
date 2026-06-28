import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { supabase } from '../lib/supabase'
import {
  ArrowLeft, Sun, Moon, Lock, CheckCircle2, ChevronDown,
  ChevronUp, BookOpen, Target, ClipboardCheck, Star, Unlock, Rocket,
  Download, Award, Flame, Zap, Stamp, MessageCircle, Send, Sparkles, Notebook as NotebookIcon,
  KeyRound, FileText, HelpCircle, Wand2, ListTree,
} from 'lucide-react'
import { MASTERCLASS_NIGHTS } from '../data/masterclassNights'
import { logBusinessEvent } from '../lib/businessEvents'
import { triggerGrowthCheck } from '../lib/growthChallenge'
import './Classroom.css'

const API_BASE = import.meta.env.VITE_API_URL || ''
const EARLY_UNLOCK_NIGHT = 3

// Quick-action prompts for the Notebook chat — turns "type a question into a
// blank box" into one tap, same instinct as Thinkific-style course AI
// assistants ("explain this", "quiz me") instead of a generic empty input.
const QUICK_PROMPTS = [
  { label: 'Summarize', icon: FileText, prompt: 'Summarize this mission in 3 bullet points.' },
  { label: 'Quiz Me', icon: HelpCircle, prompt: 'Quiz me with 3 short questions on this mission, one at a time.' },
  { label: 'Explain Simply', icon: Wand2, prompt: 'Explain this mission like I\'m brand new to government contracting.' },
  { label: 'Show Examples', icon: ListTree, prompt: 'Give me a concrete, real-world example of this mission applied to my business.' },
]

export default function Classroom() {
  const { session } = useAuth()
  const { theme, toggle: toggleTheme } = useTheme()
  const navigate = useNavigate()
  const isDark = theme === 'dark'

  const [progress, setProgress] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeNight, setActiveNight] = useState(1)
  const [hasPickedActive, setHasPickedActive] = useState(false)
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [profile, setProfile] = useState(null)
  const [checkingOut, setCheckingOut] = useState(false)
  const [checkoutError, setCheckoutError] = useState('')

  // Rewards (XP/level/streak/badges/stamps) — the "college class" gamified
  // layer, computed server-side so the transcript is real, not cosmetic.
  const [rewards, setRewards] = useState({ xp: 0, level: 1, streak_count: 0, badges: [], stamps: 0 })
  const [xpToast, setXpToast] = useState(null)

  // Notebook — per-night personalized insight after homework, and a
  // NotebookLM-style chat scoped to that night's content + the student's
  // own business profile.
  const [insights, setInsights] = useState({})       // { [night]: { insight, niche_keywords_added } }
  const [insightLoading, setInsightLoading] = useState(null)
  const [chatOpenNight, setChatOpenNight] = useState(null)
  const [chatMessages, setChatMessages] = useState({}) // { [night]: [{role, content}] }
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)

  useEffect(() => { loadProgress() }, [])

  useEffect(() => {
    const userId = session?.user?.id
    if (!userId) return
    let cancelled = false
    fetch(`${API_BASE}/api/v1/notebook/rewards/mine?user_id=${userId}`)
      .then(res => res.ok ? res.json() : null)
      .then(data => { if (!cancelled && data) setRewards(data) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [session?.user?.id])

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

  // Land the student on the first night they haven't finished yet — same
  // "pick up where you left off" behavior as a real course platform's
  // lesson sidebar, instead of dumping them at a blank Night 1 every visit.
  useEffect(() => {
    if (loading || hasPickedActive) return
    const completed = new Set(progress.map(p => p.night))
    const firstOpen = MASTERCLASS_NIGHTS.find(nt => {
      const unlocked = nt.n === 1 || completed.has(nt.n - 1)
      return unlocked && !completed.has(nt.n)
    })
    const target = firstOpen ? firstOpen.n : MASTERCLASS_NIGHTS[MASTERCLASS_NIGHTS.length - 1].n
    setActiveNight(target)
    const row = progress.find(p => p.night === target)
    setNotes(row?.homework_notes || '')
    setHasPickedActive(true)
  }, [loading, progress, hasPickedActive])

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

  function selectNight(n) {
    if (!isUnlocked(n)) return
    setActiveNight(n)
    setHasPickedActive(true)
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
    logBusinessEvent(session.user.id, 'government_readiness', 'mission_complete', 3, `Completed Mission ${n}`)
    triggerGrowthCheck(session.user.id)

    // Auto-advance to the night that just unlocked — same "next lesson"
    // momentum a real course platform gives you instead of leaving the
    // student stranded on the lesson they just finished.
    const next = MASTERCLASS_NIGHTS.find(nt => nt.n === n + 1)
    if (next) {
      setActiveNight(next.n)
      setNotes('')
    }

    const userId = session.user.id
    const night = MASTERCLASS_NIGHTS.find(nt => nt.n === n)

    // Reward calc is server-side and authoritative — fire-and-forget from
    // the UI's perspective, but surface a small toast if it actually leveled them up.
    fetch(`${API_BASE}/api/v1/notebook/complete-night`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, night: n, has_notes: !!notes.trim() }),
    })
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (!data) return
        setRewards(data)
        setXpToast({ xp_gain: data.xp_gain, leveled_up: data.leveled_up })
        setTimeout(() => setXpToast(null), 4000)
      })
      .catch(() => {})

    // Personalized insight — only worth asking the AI for if there's
    // something to react to.
    if (notes.trim() && night) {
      setInsightLoading(n)
      fetch(`${API_BASE}/api/v1/notebook/insight`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          night: n,
          night_title: night.title,
          night_subtitle: night.subtitle,
          homework_prompt: night.homework,
          homework_notes: notes,
        }),
      })
        .then(res => res.ok ? res.json() : null)
        .then(data => { if (data) setInsights(prev => ({ ...prev, [n]: data })) })
        .catch(() => {})
        .finally(() => setInsightLoading(null))
    }
  }

  async function askNotebook(night, override) {
    const text = (override ?? chatInput).trim()
    if (!text || chatLoading) return
    const userId = session.user.id
    const message = text
    const history = chatMessages[night.n] || []
    setChatMessages(prev => ({ ...prev, [night.n]: [...history, { role: 'user', content: message }] }))
    setChatInput('')
    setChatLoading(true)

    const nightContext = [
      `Objectives: ${night.objectives.join('; ')}`,
      ...night.sections.map(s => `${s.heading}: ${s.body}`),
      `Homework: ${night.homework}`,
    ].join('\n')

    try {
      const res = await fetch(`${API_BASE}/api/v1/notebook/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          night: night.n,
          night_title: night.title,
          night_context: nightContext,
          message,
          history,
        }),
      })
      const data = res.ok ? await res.json() : null
      const reply = data?.reply || "Couldn't reach the Notebook assistant just now — try again in a moment."
      setChatMessages(prev => ({ ...prev, [night.n]: [...(prev[night.n] || []), { role: 'assistant', content: reply }] }))
    } catch {
      setChatMessages(prev => ({
        ...prev,
        [night.n]: [...(prev[night.n] || []), { role: 'assistant', content: "Couldn't reach the Notebook assistant just now — try again in a moment." }],
      }))
    } finally {
      setChatLoading(false)
    }
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
          <title>Mission ${night.n} Worksheet — ${night.title}</title>
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
          <div class="eyebrow">FASS Masterclass — Mission ${night.n} of ${MASTERCLASS_NIGHTS.length}</div>
          <h1>${night.title}</h1>
          <h2>${night.subtitle}</h2>
          <div class="meta"><span>Name: ____________________________</span><span>Date: ______________</span></div>
          ${items.map(i => `<div class="field"><label>${i}</label><div class="line"></div></div>`).join('')}
          <footer>FASS Technologies LLC · Government Contracting Masterclass</footer>
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
            <div class="course">has successfully completed all ten missions of training in<br/>opportunity scoring, compliance, capability statements, pricing, and proposal assembly.</div>
            <div class="date">Awarded ${date}</div>
            <div class="sig">FASS Technologies LLC<span>Government Contracting Masterclass</span></div>
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

      {loading ? (
        <p className="cr-loading">Loading your course…</p>
      ) : (
        <div className="cr-shell">
          <aside className="cr-sidebar">
            <div className="cr-sidebar-course">
              <span className="cr-sidebar-course-label">Course</span>
              <h2>Government Contracting Masterclass</h2>
              <p className="cr-sidebar-course-speed">10 missions · most students finish the core training in under 2 hours</p>
            </div>

            <div className="cr-sidebar-progress">
              <div className="cr-progress-bar">
                <div className="cr-progress-fill" style={{ width: `${pct}%` }} />
              </div>
              <span className="cr-progress-label">{pct}% complete · {completedCount}/{MASTERCLASS_NIGHTS.length} missions</span>
            </div>

            <div className="cr-sidebar-rewards">
              <span className="cr-reward-pill cr-reward-level">
                <Zap size={13} /> Lvl {rewards.level} <span className="cr-reward-sub">{rewards.xp} XP</span>
              </span>
              <span className="cr-reward-pill">
                <Flame size={13} /> {rewards.streak_count || 0}
              </span>
              <span className="cr-reward-pill">
                <Stamp size={13} /> {rewards.stamps || 0}/{MASTERCLASS_NIGHTS.length}
              </span>
            </div>

            <nav className="cr-curriculum">
              {MASTERCLASS_NIGHTS.map(night => {
                const unlocked = isUnlocked(night.n)
                const done = completedNights.has(night.n)
                const active = activeNight === night.n
                return (
                  <button
                    key={night.n}
                    className={`cr-curr-item ${active ? 'cr-curr-active' : ''} ${!unlocked ? 'cr-curr-locked' : ''} ${done ? 'cr-curr-done' : ''}`}
                    onClick={() => selectNight(night.n)}
                    disabled={!unlocked}
                  >
                    <span className="cr-curr-icon">
                      {!unlocked ? <Lock size={14} /> : done ? <CheckCircle2 size={16} /> : <span className="cr-curr-dot">{night.n}</span>}
                    </span>
                    <span className="cr-curr-text">
                      <span className="cr-curr-week">Mission {night.n}</span>
                      <span className="cr-curr-title">{night.title}</span>
                    </span>
                  </button>
                )
              })}
            </nav>

            <button className="cr-sidebar-notebook-link" onClick={() => navigate('/notebook')}>
              <NotebookIcon size={14} /> Open My Notebook
            </button>
          </aside>

          <main className="cr-content">
            {xpToast && (
              <div className="cr-xp-toast">
                {xpToast.leveled_up ? <Award size={14} /> : <Zap size={14} />}
                Mission Complete — +{xpToast.xp_gain} XP{xpToast.leveled_up ? ' — Level up!' : ''}
              </div>
            )}

            {graduated ? (
              <div className="cr-grad">
                <div className="cr-grad-icon"><Rocket size={28} /></div>
                <h2>You finished the training. Here's the live system you're trained to use.</h2>
                <p>
                  You completed all {MASTERCLASS_NIGHTS.length} missions — opportunity scoring, compliance discipline,
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
                  <strong>Mission {EARLY_UNLOCK_NIGHT} complete — WARDOG is unlocked early.</strong>
                  <span>You don't have to wait until graduation. See live opportunities matching your NAICS code right now.</span>
                </div>
                <button className="cr-early-cta" onClick={() => navigate('/wardog')}>
                  Open WARDOG
                </button>
              </div>
            )}

            {(() => {
              const night = MASTERCLASS_NIGHTS.find(nt => nt.n === activeNight)
              if (!night) return null
              const done = completedNights.has(night.n)

              return (
                <article className="cr-lesson">
                  <div className="cr-lesson-head">
                    <span className="cr-lesson-eyebrow">Mission {night.n} of {MASTERCLASS_NIGHTS.length}</span>
                    <h1>{night.title}</h1>
                    <p>{night.subtitle}</p>
                    {night.unlocks && (
                      <button className="cr-unlocks-tag" onClick={() => navigate(night.unlocks.to)}>
                        <KeyRound size={12} /> Powers: {night.unlocks.label}
                      </button>
                    )}
                  </div>

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

                  {insightLoading === night.n && (
                    <div className="cr-insight cr-insight-loading">
                      <Sparkles size={14} /> Your Notebook is reading your answer…
                    </div>
                  )}
                  {insights[night.n] && (
                    <div className="cr-insight">
                      <h4><Sparkles size={14} /> Your Notebook insight</h4>
                      <p>{insights[night.n].insight}</p>
                      {insights[night.n].niche_keywords_added?.length > 0 && (
                        <div className="cr-insight-keywords">
                          <span>Saved to your business profile:</span>
                          {insights[night.n].niche_keywords_added.map(k => (
                            <span key={k} className="cr-keyword-chip">{k}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="cr-block">
                    <button
                      className="cr-notebook-toggle"
                      onClick={() => setChatOpenNight(chatOpenNight === night.n ? null : night.n)}
                    >
                      <MessageCircle size={14} />
                      Ask the Notebook about this mission
                      {chatOpenNight === night.n ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                    {chatOpenNight === night.n && (
                      <div className="cr-notebook-chat">
                        <p className="cr-notebook-hint">
                          <NotebookIcon size={12} /> Sources: this mission's content + your business profile.
                          Ask about this lesson, or ask it to apply this mission to your specific business.
                        </p>
                        <div className="cr-quick-prompts">
                          {QUICK_PROMPTS.map(qp => {
                            const QpIcon = qp.icon
                            return (
                              <button
                                key={qp.label}
                                className="cr-quick-prompt-chip"
                                disabled={chatLoading}
                                onClick={() => askNotebook(night, qp.prompt)}
                              >
                                <QpIcon size={12} /> {qp.label}
                              </button>
                            )
                          })}
                        </div>
                        <div className="cr-chat-log">
                          {(chatMessages[night.n] || []).length === 0 && (
                            <p className="cr-chat-empty">No questions yet — try "How does this apply to my business?"</p>
                          )}
                          {(chatMessages[night.n] || []).map((m, i) => (
                            <div key={i} className={`cr-chat-msg cr-chat-${m.role}`}>{m.content}</div>
                          ))}
                          {chatLoading && chatOpenNight === night.n && (
                            <div className="cr-chat-msg cr-chat-assistant cr-chat-typing">Thinking…</div>
                          )}
                        </div>
                        <div className="cr-chat-input-row">
                          <input
                            type="text"
                            className="cr-chat-input"
                            placeholder="Ask the Notebook…"
                            value={chatInput}
                            onChange={e => setChatInput(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && askNotebook(night)}
                          />
                          <button className="cr-chat-send" onClick={() => askNotebook(night)} disabled={chatLoading}>
                            <Send size={14} />
                          </button>
                        </div>
                      </div>
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
                        {saving ? 'Saving…' : 'Complete Mission'}
                      </button>
                    )}
                  </div>
                </article>
              )
            })()}
          </main>
        </div>
      )}
    </div>
  )
}
