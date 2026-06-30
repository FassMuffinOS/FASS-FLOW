import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sparkles, ArrowRight, CheckCircle2, MessageCircleQuestion, Loader2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { fetchDailyFeed, fetchDailyBrief } from '../lib/dailyFeed'
import { askChiefOfStaff } from '../lib/chiefOfStaff'
import { getTrack, trackById } from '../lib/track'
import './DailyFeed.css'

const PROMPT_CHIPS = ['I need money', 'What should I focus on today?', 'Help me grow']

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

// The Dashboard's daily action list — "what does FASS want me to
// accomplish today?" instead of "which tool do I open?" Pulls live from
// dailyFeed.js (proposals, milestones, campaigns, WARDOG, Masterclass) so
// it's always a real read of account state, never a separate thing to keep
// in sync. The AI brief loads after the list so the list never waits on it.
export default function DailyFeed() {
  const { session } = useAuth()
  const navigate = useNavigate()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [brief, setBrief] = useState(null)
  const [briefLoading, setBriefLoading] = useState(false)

  // AI Chief of Staff — the "I need money" goal-query box. Reuses the same
  // feed items already loaded above as its business_context instead of
  // re-fetching anything, so asking a question costs one LLM call, not a
  // second round of Supabase reads.
  const [question, setQuestion] = useState('')
  const [asking, setAsking] = useState(false)
  const [answer, setAnswer] = useState(null)
  const [askError, setAskError] = useState('')

  const firstName = (session?.user?.user_metadata?.full_name || '').split(' ')[0] || ''

  useEffect(() => {
    if (!session?.user?.id) return
    let cancelled = false
    async function load() {
      const feed = await fetchDailyFeed(session.user.id)
      if (cancelled) return
      setItems(feed)
      setLoading(false)
      if (feed.length > 0) {
        setBriefLoading(true)
        const b = await fetchDailyBrief(session.user.id, feed)
        if (!cancelled) { setBrief(b); setBriefLoading(false) }
      }
    }
    load()
    return () => { cancelled = true }
  }, [session?.user?.id])

  if (loading) return null

  // Urgency-tiered framing instead of a flat count — weight >= 80 covers
  // overdue items and anything due inside ~2-3 days (see dailyFeed.js's
  // weight math), so "X need attention now" surfaces the real triage
  // signal instead of making every item look equally pressing.
  const urgent = items.filter(i => i.weight >= 80).length

  async function handleAsk(q) {
    const text = (q ?? question).trim()
    if (!text || !session?.user?.id) return
    setQuestion(text)
    setAsking(true)
    setAskError('')
    setAnswer(null)
    try {
      // Lead the context with the user's track so the AI frames its answer
      // for their kind of business (govcon vs commercial vs just starting).
      const trackContext = `This business focuses on ${trackById(getTrack()).ai}.`
      const result = await askChiefOfStaff(session.user.id, text, [trackContext, ...items.map(i => i.text)])
      setAnswer(result.answer)
    } catch (e) {
      setAskError(e.message || 'Could not get an answer right now')
    } finally {
      setAsking(false)
    }
  }

  return (
    <div className="df-card">
      <h2 className="df-greeting">
        {greeting()}{firstName ? `, ${firstName}` : ''}.{' '}
        {items.length > 0
          ? urgent > 0
            ? `You have ${items.length} item${items.length === 1 ? '' : 's'} today — ${urgent} need${urgent === 1 ? 's' : ''} attention now.`
            : `You have ${items.length} item${items.length === 1 ? '' : 's'} that can grow your business today.`
          : "You're all caught up — nothing urgent needs you right now."}
      </h2>

      {(briefLoading || brief) && (
        <div className="df-brief">
          <Sparkles size={14} />
          <p>{briefLoading ? 'Thinking through today…' : brief}</p>
        </div>
      )}

      <div className="df-ask">
        <form
          className="df-ask-form"
          onSubmit={e => { e.preventDefault(); handleAsk() }}
        >
          <MessageCircleQuestion size={15} className="df-ask-icon" />
          <input
            type="text"
            placeholder="Ask your business anything — e.g. &quot;I need money&quot;"
            value={question}
            onChange={e => setQuestion(e.target.value)}
            disabled={asking}
          />
          <button type="submit" className="btn-primary df-ask-btn" disabled={asking || !question.trim()}>
            {asking ? <Loader2 size={14} className="df-ask-spin" /> : 'Ask'}
          </button>
        </form>

        <div className="df-ask-chips">
          {PROMPT_CHIPS.map(chip => (
            <button key={chip} type="button" className="df-ask-chip" onClick={() => handleAsk(chip)} disabled={asking}>
              {chip}
            </button>
          ))}
        </div>

        {asking && <p className="df-ask-status">Thinking across your pipeline, deadlines, and offers…</p>}
        {askError && <p className="df-ask-status df-ask-error">{askError}</p>}
        {answer && !asking && (
          <div className="df-ask-answer">
            <Sparkles size={14} />
            <p>{answer}</p>
          </div>
        )}
      </div>

      {items.length === 0 ? (
        <div className="df-empty">
          <CheckCircle2 size={18} />
          <span>No deadlines, matches, or expiring offers right now — good time to work a Masterclass mission or browse WARDOG.</span>
        </div>
      ) : (
        <ul className="df-list">
          {items.map(item => (
            <li key={item.id}>
              <button className="df-item" onClick={() => navigate(item.href)}>
                <span className="df-item-emoji">{item.emoji}</span>
                <span className="df-item-text">{item.text}</span>
                <ArrowRight size={14} className="df-item-arrow" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
