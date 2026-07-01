import { useState, useEffect, useCallback } from 'react'
import { Loader2, Building2, KeyRound, Plus, Archive, Pencil, X } from 'lucide-react'
import './Admin.css'
import './WhiteLabelAdmin.css'

// Founder-only white-label admin portal — create/manage enterprise tenants
// that get a customized, branded version of any FASS Flow tool. Same
// admin-secret gate as /admin, /admin/bd-partner, /admin/security; not
// linked anywhere in nav.
//
// Backend: app/routers/tenants.py. Scope note (2026-07-01): this is Phase
// 1 — a tenant record, its branding, which tools it's enabled for, and how
// it's managed (self-managed after handoff / fully managed by us / run
// through an enterprise partner). Actually re-skinning each tool's UI per
// tenant at runtime, subdomain routing, and per-tenant billing are real,
// separate follow-on work, not built here.

const API_BASE = import.meta.env.VITE_API_URL || ''

const MODE_LABELS = {
  self_managed: 'We stand it up, they run it',
  fass_managed: 'We run it fully managed',
  partner_managed: 'An enterprise partner runs it',
}

const EMPTY_FORM = {
  id: null,
  slug: '',
  name: '',
  custom_domain: '',
  logo_url: '',
  primary_color: '',
  secondary_color: '',
  accent_color: '',
  enabled_tools: [],
  management_mode: 'self_managed',
  partner_name: '',
  contact_name: '',
  contact_email: '',
  notes: '',
}

