import { useState, useEffect } from 'react'
import {
  Settings as SettingsIcon, User, Bell, CreditCard, Plug, ShieldCheck,
  Sun, Moon, Loader, Check, ExternalLink, Download, Trash2, AlertTriangle,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { TRACKS } from '../lib/track'
import { apiFetch } from '../lib/apiClient'
import { getCreditBalance, listCreditPacks, startCreditCheckout } from '../lib/credits'
import {
  getPreferences, updatePreferences, changeEmail, changePassword,
  requestDataExport, requestAccountDeletion, listAccountRequests,
  getConnectStatus, getAffiliateStatus, getBillingPortalUrl,
} from '../lib/settings'
import './Settings.css'

const API_BASE = import.meta.env.VITE_API_URL || ''

const SECTIONS = [
  { id: 'general', label: 'General', icon: SettingsIcon },
  { id: 'account', label: 'Account', icon: User },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'billing', label: 'Billing & AI Credits', icon: CreditCard },
  { id: 'connectors', label: 'Connectors', icon: Plug },
  { id: 'privacy', label: 'Privacy & Security', icon: ShieldCheck },
]

const PLAN_LABELS = { lite: 'Lite', starter: 'Core', pro: 'Pro', team: 'Team', promo: 'Promo Access' }

// User control center — General/Account/Notifications/Billing/Connectors/
// Privacy, modeled on the left-nav-plus-detail-panel pattern. Each section
// reuses whatever backend already exists (credits.js, /connect/status,
// /affiliates/me, /subscriptions/portal) and only app/routers/settings.py
// is new (preferences, email/password change, privacy requests).
export default function SettingsPage() {
  const { session } = useAuth()
  const userId = session?.user?.id
  const email = session?.user?.email ?? ''
  const [active, setActive] = useState('general')

  return (
    <div className="set">
      <div className="set-wrap">
        <div className="set-head">
          <h1 className="set-title"><SettingsIcon size={20} /> Settings</h1>
          <p className="set-sub">Manage your account, preferences, and how FASS Flow works for you.</p>
        </div>

        <div className="set-body">
          <nav className="set-nav">
            {SECTIONS.map(s => {
              const Icon = s.icon
              return (
                <button
                  key={s.id}
                  className={`set-nav-item ${active === s.id ? 'is-active' : ''}`}
                  onClick={() => setActive(s.id)}
                >
                  <Icon size={16} />
                  <span>{s.label}</span>
                </button>
              )
            })}
          </nav>

          <div className="set-panel">
            {active === 'general' && <GeneralSection userId={userId} />}
            {active === 'account' && <AccountSection userId={userId} email={email} />}
            {active === 'notifications' && <NotificationsSection userId={userId} />}
            {active === 'billing' && <BillingSection userId={userId} email={email} />}
            {active === 'connectors' && <ConnectorsSection userId={userId} />}
            {active === 'privacy' && <PrivacySection userId={userId} />}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Shared bits ──
function Row({ title, desc, children }) {
  return (
    <div className="set-row">
      <div className="set-row-text">
        <div className="set-row-title">{title}</div>
        {desc && <div className="set-row-desc">{desc}</div>}
      </div>
      <div className="set-row-control">{children}</div>
    </div>
  )
}

function Toggle({ checked, onChange, disabled }) {
  return (
    <button
      type="button"
      className={`set-toggle ${checked ? 'is-on' : ''}`}
      onClick={() => onChange(!checked)}
      disabled={disabled}
      aria-pressed={checked}
    >
      <span className="set-toggle-knob" />
    </button>
  )
}

function SaveStatus({ state }) {
  // state: null | 'saving' | 'saved' | 'error'
  if (state === 'saving') return <span className="set-savestate"><Loader size={12} className="set-spin" /> Saving…</span>
  if (state === 'saved') return <span className="set-savestate set-saved"><Check size={12} /> Saved</span>
  if (state === 'error') return <span className="set-savestate set-error">Couldn't save</span>
  return null
}

// ── General ──
function GeneralSection({ userId }) {
  const { theme, toggle } = useTheme()
  const [prefs, setPrefs] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saveState, setSaveState] = useState(null)

  useEffect(() => {
    if (!userId) return
    let cancelled = false
    getPreferences(userId).then(p => { if (!cancelled) { setPrefs(p); setLoading(false) } })
    return () => { cancelled = true }
  }, [userId])

  async function save(fields) {
    setSaveState('saving')
    const res = await updatePreferences(userId, fields)
    setSaveState(res.ok ? 'saved' : 'error')
    if (res.ok) setTimeout(() => setSaveState(null), 1500)
  }

  if (loading) return <SectionLoading />

  return (
    <div className="set-section">
      <h2 className="set-section-title">General <SaveStatus state={saveState} /></h2>

      <Row title="Appearance" desc="Switch between light and dark mode.">
        <button className="set-theme-btn" onClick={() => { toggle(); save({ theme: theme === 'dark' ? 'light' : 'dark' }) }}>
          {theme === 'dark' ? <Moon size={14} /> : <Sun size={14} />}
          {theme === 'dark' ? 'Dark' : 'Light'}
        </button>
      </Row>

      <Row title="Default track" desc="The business identity that drives your dashboard path, sidebar view, and AI framing.">
        <select
          className="set-select"
          defaultValue={prefs?.default_track || 'govcon'}
          onChange={e => save({ default_track: e.target.value })}
        >
          {TRACKS.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </Row>

      <Row title="AI auto-draft" desc="Automatically draft a proposal section as soon as a solicitation is scored.">
        <Toggle checked={!!prefs?.ai_auto_draft} onChange={v => { setPrefs(p => ({ ...p, ai_auto_draft: v })); save({ ai_auto_draft: v }) }} />
      </Row>
    </div>
  )
}

// ── Account ──
function AccountSection({ userId, email }) {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [fullName, setFullName] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [saveState, setSaveState] = useState(null)

  const [newEmail, setNewEmail] = useState('')
  const [emailMsg, setEmailMsg] = useState(null)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordMsg, setPasswordMsg] = useState(null)

  useEffect(() => {
    if (!userId || !API_BASE) { setLoading(false); return }
    let cancelled = false
    apiFetch(`/api/v1/users/${userId}/profile`)
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (cancelled) return
        setProfile(data)
        setFullName(data?.full_name || '')
        setCompanyName(data?.company_name || '')
        setLoading(false)
      })
      .catch(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [userId])

  async function saveProfile() {
    setSaveState('saving')
    try {
      const res = await apiFetch(`/api/v1/users/${userId}/profile`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ full_name: fullName, company_name: companyName }),
      })
      setSaveState(res.ok ? 'saved' : 'error')
    } catch {
      setSaveState('error')
    }
    setTimeout(() => setSaveState(null), 1500)
  }

  async function submitEmail() {
    setEmailMsg(null)
    if (!newEmail.trim()) return
    const res = await changeEmail(userId, newEmail.trim())
    setEmailMsg(res.ok ? { ok: true, text: res.message || 'Check your new email to confirm.' } : { ok: false, text: res.error })
    if (res.ok) setNewEmail('')
  }

  async function submitPassword() {
    setPasswordMsg(null)
    if (newPassword.length < 8) { setPasswordMsg({ ok: false, text: 'Password must be at least 8 characters.' }); return }
    if (newPassword !== confirmPassword) { setPasswordMsg({ ok: false, text: "Passwords don't match." }); return }
    const res = await changePassword(userId, newPassword)
    setPasswordMsg(res.ok ? { ok: true, text: 'Password updated.' } : { ok: false, text: res.error })
    if (res.ok) { setNewPassword(''); setConfirmPassword('') }
  }

  if (loading) return <SectionLoading />

  return (
    <div className="set-section">
      <h2 className="set-section-title">Account</h2>

      <Row title="Name" desc="Shown on your business profile and capability statement.">
        <input className="set-input" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Your name" />
      </Row>
      <Row title="Company" desc="">
        <input className="set-input" value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="Company name" />
      </Row>
      <div className="set-row set-row-action">
        <button className="set-save-btn" onClick={saveProfile}>Save profile</button>
        <SaveStatus state={saveState} />
      </div>

      <h3 className="set-subhead">Email</h3>
      <Row title="Current email" desc={email}>
        <div className="set-inline-form">
          <input className="set-input" type="email" placeholder="New email address" value={newEmail} onChange={e => setNewEmail(e.target.value)} />
          <button className="set-save-btn" onClick={submitEmail}>Update</button>
        </div>
      </Row>
      {emailMsg && <p className={`set-msg ${emailMsg.ok ? 'set-msg-ok' : 'set-msg-error'}`}>{emailMsg.text}</p>}

      <h3 className="set-subhead">Password</h3>
      <Row title="Change password" desc="At least 8 characters.">
        <div className="set-inline-form set-inline-form-col">
          <input className="set-input" type="password" placeholder="New password" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
          <input className="set-input" type="password" placeholder="Confirm new password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
          <button className="set-save-btn" onClick={submitPassword}>Update password</button>
        </div>
      </Row>
      {passwordMsg && <p className={`set-msg ${passwordMsg.ok ? 'set-msg-ok' : 'set-msg-error'}`}>{passwordMsg.text}</p>}
    </div>
  )
}

