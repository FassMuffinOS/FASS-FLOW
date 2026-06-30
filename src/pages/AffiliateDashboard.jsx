import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Megaphone, Copy, Link2, Loader2, MousePointerClick, UserPlus, DollarSign, Wallet,
  Target, CheckCircle2, Circle, Calculator, MessageSquare, Users, Check, Trophy, Sparkles,
  Share2, Send, BarChart3,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { apiFetch } from '../lib/apiClient'
import './AffiliateDashboard.css'

const API_BASE = import.meta.env.VITE_API_URL || ''

// Same four pitch points shown on the public /affiliates page — repeated
// here inline so someone who lands on the dashboard before joining (the
// account-first flow: sign up -> straight to dashboard) still sees the
// offer instead of a bare "join" button with no context.
const WHY = [
  '30% commission on every plan signup and Wallet unlock through your link',
  'No application, no follower minimum — sign up and start sharing today',
  'Your own link, stats dashboard, and a growth calendar of post ideas',
  'Recruit other creators and earn 10% of everything they earn too',
]

// Daily/weekly directive — a specific action, not just a content idea.
// Distinct from CONTENT_IDEAS below: that's "what to post," this is "what
// to actually go do today" (DM someone, follow up, check a number).
const ASSIGNMENTS = [
  'DM 3 people in your niche who run a small business — ask if they\'ve heard of FASS Flow',
  'Check your click count from this week — if it\'s 0, post your link somewhere today',
  'Follow up with anyone who clicked your link but hasn\'t signed up yet',
  'Find 1 other creator in your space and send them your recruiting pitch',
  'Add your affiliate link to one place you haven\'t yet (bio, newsletter, pinned post)',
  'Re-read your top-performing post and write a follow-up using the same angle',
  'Ask 1 follower directly: "Want me to send you the tool I use for [pain point]?"',
]

// Copy-paste sales scripts — the actual asks, not just talking points.
// Each one is meant to be used close to verbatim.
const PITCH_SCRIPTS = [
  {
    title: 'Cold DM to a small business owner',
    body: "Hey! Saw you run [business] — I started using a tool called FASS Flow that handles bidding, contracts, and a loyalty/rewards Wallet pass for local businesses. I get a small commission if you check it out, but honestly I'd send it your way either way: [your link]. No pressure, just thought of you.",
  },
  {
    title: 'Social post caption',
    body: "If you run a small business and you're still tracking jobs/bids in a notebook or spreadsheet, you need to see this. I've been using FASS Flow and it's saved me hours — link in bio if you want to try it free.",
  },
  {
    title: 'Recruiting another creator',
    body: "I'm promoting a tool called FASS Flow as an affiliate — 30% commission, no follower minimum, real dashboard to track everything. If you recruit other creators under your link, you also earn 10% of what they make. Want my link to check it out? [your link]",
  },
  {
    title: 'Email newsletter footer',
    body: "P.S. — I've been using FASS Flow to run the business side of things (bidding, contracts, customer rewards). If you want to try it, here's my link — using it helps support this newsletter too: [your link]",
  },
]

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

// Day-1 onboarding mission — three fixed checklist items, each worth a
// flat 100 XP (see XP_VALUES in affiliates.py). "Generate referral link"
// is auto-completed by join() the moment the account exists; the other two
// are self-reported claims (there's no real signal for "read your profile"
// or "watched the video") but are still idempotent server-side.
const ONBOARDING_ITEMS = [
  { key: 'join', label: 'Generate your referral link', auto: true },
  { key: 'complete_profile', label: 'Look over your profile and confirm it\'s ready to share', auto: false },
  { key: 'watch_onboarding', label: 'Watch the 2-minute creator onboarding walkthrough', auto: false },
]