export default function WhiteLabelAdmin() {
  const [secret, setSecret] = useState(sessionStorage.getItem('fass_admin_secret') || '')
  const [catalog, setCatalog] = useState([])
  const [tenants, setTenants] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)

  function rememberSecret(v) {
    setSecret(v)
    sessionStorage.setItem('fass_admin_secret', v)
  }

  const loadAll = useCallback(async () => {
    if (!secret) return
    setLoading(true)
    setError('')
    try {
      const [catRes, listRes] = await Promise.all([
        fetch(`${API_BASE}/api/v1/tenants/catalog`, { headers: { 'X-Admin-Secret': secret } }),
        fetch(`${API_BASE}/api/v1/tenants/admin/list`, { headers: { 'X-Admin-Secret': secret } }),
      ])
      const catJson = await catRes.json().catch(() => ({}))
      const listJson = await listRes.json().catch(() => ({}))
      if (!catRes.ok) throw new Error(catJson.detail || 'Could not load tool catalog')
      if (!listRes.ok) throw new Error(listJson.detail || 'Could not load tenants')
      setCatalog(catJson.tools || [])
      setTenants(listJson.tenants || [])
    } catch (err) {
      setError(err.message || 'Could not load white-label data')
    } finally {
      setLoading(false)
    }
  }, [secret])

  useEffect(() => {
    if (secret) loadAll()
  }, [secret, loadAll])

  function toggleTool(key) {
    setForm(f => ({
      ...f,
      enabled_tools: f.enabled_tools.includes(key)
        ? f.enabled_tools.filter(t => t !== key)
        : [...f.enabled_tools, key],
    }))
  }

  function startCreate() {
    setForm(EMPTY_FORM)
    setShowForm(true)
  }

  function startEdit(t) {
    setForm({
      id: t.id,
      slug: t.slug,
      name: t.name || '',
      custom_domain: t.custom_domain || '',
      logo_url: t.logo_url || '',
      primary_color: t.primary_color || '',
      secondary_color: t.secondary_color || '',
      accent_color: t.accent_color || '',
      enabled_tools: t.enabled_tools || [],
      management_mode: t.management_mode || 'self_managed',
      partner_name: t.partner_name || '',
      contact_name: t.contact_name || '',
      contact_email: t.contact_email || '',
      notes: t.notes || '',
    })
    setShowForm(true)
  }

  async function submitForm(e) {
    e.preventDefault()
    if (!secret || !form.name.trim() || (!form.id && !form.slug.trim())) return
    setSaving(true)
    setError('')
    try {
      const isEdit = !!form.id
      const url = isEdit
        ? `${API_BASE}/api/v1/tenants/admin/${form.id}`
        : `${API_BASE}/api/v1/tenants/admin/create`
      const body = isEdit
        ? { ...form, slug: undefined, id: undefined }
        : { ...form, id: undefined }
      const res = await fetch(url, {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Secret': secret },
        body: JSON.stringify(body),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.detail || `Request failed (${res.status})`)
      setShowForm(false)
      setForm(EMPTY_FORM)
      loadAll()
    } catch (err) {
      setError(err.message || 'Could not save tenant')
    } finally {
      setSaving(false)
    }
  }

  async function archiveTenant(id) {
    if (!secret) return
    setError('')
    try {
      const res = await fetch(`${API_BASE}/api/v1/tenants/admin/${id}`, {
        method: 'DELETE',
        headers: { 'X-Admin-Secret': secret },
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.detail || `Request failed (${res.status})`)
      loadAll()
    } catch (err) {
      setError(err.message || 'Could not archive tenant')
    }
  }

  return (
    <div className="admin-page">
      <div className="admin-card admin-card-wide">
        <div className="admin-header">
          <Building2 size={18} />
          <h1>White Label</h1>
        </div>
        <p className="admin-sub">
          Spin up a customized, branded version of any FASS Flow tool for an enterprise client.
          Pick which tools they get, brand it, and decide how it's managed — you stand it up and
          hand it over, you run it fully managed, or an enterprise partner runs the relationship.
        </p>

        <div className="admin-field">
          <label>Admin secret</label>
          <input
            type="password"
            value={secret}
            onChange={e => rememberSecret(e.target.value)}
            placeholder="paste your ADMIN_SECRET"
          />
        </div>

        {!secret && (
          <p className="admin-hint"><KeyRound size={12} /> Paste your admin secret above to manage tenants.</p>
        )}

        {error && <p className="admin-error">{error}</p>}

        {secret && (
          <>
            <button type="button" className="btn-primary admin-submit wl-new-btn" onClick={startCreate}>
              <Plus size={16} /> New tenant
            </button>

            {loading ? (
              <p className="admin-hint"><Loader2 size={12} className="spin" /> Loading…</p>
            ) : tenants.length === 0 ? (
              <p className="admin-hint">No tenants yet — create the first one above.</p>
            ) : (
              <div className="wl-tenant-list">
                {tenants.map(t => (
                  <div key={t.id} className={`wl-tenant-card wl-status-${t.status}`}>
                    <div className="wl-tenant-top">
                      {t.logo_url ? (
                        <img src={t.logo_url} alt="" className="wl-tenant-logo" />
                      ) : (
                        <div className="wl-tenant-logo wl-tenant-logo-placeholder" style={{ background: t.primary_color || undefined }}>
                          {t.name?.[0]?.toUpperCase() || '?'}
                        </div>
                      )}
                      <div className="wl-tenant-info">
                        <strong>{t.name}</strong>
                        <span className="wl-tenant-slug">{t.slug}</span>
                      </div>
                      <span className={`wl-badge wl-badge-${t.status}`}>{t.status}</span>
                    </div>
                    <p className="wl-tenant-mode">{MODE_LABELS[t.management_mode] || t.management_mode}{t.partner_name ? ` · ${t.partner_name}` : ''}</p>
                    <div className="wl-tenant-tools">
                      {(t.enabled_tools || []).length === 0 ? (
                        <span className="wl-tenant-tools-empty">No tools enabled yet</span>
                      ) : (
                        t.enabled_tools.map(key => (
                          <span key={key} className="wl-tool-pill">{catalog.find(c => c.key === key)?.label?.split(' — ')[0] || key}</span>
                        ))
                      )}
                    </div>
                    <div className="wl-tenant-actions">
                      <button type="button" onClick={() => startEdit(t)}><Pencil size={13} /> Edit</button>
                      {t.status !== 'archived' && (
                        <button type="button" onClick={() => archiveTenant(t.id)} className="wl-archive-btn"><Archive size={13} /> Archive</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {showForm && (
        <div className="wl-modal-overlay" onClick={() => setShowForm(false)}>
          <div className="wl-modal" onClick={e => e.stopPropagation()}>
            <div className="wl-modal-header">
              <h2>{form.id ? 'Edit tenant' : 'New tenant'}</h2>
              <button type="button" onClick={() => setShowForm(false)}><X size={18} /></button>
            </div>
            <form onSubmit={submitForm} className="wl-form">
              <div className="wl-form-row">
                <label>
                  Slug {form.id && <span className="wl-hint-inline">(can't change once created)</span>}
                  <input
                    type="text"
                    value={form.slug}
                    disabled={!!form.id}
                    onChange={e => setForm(f => ({ ...f, slug: e.target.value }))}
                    placeholder="acme-construction"
                    required={!form.id}
                  />
                </label>
                <label>
                  Display name
                  <input
                    type="text"
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="Acme Construction Portal"
                    required
                  />
                </label>
              </div>

              <div className="wl-form-row">
                <label>
                  Logo URL
                  <input type="text" value={form.logo_url} onChange={e => setForm(f => ({ ...f, logo_url: e.target.value }))} placeholder="https://…" />
                </label>
                <label>
                  Custom domain
                  <input type="text" value={form.custom_domain} onChange={e => setForm(f => ({ ...f, custom_domain: e.target.value }))} placeholder="portal.acme.com" />
                </label>
              </div>

              <div className="wl-form-row wl-form-row-colors">
                <label>
                  Primary color
                  <input type="text" value={form.primary_color} onChange={e => setForm(f => ({ ...f, primary_color: e.target.value }))} placeholder="#0f2940" />
                </label>
                <label>
                  Secondary color
                  <input type="text" value={form.secondary_color} onChange={e => setForm(f => ({ ...f, secondary_color: e.target.value }))} placeholder="#0a5c4d" />
                </label>
                <label>
                  Accent color
                  <input type="text" value={form.accent_color} onChange={e => setForm(f => ({ ...f, accent_color: e.target.value }))} placeholder="#e6a817" />
                </label>
              </div>

              <label className="wl-form-label-block">
                Management mode
                <select value={form.management_mode} onChange={e => setForm(f => ({ ...f, management_mode: e.target.value }))}>
                  {Object.entries(MODE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </label>

              {form.management_mode === 'partner_managed' && (
                <label className="wl-form-label-block">
                  Partner name
                  <input type="text" value={form.partner_name} onChange={e => setForm(f => ({ ...f, partner_name: e.target.value }))} placeholder="Which enterprise partner runs this" />
                </label>
              )}

              <div className="wl-form-row">
                <label>
                  Contact name
                  <input type="text" value={form.contact_name} onChange={e => setForm(f => ({ ...f, contact_name: e.target.value }))} />
                </label>
                <label>
                  Contact email
                  <input type="email" value={form.contact_email} onChange={e => setForm(f => ({ ...f, contact_email: e.target.value }))} />
                </label>
              </div>

              <label className="wl-form-label-block">
                Enabled tools
                <div className="wl-tools-grid">
                  {catalog.map(t => (
                    <label key={t.key} className="wl-tool-checkbox">
                      <input
                        type="checkbox"
                        checked={form.enabled_tools.includes(t.key)}
                        onChange={() => toggleTool(t.key)}
                      />
                      {t.label}
                    </label>
                  ))}
                </div>
              </label>

              <label className="wl-form-label-block">
                Notes
                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} />
              </label>

              <button type="submit" className="btn-primary admin-submit" disabled={saving}>
                {saving ? <Loader2 size={16} className="spin" /> : null}
                {form.id ? 'Save changes' : 'Create tenant'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