// ── Notifications ──
function NotificationsSection({ userId }) {
  const [prefs, setPrefs] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saveState, setSaveState] = useState(null)

  useEffect(() => {
    if (!userId) return
    let cancelled = false
    getPreferences(userId).then(p => { if (!cancelled) { setPrefs(p); setLoading(false) } })
    return () => { cancelled = true }
  }, [userId])

  async function save(field, value) {
    setPrefs(p => ({ ...p, [field]: value }))
    setSaveState('saving')
    const res = await updatePreferences(userId, { [field]: value })
    setSaveState(res.ok ? 'saved' : 'error')
    if (res.ok) setTimeout(() => setSaveState(null), 1500)
  }

  if (loading) return <SectionLoading />

  return (
    <div className="set-section">
      <h2 className="set-section-title">Notifications <SaveStatus state={saveState} /></h2>
      <Row title="Email notifications" desc="Proposal deadlines, awarded contracts, and account activity.">
        <Toggle checked={!!prefs?.email_notifications} onChange={v => save('email_notifications', v)} />
      </Row>
      <Row title="SMS notifications" desc="Time-sensitive alerts via the Comms Hub's Twilio number.">
        <Toggle checked={!!prefs?.sms_notifications} onChange={v => save('sms_notifications', v)} />
      </Row>
      <Row title="Push notifications" desc="Browser/desktop alerts when FASS Flow is open in another tab.">
        <Toggle checked={!!prefs?.push_notifications} onChange={v => save('push_notifications', v)} />
      </Row>
    </div>
  )
}

