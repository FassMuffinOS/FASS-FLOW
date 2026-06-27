import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Megaphone, Copy, Link2, Loader2, MousePointerClick, UserPlus, DollarSign, Wallet } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import './AffiliateDashboard.css'

const API_BASE = import.meta.env.VITE_API_URL || ''

// Rotating content-idea prompts, one per day-of-month slot. Generic enough
// to work for any creator niche, specific enough to actually be useful —
// the point is removing "what do I even post" as a reason not to share.
const CONTENT_IDEAS = [
  'Post your before/after: "I found this tool that..." with your link in bio',
  'Share a screen-record of you using FASS Flow for 30 seconds',
  'Story poll: "Do you run a small business? Comment YES for a tool I love"',
  'Quote-tweet a small-business win and mention how FASS Flow helped',
  'Post a "day in the life" that includes you checking WARDOG opportunities',
  'Share your own commission stats — transparency builds trust',
  'Reply to a question in your niche with your link as the answer',
  'Post a carousel: "3 things small businesses get wrong about bidding"',
  'Go live for 5 minutes walking through one FASS Flow feature',
  'Pin a comment with your link under your highest-performing recent post',
  'Share a testimonial-style post about FASS Wallet for loyalty programs',
  'Post in a relevant Facebook/Discord group (where allowed) with context, not just a link',
  'Make a "this or that" comparing manual tracking vs. FASS Flow',
  'Share your link in your newsletter footer for the next send',
  'Repost an old high-performer with an updated caption and your link',
  'Do a quick FAQ post answering "what is FASS Flow" in plain language',
  'Tag a small-business friend who has been complaining about paperwork',
  'Post a screenshot of your own dashboard (numbers blurred) as social proof',
  'Share a "tools I actually use" roundup post with FASS Flow included',
  'Add your link to your link-in-bio page if you haven\'t already',
  'Post about FASS Wallet specifically — loyalty/rewards angle resonates differently than the main pitch',
  'Comment thoughtfully on 3 posts in your niche today, link in profile not the comment',
  'Share a short Reel/TikTok showing the signup flow start to finish',
  'Post a "what I wish I knew" style story about running a small business',
  'Ask your audience what their biggest business headache is, reply with FASS Flow as a fix',
  'Repurpose your best-performing post into a different format (image -> video, etc.)',
  'Share a case study style post: a hypothetical business before/after using the tool',
  'Post your link with a clear CTA: "Click my bio link to get started free"',
  'End-of-month recap post — what worked, what you\'ll try next month',
  'Plan next month\'s content now so you\'re never starting from zero',
]

