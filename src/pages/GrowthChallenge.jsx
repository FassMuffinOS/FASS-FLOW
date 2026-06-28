import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Rocket, Trophy, CheckCircle2, Circle, Lock, ChevronRight, Award, Loader,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import {
  fetchMyGrowthChallenge, triggerGrowthCheck, completeMission, claimAchievement,
} from '../lib/growthChallenge'
import './GrowthChallenge.css'

const WEEK_LABELS = {
  1: 'Week 1 — Business HQ, Wallet, CRM, WARDOG, R-E-A-D, Proposals',
  2: 'Week 2 — Marketing, Reviews, Wallet, Gift Cards, Social, Referrals',
  3: 'Week 3 — Execution, Witness, Foreman, Documentation, AI',
  4: 'Week 4 — Growth, Affiliate, Hiring, Automation, Scaling',
}

export default function GrowthChallenge() {
  const { session } = useAuth()
  const navigate = useNavigate()
  const userId = session?.user?.id
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState(null)
  const [busyKey, setBusyKey] = useState(null)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    if (!userId) { setLoading(false); return }
    await triggerGrowthCheck(userId)
    try {
      const result = await fetchMyGrowthChallenge(userId)
      setData(result)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => { load() }, [load])

  const missionsByWeek = useMemo(() => {
    if (!data) return {}
    const grouped = {}
    for (const m of data.missions) {
      grouped[m.week] = grouped[m.week] || []
      grouped[m.week].push(m)
    }
    return grouped
  }, [data])

  async function markDone(missionKey) {
    if (!userId || busyKey) return
    setBusyKey(missionKey)
    try {
      await completeMission(userId, missionKey)
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusyKey(null)
    }
  }

  async function claim(achievementKey) {
    if (!userId || busyKey) return
    setBusyKey(achievementKey)
    try {
      await claimAchievement(userId, achievementKey)
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusyKey(null)
    }
  }

  if (loading) {
    return <div className="gc-loading"><Loader size={20} className="spin" /> Loading your Growth Challenge…</div>
  }

  if (!data) {
    return <div className="gc-loading">Couldn't load the Growth Challenge right now — try refreshing.</div>
  }

  const { state, missions, achievements, completed_count, total_missions } = data
  const { level, title, xp, next_threshold } = state
  const pctToNext = next_threshold ? Math.min(100, Math.round((xp / next_threshold) * 100)) : 100

  return (
    <div className="gc">
      <div className="gc-container">
        <header className="gc-head">
          <Rocket size={22} className="gc-head-icon" />
          <div>
            <h1>30-Day Growth Challenge</h1>
            <p>Real missions, real achievements — build your business one verified action at a time.</p>
          </div>
        </header>

        {error && <div className="gc-error">{error}</div>}

        <div className="gc-level-card">
          <div className="gc-level-top">
            <span className="gc-level-num">Level {level}</span>
            <span className="gc-level-title">{title}</span>
          </div>
          <div className="gc-xp-bar">
            <div className="gc-xp-bar-fill" style={{ width: `${pctToNext}%` }} />
          </div>
          <div className="gc-level-foot">
            <span>{xp} XP{next_threshold ? ` of ${next_threshold} XP to next level` : ' — max level reached'}</span>
            <span>{completed_count} of {total_missions} missions complete</span>
          </div>
        </div>

        <section className="gc-section">
          <h2><Trophy size={16} /> Achievements</h2>
          <div className="gc-achievements-grid">
            {achievements.map(a => (
              <div key={a.key} className={`gc-achievement ${a.earned ? 'gc-earned' : ''}`}>
                <Award size={20} className="gc-achievement-icon" />
                <span className="gc-achievement-label">{a.label}</span>
                <span className="gc-achievement-xp">+{a.xp} XP</span>
                {a.earned ? (
                  <span className="gc-achievement-status gc-status-done"><CheckCircle2 size={13} /> Earned</span>
                ) : a.manual_only ? (
                  <button
                    className="gc-claim-btn"
                    disabled={busyKey === a.key}
                    onClick={() => claim(a.key)}
                  >
                    {busyKey === a.key ? 'Claiming…' : 'Mark as earned'}
                  </button>
                ) : (
                  <span className="gc-achievement-status gc-status-locked"><Lock size={12} /> Not yet</span>
                )}
              </div>
            ))}
          </div>
        </section>

        {[1, 2, 3, 4].map(week => (
          <section className="gc-section" key={week}>
            <h2>{WEEK_LABELS[week]}</h2>
            <div className="gc-missions">
              {(missionsByWeek[week] || []).map(m => (
                <div key={m.key} className={`gc-mission-row ${m.completed ? 'gc-mission-done' : ''}`}>
                  <div className="gc-mission-check">
                    {m.completed ? <CheckCircle2 size={18} className="gc-check-done" /> : <Circle size={18} className="gc-check-pending" />}
                  </div>
                  <div className="gc-mission-info">
                    <div className="gc-mission-top">
                      <span className="gc-mission-day">Day {m.day}</span>
                      <span className="gc-mission-title">{m.title}</span>
                      <span className="gc-mission-xp">+{m.xp} XP</span>
                    </div>
                    <p className="gc-mission-desc">{m.mission}</p>
                  </div>
                  <div className="gc-mission-actions">
                    {!m.completed && m.cta_href && (
                      <button className="btn-outline gc-go-btn" onClick={() => navigate(m.cta_href)}>
                        Go <ChevronRight size={13} />
                      </button>
                    )}
                    {!m.completed && m.manual_only && (
                      <button
                        className="btn-primary gc-done-btn"
                        disabled={busyKey === m.key}
                        onClick={() => markDone(m.key)}
                      >
                        {busyKey === m.key ? 'Saving…' : 'Mark complete'}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
