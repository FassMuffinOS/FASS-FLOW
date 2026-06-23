import { useState, useEffect } from 'react'
import { Trophy, FileCheck, Handshake, Lock } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import './MilestoneBadges.css'

// Three milestones worth celebrating on the way to a sustainable govcon
// pipeline. The first two are derived live from real proposal data — no
// separate tracking table needed. "First partner/sub" has no structured
// data source yet (no teaming feature exists), so it's self-reported and
// persisted on the profile (profiles.first_partner_at).
const BADGES = [
  {
    id: 'submitted',
    icon: FileCheck,
    title: 'First bid submitted',
    body: 'You moved a proposal to Submitted in Pipeline.',
  },
  {
    id: 'awarded',
    icon: Trophy,
    title: 'First contract won',
    body: 'A proposal hit Awarded in Pipeline. This is the one that matters.',
  },
  {
    id: 'partner',
    icon: Handshake,
    title: 'First partner or sub',
    body: 'Teamed up with another business as a prime or sub for the first time.',
  },
]

export default function MilestoneBadges() {
  const { session } = useAuth()
  const [unlocked, setUnlocked] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!session?.user?.id) return
    let cancelled = false
    async function load() {
      const [{ data: proposals }, { data: profile }] = await Promise.all([
        supabase.from('proposals').select('stage').eq('user_id', session.user.id),
        supabase.from('profiles').select('first_partner_at').eq('id', session.user.id).single(),
      ])
      if (cancelled) return
      const stages = (proposals || []).map(p => p.stage)
      setUnlocked({
        submitted: stages.some(s => s === 'submitted' || s === 'awarded'),
        awarded: stages.some(s => s === 'awarded'),
        partner: !!profile?.first_partner_at,
      })
      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [session?.user?.id])

  async function claimPartner() {
    if (!session?.user?.id || saving) return
    setSaving(true)
    const { error } = await supabase
      .from('profiles')
      .update({ first_partner_at: new Date().toISOString() })
      .eq('id', session.user.id)
    setSaving(false)
    if (!error) setUnlocked(prev => ({ ...prev, partner: true }))
  }

  if (loading) return null

  return (
    <div className="mb">
      <div className="mb-header">
        <Trophy size={16} className="mb-header-icon" />
        <span>Milestones</span>
      </div>
      <div className="mb-grid">
        {BADGES.map(b => {
          const Icon = b.icon
          const done = !!unlocked[b.id]
          return (
            <div key={b.id} className={`mb-badge ${done ? 'mb-badge-done' : ''}`}>
              <div className="mb-badge-icon">
                {done ? <Icon size={20} /> : <Lock size={16} />}
              </div>
              <div className="mb-badge-title">{b.title}</div>
              <p className="mb-badge-body">{b.body}</p>
              {b.id === 'partner' && !done && (
                <button
                  type="button"
                  className="mb-badge-claim"
                  onClick={claimPartner}
                  disabled={saving}
                >
                  {saving ? 'Saving…' : "I've done this"}
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