// ── Billing & AI Credits ──
function BillingSection({ userId, email }) {
  const [profile, setProfile] = useState(null)
  const [balance, setBalance] = useState(null)
  const [packs, setPacks] = useState([])
  const [loading, setLoading] = useState(true)
  const [portalLoading, setPortalLoading] = useState(false)
  const [buyingPack, setBuyingPack] = useState(null)
  const [justBought, setJustBought] = useState(false)

  useEffect(() => {
    if (!userId || !API_BASE) { setLoading(false); return }
    let cancelled = false
    Promise.all([
      apiFetch(`/api/v1/users/${userId}/profile`).then(res => res.ok ? res.json() : null).catch(() => null),
      getCreditBalance(userId),
      listCreditPacks(),
    ]).then(([p, b, packList]) => {
      if (cancelled) return
      setProfile(p)
      setBalance(b)
      setPacks(packList)
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [userId])

  useEffect(() => {
    // Return trip from credits.py's /checkout success_url. Pure
    // presentation — the balance already came back fresh from the effect
    // above, this just confirms the purchase landed and tidies the URL so
    // a refresh doesn't re-show the banner.
    const params = new URLSearchParams(window.location.search)
    if (params.get('credits') === 'success') {
      setJustBought(true)
      params.delete('credits')
      const rest = params.toString()
      window.history.replaceState({}, '', `${window.location.pathname}${rest ? `?${rest}` : ''}`)
    }
  }, [])

  async function openPortal() {
    setPortalLoading(true)
    const url = await getBillingPortalUrl(userId)
    setPortalLoading(false)
    if (url) window.location.href = url
  }

  async function buyPack(priceId) {
    setBuyingPack(priceId)
    const url = await startCreditCheckout(priceId, userId, email)
    if (url) {
      window.location.href = url
      return
    }
    setBuyingPack(null)
  }

  if (loading) return <SectionLoading />

  const plan = profile?.plan
  const status = profile?.subscription_status
  const isActive = status === 'active'

  return (
    <div className="set-section">
      <h2 className="set-section-title">Billing & AI Credits</h2>

      <Row title="Current plan" desc={isActive ? 'Active subscription' : (status || 'No active subscription')}>
        <span className={`set-plan-badge ${isActive ? 'is-active' : ''}`}>{PLAN_LABELS[plan] || plan || 'Free'}</span>
      </Row>

      <Row title="Manage billing" desc="Update payment method, view invoices, or change/cancel your plan via Stripe.">
        <button className="set-save-btn" onClick={openPortal} disabled={portalLoading || !profile?.stripe_customer_id}>
          {portalLoading ? 'Opening…' : 'Open billing portal'} <ExternalLink size={13} />
        </button>
      </Row>
      {!profile?.stripe_customer_id && <p className="set-row-desc set-billing-note">No billing account yet — subscribe on the Pricing page to manage billing here.</p>}

      <h3 className="set-subhead">AI Credits</h3>
      {justBought && <p className="set-row-desc set-credits-success"><Check size={13} /> Credits added — thanks!</p>}
      <Row title="Balance" desc="1 credit per AI-drafted proposal section.">
        <span className="set-credit-balance">{balance == null ? '—' : balance}</span>
      </Row>

      {packs.length > 0 ? (
        <div className="set-credit-packs">
          <p className="set-row-desc">Buy more — bigger packs come with a bonus, no subscription required.</p>
          <div className="set-pack-grid">
            {packs.map(pack => (
              <button
                key={pack.price_id}
                className="set-pack-card"
                onClick={() => buyPack(pack.price_id)}
                disabled={buyingPack !== null}
              >
                <span className="set-pack-price">{pack.amount_display}</span>
                <span className="set-pack-credits">{pack.credits.toLocaleString()} credits</span>
                {buyingPack === pack.price_id && <span className="set-pack-loading">Starting checkout…</span>}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <p className="set-row-desc">Need more? Reach out on the Support page — refills are honored honor-system during beta.</p>
      )}
    </div>
  )
}

// ── Connectors ──
function ConnectorsSection({ userId }) {
  const [connect, setConnect] = useState(null)
  const [affiliate, setAffiliate] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) { setLoading(false); return }
    let cancelled = false
    Promise.all([getConnectStatus(userId), getAffiliateStatus()]).then(([c, a]) => {
      if (cancelled) return
      setConnect(c)
      setAffiliate(a)
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [userId])

  if (loading) return <SectionLoading />

  return (
    <div className="set-section">
      <h2 className="set-section-title">Connectors & Integrations</h2>

      <Row
        title="Stripe Connect"
        desc={connect?.connected ? (connect.payouts_enabled ? 'Connected — payouts enabled' : 'Connected — finish onboarding to enable payouts') : 'Link your own Stripe account to receive gift card and rewards payouts directly.'}
      >
        <span className={`set-status-pill ${connect?.payouts_enabled ? 'is-good' : connect?.connected ? 'is-warn' : ''}`}>
          {connect?.payouts_enabled ? 'Active' : connect?.connected ? 'Pending' : 'Not connected'}
        </span>
      </Row>

      <Row
        title="Affiliate program"
        desc={affiliate ? 'Your referral link is live — track clicks and conversions on the Affiliate Dashboard.' : 'Join the affiliate program to earn on referrals.'}
      >
        <span className={`set-status-pill ${affiliate ? 'is-good' : ''}`}>{affiliate ? 'Joined' : 'Not joined'}</span>
      </Row>

      <p className="set-row-desc">Manage Stripe Connect from Payouts, and your affiliate link from the Affiliate Dashboard — both are linked in the sidebar.</p>
    </div>
  )
}

// ── Privacy & Security ──
function PrivacySection({ userId }) {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    if (!userId) { setLoading(false); return }
    let cancelled = false
    listAccountRequests(userId).then(r => { if (!cancelled) { setRequests(r); setLoading(false) } })
    return () => { cancelled = true }
  }, [userId])

  async function refresh() {
    setRequests(await listAccountRequests(userId))
  }

  async function doExport() {
    setBusy('export')
    await requestDataExport(userId)
    await refresh()
    setBusy(null)
  }

  async function doDelete() {
    setBusy('delete')
    await requestAccountDeletion(userId)
    await refresh()
    setBusy(null)
    setConfirmDelete(false)
  }

  if (loading) return <SectionLoading />

  return (
    <div className="set-section">
      <h2 className="set-section-title">Privacy & Security</h2>

      <Row title="Export your data" desc="Request a copy of your FASS Flow data — profile, proposals, and activity. We'll follow up by email.">
        <button className="set-save-btn" onClick={doExport} disabled={busy === 'export'}>
          <Download size={13} /> {busy === 'export' ? 'Requesting…' : 'Request export'}
        </button>
      </Row>

      <Row title="Delete your account" desc="Permanently removes your account and data. This can't be undone.">
        {!confirmDelete ? (
          <button className="set-danger-btn" onClick={() => setConfirmDelete(true)}>
            <Trash2 size={13} /> Delete account
          </button>
        ) : (
          <div className="set-confirm-delete">
            <span className="set-confirm-text"><AlertTriangle size={13} /> Are you sure?</span>
            <button className="set-danger-btn" onClick={doDelete} disabled={busy === 'delete'}>
              {busy === 'delete' ? 'Submitting…' : 'Yes, delete'}
            </button>
            <button className="set-save-btn" onClick={() => setConfirmDelete(false)}>Cancel</button>
          </div>
        )}
      </Row>

      {requests.length > 0 && (
        <div className="set-requests">
          <h3 className="set-subhead">Request history</h3>
          {requests.map(r => (
            <div key={r.id} className="set-request-row">
              <span className="set-request-type">{r.type === 'export' ? 'Data export' : 'Account deletion'}</span>
              <span className={`set-status-pill ${r.status === 'completed' ? 'is-good' : 'is-warn'}`}>{r.status}</span>
              <span className="set-request-date">{new Date(r.created_at).toLocaleDateString()}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function SectionLoading() {
  return <div className="set-loading"><Loader size={16} className="set-spin" /> Loading…</div>
}
