import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Rocket, ChevronRight, CheckCircle2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { triggerGrowthCheck, fetchMyGrowthChallenge } from '../lib/growthChallenge'
import './GrowthChallengeWidget.css'

// Growth Challenge widget — the Dashboard's window into the 30-Day Growth
// Challenge ledger (growth_challenge_state / _completions / _achievements,
// see growth_challenge.py). Re-checks auto-detectable progress on every load
// so a mission completed elsewhere (e.g. winning a contract in Pipeline)
// shows up here without the user doing anything Growth-Challenge-specific,
// then renders level/XP and today's next mission. Full mission/achievement
// list lives on the dedicated /growth-challenge page this links to.
export default function GrowthChallengeWidget() {
  const { session } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState(null)

  const load = useCallback(async () => {
    const userId = session?.user?.id
    if (!userId) { setLoading(false); return }
    await triggerGrowthCheck(userId)
    try {
      const result = await fetchMyGrowthChallenge(userId)
      setData(result)
    } catch {
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [session?.user?.id])

  useEffect(() => { load() }, [load])

  if (loading || !data) return null

  const { state, completed_count, total_missions, today_mission } = data
  const { level, title, xp, next_threshold } = state
  const pctToNext = next_threshold
    ? Math.min(100, Math.round((xp / next_threshold) * 100))
    : 100

  return (
    <div className="gcw-card" onClick={() => navigate('/growth-challenge')}>
      <div className="gcw-head">
        <Rocket size={16} />
        <span>30-Day Growth Challenge</span>
        <ChevronRight size={15} className="gcw-head-chevron" />
      </div>
      <div className="gcw-body">
        <div className="gcw-level">
          <span className="gcw-level-num">Lv {level}</span>
          <span className="gcw-level-title">{title}</span>
          <span className="gcw-xp">{xp} XP{next_threshold ? ` / ${next_threshold} XP` : ' — max level'}</span>
        </div>
        <div className="gcw-xp-bar">
          <div className="gcw-xp-bar-fill" style={{ width: `${pctToNext}%` }} />
        </div>
        <div className="gcw-progress-row">
          <span>{completed_count} of {total_missions} missions complete</span>
        </div>
        {today_mission ? (
          <div className="gcw-mission">
            <span className="gcw-mission-day">Day {today_mission.day}</span>
            <div className="gcw-mission-text">
              <span className="gcw-mission-title">{today_mission.title}</span>
              <span className="gcw-mission-desc">{today_mission.mission}</span>
            </div>
          </div>
        ) : (
          <div className="gcw-mission gcw-mission-done">
            <CheckCircle2 size={15} />
            <span>All 30 missions complete — you're FASS Certified.</span>
          </div>
        )}
      </div>
    </div>
  )
}