// Channels a creator typically drops their link on. The `id` becomes the
// ?src= tag on the link, which flows through track-click -> attribute ->
// conversion so the dashboard can show clicks AND earnings per channel.
// These ids must match what the share buttons tag themselves with below.
const CHANNELS = [
  { id: 'tiktok', label: 'TikTok' },
  { id: 'youtube', label: 'YouTube' },
  { id: 'instagram', label: 'Instagram' },
  { id: 'facebook', label: 'Facebook' },
  { id: 'reddit', label: 'Reddit' },
  { id: 'discord', label: 'Discord' },
  { id: 'kick', label: 'Kick' },
  { id: 'x', label: 'X / Twitter' },
  { id: 'linkedin', label: 'LinkedIn' },
  { id: 'newsletter', label: 'Newsletter' },
  { id: 'bio', label: 'Link in bio' },
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
  const [recruits, setRecruits] = useState([])
  const [joining, setJoining] = useState(false)
  const [copied, setCopied] = useState(false)
  const [copiedScript, setCopiedScript] = useState(null)
  const [gamification, setGamification] = useState(null)
  const [marking, setMarking] = useState(false)
  const [claiming, setClaiming] = useState(null)
  const [xpToast, setXpToast] = useState(null)
  const [shareCopied, setShareCopied] = useState(false)
  const [canNativeShare] = useState(() => typeof navigator !== 'undefined' && !!navigator.share)
  const [channels, setChannels] = useState([])
  const [builderSrc, setBuilderSrc] = useState(CHANNELS[0].id)
  const [builderCopied, setBuilderCopied] = useState(false)

  function flashXp(amount) {
    if (!amount) return
    setXpToast(amount)
    setTimeout(() => setXpToast(null), 2200)
  }

  const assignmentDone = !!gamification?.assignment_done_today

  async function toggleAssignmentDone() {
    if (!userId || assignmentDone || marking) return
    setMarking(true)
    try {
      const res = await apiFetch(`/api/v1/affiliates/assignment/done`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        setGamification(g => g ? { ...g, assignment_done_today: true } : g)
        flashXp(data.xp_amount)
        await load()
      }
    } catch (err) {
      console.error('AffiliateDashboard: failed to mark assignment done', err)
    } finally {
      setMarking(false)
    }
  }

  async function claimOnboarding(key) {
    if (!userId || claiming) return
    setClaiming(key)
    try {
      const res = await apiFetch(`/api/v1/affiliates/xp/claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, action: key }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        setGamification(g => g ? { ...g, onboarding: { ...g.onboarding, [key]: true } } : g)
        flashXp(data.xp_amount)
        await load()
      }
    } catch (err) {
      console.error('AffiliateDashboard: failed to claim onboarding item', err)
    } finally {
      setClaiming(null)
    }
  }

  // Payout calculator — frontend-only "what could I earn" estimator.
  // Plan prices mirror Pricing.jsx's real tiers so the numbers are honest.
  const PLAN_OPTIONS = [
    { label: 'Starter — $99/mo', price: 99 },
    { label: 'Pro — $200/mo', price: 200 },
    { label: 'Elite — $499/mo', price: 499 },
  ]
  const [calcReferrals, setCalcReferrals] = useState(5)
  const [calcPlanIdx, setCalcPlanIdx] = useState(1)
  const [calcRecruits, setCalcRecruits] = useState(0)
  const calcPlanPrice = PLAN_OPTIONS[calcPlanIdx].price
  const calcOwnMonthly = calcReferrals * calcPlanPrice * 0.30
  const calcOverrideMonthly = calcRecruits * calcOwnMonthly * 0.10
  const calcTotalMonthly = calcOwnMonthly + calcOverrideMonthly

  const load = useCallback(async () => {
    if (!userId || !API_BASE) return
    try {
      const res = await apiFetch(`/api/v1/affiliates/me?user_id=${userId}`)
      if (res.ok) {
        const data = await res.json()
        setAffiliate(data.affiliate)
        setStats(data.stats || null)
        setClicks(data.clicks || [])
        setConversions(data.conversions || [])
        setRecruits(data.recruits || [])
        setGamification(data.gamification || null)
        setChannels(data.channels || [])
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
      const res = await apiFetch(`/api/v1/affiliates/join`, {
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

  // Same referral code, with a ?src= channel tag so clicks/earnings can be
  // traced back to where the link was posted. Used by the channel builder
  // and by each share button (which tags itself with its own platform id).
  function linkWithSource(src) {
    if (!affiliate) return ''
    const base = `${window.location.origin}/?ref=${affiliate.code}`
    return src ? `${base}&src=${encodeURIComponent(src)}` : base
  }

  function copyLink() {
    if (!link) return
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    })
  }

  function copyBuilderLink() {
    const v = linkWithSource(builderSrc)
    if (!v) return
    navigator.clipboard.writeText(v).then(() => {
      setBuilderCopied(true)
      setTimeout(() => setBuilderCopied(false), 1800)
    })
  }

  function copyScript(idx, text) {
    const withLink = text.replace('[your link]', link || '[your link]')
    navigator.clipboard.writeText(withLink).then(() => {
      setCopiedScript(idx)
      setTimeout(() => setCopiedScript(null), 1800)
    })
  }

  // Dynamic "brag" line — leads with whatever's most impressive right now
  // (rank if it's past the starting tier, otherwise earnings, otherwise a
  // plain invite) so the share text never reads as a stale template.
  function shareLine() {
    if (gamification?.level >= 3) {
      return `I just hit ${gamification.rank} (Level ${gamification.level}) as a FASS Flow creator partner!`
    }
    if (stats?.total_earned > 0) {
      return `I've earned $${stats.total_earned.toFixed(2)} so far as a FASS Flow creator partner.`
    }
    return `I just became a FASS Flow creator partner!`
  }

  function shareMessage() {
    return `${shareLine()} They handle bidding, contracts, and customer rewards for small businesses — join with my link:`
  }

  // Each share path tags itself so a click that comes back through it is
  // attributed to the right channel automatically — no manual builder step.
  function shareToX() {
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareMessage())}&url=${encodeURIComponent(linkWithSource('x'))}`
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  function shareToFacebook() {
    const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(linkWithSource('facebook'))}&quote=${encodeURIComponent(shareMessage())}`
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  function shareToLinkedIn() {
    const url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(linkWithSource('linkedin'))}`
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  async function shareNative() {
    try {
      await navigator.share({ title: 'FASS Flow', text: shareMessage(), url: linkWithSource('share') })
    } catch {
      // Cancelled or unsupported mid-call — no-op, user can use the other buttons.
    }
  }

  function copyShareText() {
    navigator.clipboard.writeText(`${shareMessage()} ${linkWithSource('copy')}`).then(() => {
      setShareCopied(true)
      setTimeout(() => setShareCopied(false), 1800)
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
          <h2>Welcome — let's get you earning</h2>
          <p>You're signed in. One click sets up your referral link, stats, and growth calendar.</p>
          <ul className="afd-join-why">
            {WHY.map(point => (
              <li key={point}><Check size={14} /> {point}</li>
            ))}
          </ul>
          <button className="btn-primary" onClick={join} disabled={joining}>
            {joining ? <Loader2 size={16} className="spin" /> : <Link2 size={16} />}
            {joining ? 'Creating your link…' : 'Get my affiliate link'}
          </button>
        </div>
      </div>
    )
  }

  const onboardingDone = gamification?.onboarding
    ? ONBOARDING_ITEMS.every(item => gamification.onboarding[item.key])
    : false

  return (
    <div className="afd-page">
      {xpToast && (
        <div className="afd-xp-toast"><Sparkles size={15} /> +{xpToast} XP</div>
      )}

      <div className="afd-head">
        <h1><Megaphone size={20} /> Affiliate Dashboard</h1>
        <button className="btn-outline afd-pitch-link" onClick={() => navigate('/affiliates')}>Program details</button>
      </div>
      <p className="afd-sub">Your referral link, lifetime stats, and a growth calendar — content ideas plus what actually happened, day by day.</p>

      {gamification && (
        <div className="afd-level-card">
          <div className="afd-level-badge">
            <Trophy size={18} />
            <div>
              <span className="afd-level-rank">{gamification.rank}</span>
              <span className="afd-level-num">Level {gamification.level}</span>
            </div>
          </div>
          <div className="afd-level-bar-wrap">
            <div className="afd-level-bar-track">
              <div className="afd-level-bar-fill" style={{ width: `${gamification.level_progress_pct}%` }} />
            </div>
            <span className="afd-level-bar-label">
              {gamification.xp_into_level} / {gamification.xp_into_level + gamification.xp_to_next_level} XP
              {gamification.next_rank ? ` to ${gamification.next_rank}` : ' — top rank'}
            </span>
          </div>
        </div>
      )}

      {gamification && !onboardingDone && (
        <div className="afd-section afd-onboarding">
          <div className="afd-section-head"><Target size={17} /> Day-1 onboarding mission</div>
          <p className="afd-section-sub">Knock these out and you're fully set up — each one is +100 XP.</p>
          <div className="afd-onboarding-list">
            {ONBOARDING_ITEMS.map(item => {
              const done = !!gamification.onboarding?.[item.key]
              return (
                <div className={`afd-onboarding-item ${done ? 'afd-onboarding-item-done' : ''}`} key={item.key}>
                  {done ? <CheckCircle2 size={17} /> : <Circle size={17} />}
                  <span>{item.label}</span>
                  {!done && !item.auto && (
                    <button
                      className="afd-onboarding-claim"
                      onClick={() => claimOnboarding(item.key)}
                      disabled={claiming === item.key}
                    >
                      {claiming === item.key ? <Loader2 size={13} className="spin" /> : 'Mark done'}
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="afd-link-box">
        <span className="afd-link-label">Your link</span>
        <div className="afd-link-row">
          <input readOnly value={link} onClick={e => e.target.select()} />
          <button className="btn-outline afd-copy-btn" onClick={copyLink}>
            <Copy size={14} /> {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
      </div>

      <div className="afd-builder">
        <span className="afd-link-label">Make a channel link</span>
        <p className="afd-builder-sub">
          Tag your link with where you're posting it. Same link, but every click and signup is sorted by
          channel below — so you can see what's actually working and double down.
        </p>
        <div className="afd-builder-chips">
          {CHANNELS.map(ch => (
            <button
              key={ch.id}
              className={`afd-builder-chip ${builderSrc === ch.id ? 'is-active' : ''}`}
              onClick={() => setBuilderSrc(ch.id)}
            >
              {ch.label}
            </button>
          ))}
        </div>
        <div className="afd-link-row">
          <input readOnly value={linkWithSource(builderSrc)} onClick={e => e.target.select()} />
          <button className="btn-outline afd-copy-btn" onClick={copyBuilderLink}>
            <Copy size={14} /> {builderCopied ? 'Copied' : 'Copy'}
          </button>
        </div>
      </div>

      <div className="afd-share">
        <span className="afd-link-label">Share your progress</span>
        <p className="afd-share-preview">{shareMessage()} <span className="afd-share-preview-link">{link}</span></p>
        <div className="afd-share-row">
          <button className="afd-share-btn afd-share-x" onClick={shareToX}><Send size={14} /> Share on X</button>
          <button className="afd-share-btn afd-share-fb" onClick={shareToFacebook}><Send size={14} /> Facebook</button>
          <button className="afd-share-btn afd-share-li" onClick={shareToLinkedIn}><Send size={14} /> LinkedIn</button>
          {canNativeShare && (
            <button className="afd-share-btn afd-share-native" onClick={shareNative}><Share2 size={14} /> More…</button>
          )}
          <button className="afd-share-btn afd-share-copy" onClick={copyShareText}>
            <Copy size={14} /> {shareCopied ? 'Copied' : 'Copy text'}
          </button>
        </div>
      </div>

      <div className={`afd-assignment ${assignmentDone ? 'afd-assignment-done' : ''}`}>
        <div className="afd-assignment-icon"><Target size={18} /></div>
        <div className="afd-assignment-body">
          <span className="afd-assignment-label">Today's assignment</span>
          <p>{ASSIGNMENTS[(now.getDate() - 1) % ASSIGNMENTS.length]}</p>
        </div>
        <button className="afd-assignment-toggle" onClick={toggleAssignmentDone} disabled={assignmentDone || marking}>
          {marking ? <Loader2 size={18} className="spin" /> : assignmentDone ? <CheckCircle2 size={18} /> : <Circle size={18} />}
          {assignmentDone ? 'Done · +25 XP' : 'Mark done'}
        </button>
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

      <div className="afd-stat-row afd-stat-row-secondary">
        <div className="afd-stat">
          <Users size={16} />
          <span className="afd-stat-value">{stats?.recruit_count ?? 0}</span>
          <span className="afd-stat-label">creators recruited</span>
        </div>
        <div className="afd-stat">
          <DollarSign size={16} />
          <span className="afd-stat-value">${stats?.override_earned?.toFixed(2) ?? '0.00'}</span>
          <span className="afd-stat-label">override earnings</span>
        </div>
      </div>

      <div className="afd-section">
        <div className="afd-section-head"><BarChart3 size={17} /> Where it's coming from</div>
        <p className="afd-section-sub">
          Clicks and signups by channel — based on the <code>?src=</code> tag on the links you share.
          Untagged is anything posted with a plain link.
        </p>
        {channels.length === 0 ? (
          <div className="afd-recruits-empty">
            No clicks yet. Use a channel link above when you post, and your top channels will show up here.
          </div>
        ) : (
          <div className="afd-channels">
            <div className="afd-channel-row afd-channel-head">
              <span>Channel</span>
              <span>Clicks</span>
              <span>Signups</span>
              <span>Earned</span>
            </div>
            {channels.map(ch => {
              const known = CHANNELS.find(c => c.id === ch.source)
              const label = known ? known.label : (ch.source === 'untagged' ? 'Untagged' : ch.source)
              return (
                <div className="afd-channel-row" key={ch.source}>
                  <span className="afd-channel-name">{label}</span>
                  <span>{ch.clicks}</span>
                  <span>{ch.conversions}</span>
                  <span className="afd-channel-earned">${ch.earned.toFixed(2)}</span>
                </div>
              )
            })}
          </div>
        )}
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

      <div className="afd-section">
        <div className="afd-section-head"><Calculator size={17} /> Payout calculator</div>
        <p className="afd-section-sub">Estimate what you could earn — adjust to your own numbers.</p>
        <div className="afd-calc">
          <div className="afd-calc-row">
            <label>Referrals you bring in per month</label>
            <input
              type="range" min="0" max="50" value={calcReferrals}
              onChange={e => setCalcReferrals(Number(e.target.value))}
            />
            <span className="afd-calc-value">{calcReferrals}</span>
          </div>
          <div className="afd-calc-row">
            <label>Average plan they sign up for</label>
            <select value={calcPlanIdx} onChange={e => setCalcPlanIdx(Number(e.target.value))}>
              {PLAN_OPTIONS.map((p, i) => <option key={p.label} value={i}>{p.label}</option>)}
            </select>
          </div>
          <div className="afd-calc-row">
            <label>Other creators you recruit (earning the same)</label>
            <input
              type="range" min="0" max="20" value={calcRecruits}
              onChange={e => setCalcRecruits(Number(e.target.value))}
            />
            <span className="afd-calc-value">{calcRecruits}</span>
          </div>
          <div className="afd-calc-result">
            <div className="afd-calc-result-row">
              <span>Your own commission (30%)</span>
              <span>${calcOwnMonthly.toFixed(2)}/mo</span>
            </div>
            <div className="afd-calc-result-row">
              <span>Recruiting override (10%)</span>
              <span>${calcOverrideMonthly.toFixed(2)}/mo</span>
            </div>
            <div className="afd-calc-result-row afd-calc-total">
              <span>Estimated total</span>
              <span>${calcTotalMonthly.toFixed(2)}/mo</span>
            </div>
          </div>
          <p className="afd-calc-note">Estimate only — actual commission is calculated on real signups and recorded in your stats above.</p>
        </div>
      </div>

      <div className="afd-section">
        <div className="afd-section-head"><MessageSquare size={17} /> Pitch scripts</div>
        <p className="afd-section-sub">Copy-paste scripts for selling and recruiting — your link gets dropped in automatically.</p>
        <div className="afd-scripts">
          {PITCH_SCRIPTS.map((s, idx) => (
            <div className="afd-script" key={s.title}>
              <div className="afd-script-head">
                <span className="afd-script-title">{s.title}</span>
                <button className="btn-outline afd-copy-btn" onClick={() => copyScript(idx, s.body)}>
                  <Copy size={13} /> {copiedScript === idx ? 'Copied' : 'Copy'}
                </button>
              </div>
              <p className="afd-script-body">{s.body}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="afd-section">
        <div className="afd-section-head"><Users size={17} /> Recruit other creators</div>
        <p className="afd-section-sub">
          Share the same link above to recruit — anyone who clicks it and later joins as an affiliate
          becomes your recruit automatically. You earn 10% of every commission they make, for as long
          as they're active. One level deep — no chains beyond that.
        </p>
        {recruits.length === 0 ? (
          <div className="afd-recruits-empty">No one's joined under your link yet — share it using the recruiting script above.</div>
        ) : (
          <div className="afd-recruits-list">
            {recruits.map(r => (
              <div className="afd-recruit-row" key={r.user_id}>
                <span className="afd-recruit-code">{r.code}</span>
                <span className={`afd-recruit-status afd-status-${r.status}`}>{r.status}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
