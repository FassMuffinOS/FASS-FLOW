import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  ArrowLeft, Zap, Flame, Stamp, Award, Sparkles, MessageCircle,
  BookOpen, Tag, Radar,
} from 'lucide-react'
import { MASTERCLASS_NIGHTS } from '../data/masterclassNights'
import './Notebook.css'

const API_BASE = import.meta.env.VITE_API_URL || ''

export default function Notebook() {
  const { session } = useAuth()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [rewards, setRewards] = useState({ xp: 0, level: 1, streak_count: 0, badges: [], stamps: 0 })
  const [entries, setEntries] = useState([])
  const [nicheKeywords, setNicheKeywords] = useState([])
  const [nicheSummary, setNicheSummary] = useState(null)

  useEffect(() => {
    const userId = session?.user?.id
    if (!userId) return
    let cancelled = false
    fetch(`${API_BASE}/api/v1/notebook/mine?user_id=${userId}`)
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (cancelled || !data) return
        setRewards(data.rewards || {})
        setEntries(data.entries || [])
        setNicheKeywords(data.niche_keywords || [])
        setNicheSummary(data.niche_summary || null)
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [session?.user?.id])

  const byNight = entries.reduce((acc, e) => {
    acc[e.night] = acc[e.night] || []
    acc[e.night].push(e)
    return acc
  }, {})
  const nightsWithEntries = Object.keys(byNight).map(Number).sort((a, b) => a - b)

  function nightTitle(n) {
    return MASTERCLASS_NIGHTS.find(nt => nt.n === n)?.title || `Night ${n}`
  }

  return (
    <div className="nb">
      <header className="nb-header">
        <div className="nb-header-inner">
          <button className="nb-back" onClick={() => navigate('/classroom')}>
            <ArrowLeft size={15} /> Classroom
          </button>
          <div className="nb-header-center">
            <span className="nb-logo-icon">⬡</span>
            <span className="nb-logo-text">My <strong>Notebook</strong></span>
          </div>
          <div />
        </div>
      </header>

      <main className="nb-main">
        <div className="nb-container">
          <div className="nb-intro">
            <h1>Your Notebook</h1>
            <p>Every AI conversation, insight, and earned reward from the Masterclass — saved here, and feeding into the rest of your FASS Flow system.</p>
          </div>

          <div className="nb-rewards-grid">
            <div className="nb-reward-card">
              <Zap size={18} />
              <span className="nb-reward-num">{rewards.level}</span>
              <span className="nb-reward-label">Level ({rewards.xp} XP)</span>
            </div>
            <div className="nb-reward-card">
              <Flame size={18} />
              <span className="nb-reward-num">{rewards.streak_count || 0}</span>
              <span className="nb-reward-label">Night streak</span>
            </div>
            <div className="nb-reward-card">
              <Stamp size={18} />
              <span className="nb-reward-num">{rewards.stamps || 0}/{MASTERCLASS_NIGHTS.length}</span>
              <span className="nb-reward-label">Stamps earned</span>
            </div>
            <div className="nb-reward-card">
              <Award size={18} />
              <span className="nb-reward-num">{(rewards.badges || []).length}</span>
              <span className="nb-reward-label">Badges</span>
            </div>
          </div>

          {(rewards.badges || []).length > 0 && (
            <div className="nb-badge-row">
              {rewards.badges.map(b => (
                <span key={b} className="nb-badge-chip"><Award size={12} /> {b.replace(/-/g, ' ')}</span>
              ))}
            </div>
          )}

          <div className="nb-synced">
            <h2><Radar size={16} /> Synced to your business profile</h2>
            <p className="nb-synced-note">
              The Notebook pushes what it learns about your specific niche into your shared business profile —
              the same profile WARDOG, Start a Business, and your Capability Statement read from.
            </p>
            {nicheSummary && <p className="nb-niche-summary">"{nicheSummary}"</p>}
            <div className="nb-keywords">
              {nicheKeywords.length > 0 ? (
                nicheKeywords.map(k => <span key={k} className="nb-keyword-chip"><Tag size={11} /> {k}</span>)
              ) : (
                <span className="nb-keywords-empty">No niche keywords saved yet — finish a night's homework and the Notebook will start filling this in.</span>
              )}
            </div>
          </div>

          <div className="nb-entries">
            <h2><BookOpen size={16} /> Saved notes, night by night</h2>

            {loading ? (
              <p className="nb-loading">Loading your notebook…</p>
            ) : nightsWithEntries.length === 0 ? (
              <p className="nb-empty">Nothing saved yet — ask the Notebook a question or finish a night's homework in the Classroom and it'll show up here.</p>
            ) : (
              nightsWithEntries.map(n => (
                <div key={n} className="nb-night-group">
                  <h3>Night {n} — {nightTitle(n)}</h3>
                  <div className="nb-night-entries">
                    {byNight[n].map(e => (
                      <div key={e.id} className={`nb-entry nb-entry-${e.entry_type}`}>
                        <span className="nb-entry-tag">
                          {e.entry_type === 'insight' ? <Sparkles size={12} /> : <MessageCircle size={12} />}
                          {e.entry_type === 'insight' ? 'Insight' : e.entry_type === 'chat_user' ? 'You asked' : 'Notebook replied'}
                        </span>
                        <p>{e.content}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