export default function AffiliateDashboard() {
  const { session } = useAuth()
  const navigate = useNavigate()
  const userId = session?.user?.id

  const [loading, setLoading] = useState(true)
  const [affiliate, setAffiliate] = useState(null)
  const [stats, setStats] = useState(null)
  const [clicks, setClicks] = useState([])
  const [conversions, setConversions] = useState([])
  const [joining, setJoining] = useState(false)
  const [copied, setCopied] = useState(false)

  const load = useCallback(async () => {
    if (!userId || !API_BASE) return
    try {
      const res = await fetch(`${API_BASE}/api/v1/affiliates/me?user_id=${userId}`)
      if (res.ok) {
        const data = await res.json()
        setAffiliate(data.affiliate)
        setStats(data.stats || null)
        setClicks(data.clicks || [])
        setConversions(data.conversions || [])
      }
    } catch (err) {
      console.error('AffiliateDashboard: failed to load', err)
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    let cancelled = false
    async function run() {
      if (cancelled) return
      await load()
    }
    run()
    return () => { cancelled = true }
  }, [load])

  async function join() {
    if (!userId) return
    setJoining(true)
    try {
      const res = await fetch(`${API_BASE}/api/v1/affiliates/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId }),
      })
      if (res.ok) {
        const data = await res.json()
        setAffiliate(data.affiliate)
        await load()
      }
    } catch (err) {
      console.error('AffiliateDashboard: failed to join', err)
    } finally {
      setJoining(false)
    }
  }

  const link = affiliate ? `${window.location.origin}/?ref=${affiliate.code}` : ''

  function copyLink() {
    if (!link) return
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    })
  }

  // Combined growth calendar: every day of the current month gets a
  // rotating content idea AND, if anything actually happened that day
  // (clicks recorded, conversions earned), that real activity overlaid
  // on the same cell. This is the "content calendar + performance
  // calendar in one view" the program was scoped to deliver.
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const clicksByDay = {}
  clicks.forEach(c => {
    const d = new Date(c.created_at)
    if (d.getFullYear() === year && d.getMonth() === month) {
      const k = d.getDate()
      clicksByDay[k] = (clicksByDay[k] || 0) + 1
    }
  })
  const conversionsByDay = {}
  conversions.forEach(c => {
    const d = new Date(c.created_at)
    if (d.getFullYear() === year && d.getMonth() === month) {
      const k = d.getDate()
      if (!conversionsByDay[k]) conversionsByDay[k] = { count: 0, earned: 0 }
      conversionsByDay[k].count += 1
      conversionsByDay[k].earned += c.commission_amount
    }
  })

  const todayNum = now.getDate()
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)
  const monthLabel = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  if (loading) {
    return (
      <div className="afd-page">
        <div className="afd-loading"><Loader2 size={20} className="spin" /> Loading your affiliate dashboard…</div>
      </div>
    )
  }

  if (!affiliate) {
    return (
      <div className="afd-page">
        <div className="afd-join-card">
          <Megaphone size={22} />
          <h2>You're not an affiliate yet</h2>
          <p>Get your referral link and start earning 30% on every plan signup and Wallet unlock you bring in.</p>
          <button className="btn-primary" onClick={join} disabled={joining}>
            {joining ? <Loader2 size={16} className="spin" /> : <Link2 size={16} />}
            {joining ? 'Creating your link…' : 'Get my affiliate link'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="afd-page">
      <div className="afd-head">
        <h1><Megaphone size={20} /> Affiliate Dashboard</h1>
        <button className="btn-outline afd-pitch-link" onClick={() => navigate('/affiliates')}>Program details</button>
      </div>
      <p className="afd-sub">Your referral link, lifetime stats, and a growth calendar — content ideas plus what actually happened, day by day.</p>

      <div className="afd-link-box">
        <span className="afd-link-label">Your link</span>
        <div className="afd-link-row">
          <input readOnly value={link} onClick={e => e.target.select()} />
          <button className="btn-outline afd-copy-btn" onClick={copyLink}>
            <Copy size={14} /> {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
      </div>

      <div className="afd-stat-row">
        <div className="afd-stat">
          <MousePointerClick size={16} />
          <span className="afd-stat-value">{stats?.click_count ?? 0}</span>
          <span className="afd-stat-label">clicks</span>
        </div>
        <div className="afd-stat">
          <UserPlus size={16} />
          <span className="afd-stat-value">{stats?.conversion_count ?? 0}</span>
          <span className="afd-stat-label">conversions</span>
        </div>
        <div className="afd-stat">
          <DollarSign size={16} />
          <span className="afd-stat-value">${stats?.total_earned?.toFixed(2) ?? '0.00'}</span>
          <span className="afd-stat-label">earned</span>
        </div>
        <div className="afd-stat">
          <Wallet size={16} />
          <span className="afd-stat-value">${stats?.balance_due?.toFixed(2) ?? '0.00'}</span>
          <span className="afd-stat-label">balance due</span>
        </div>
      </div>

      <div className="afd-cal-head">Growth calendar — {monthLabel}</div>
      <div className="afd-cal-grid">
        {days.map(day => {
          const idea = CONTENT_IDEAS[(day - 1) % CONTENT_IDEAS.length]
          const dayClicks = clicksByDay[day] || 0
          const dayConv = conversionsByDay[day]
          const isToday = day === todayNum
          return (
            <div key={day} className={`afd-cal-cell ${isToday ? 'afd-cal-today' : ''}`}>
              <div className="afd-cal-day">{day}</div>
              <p className="afd-cal-idea">{idea}</p>
              {(dayClicks > 0 || dayConv) && (
                <div className="afd-cal-activity">
                  {dayClicks > 0 && <span className="afd-cal-badge afd-cal-clicks">{dayClicks} click{dayClicks > 1 ? 's' : ''}</span>}
                  {dayConv && <span className="afd-cal-badge afd-cal-earn">+${dayConv.earned.toFixed(2)}</span>}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
