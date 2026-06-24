import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import {
  Plus, Trash2, Check, ArrowLeft, Link2, Send, Layers, ListChecks,
} from 'lucide-react'
import { defaultSelections, computeTotal, money } from '../lib/estimateTotal'
import './ClientProposals.css'

const uid = () => Math.random().toString(36).slice(2, 9)
const KINDS = [
  { id: 'choice', label: 'Pick one (material/option)' },
  { id: 'tier', label: 'Good / Better / Best' },
  { id: 'addons', label: 'Optional add-ons' },
]

function blankForm() {
  return { title: '', company_name: '', intro: '', base_total: '', sections: [] }
}

export default function ClientProposals() {
  const { session } = useAuth()
  const userId = session?.user?.id
  const [list, setList] = useState([])
  const [editing, setEditing] = useState(null) // null = list view; object = editor
  const [form, setForm] = useState(blankForm())
  const [saving, setSaving] = useState(false)
  const [copied, setCopied] = useState('')

  useEffect(() => { if (userId) load() }, [userId]) // eslint-disable-line

  async function load() {
    const { data } = await supabase
      .from('client_estimates')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    setList(data || [])
  }

  function startNew() { setForm(blankForm()); setEditing('new') }
  function startEdit(p) {
    setForm({ id: p.id, title: p.title, company_name: p.company_name || '', intro: p.intro || '', base_total: p.base_total ?? '', sections: p.sections || [] })
    setEditing(p)
  }

  // ── section + option editing ──
  function addSection(kind) {
    setForm(f => ({ ...f, sections: [...f.sections, { id: uid(), kind, label: '', sublabel: '', options: [{ id: uid(), name: '', delta: 0 }] }] }))
  }
  function updateSection(sid, patch) {
    setForm(f => ({ ...f, sections: f.sections.map(s => s.id === sid ? { ...s, ...patch } : s) }))
  }
  function removeSection(sid) {
    setForm(f => ({ ...f, sections: f.sections.filter(s => s.id !== sid) }))
  }
  function addOption(sid) {
    setForm(f => ({ ...f, sections: f.sections.map(s => s.id === sid ? { ...s, options: [...s.options, { id: uid(), name: '', delta: 0 }] } : s) }))
  }
  function updateOption(sid, oid, patch) {
    setForm(f => ({ ...f, sections: f.sections.map(s => s.id === sid ? { ...s, options: s.options.map(o => o.id === oid ? { ...o, ...patch } : o) } : s) }))
  }
  function removeOption(sid, oid) {
    setForm(f => ({ ...f, sections: f.sections.map(s => s.id === sid ? { ...s, options: s.options.filter(o => o.id !== oid) } : s) }))
  }

  async function save() {
    if (!form.title.trim()) return
    setSaving(true)
    const payload = {
      user_id: userId,
      title: form.title.trim(),
      company_name: form.company_name.trim() || null,
      intro: form.intro.trim() || null,
      base_total: Number(form.base_total) || 0,
      sections: form.sections,
      selections: defaultSelections(form.sections),
    }
    if (form.id) {
      await supabase.from('client_estimates').update(payload).eq('id', form.id)
    } else {
      await supabase.from('client_estimates').insert({ ...payload, status: 'draft' })
    }
    setSaving(false)
    setEditing(null)
    load()
  }

  function shareUrl(token) { return `${window.location.origin}/e/${token}` }
  function copyLink(token) {
    navigator.clipboard?.writeText(shareUrl(token))
    setCopied(token)
    setTimeout(() => setCopied(''), 1600)
  }

  const previewTotal = computeTotal(form.base_total, form.sections, defaultSelections(form.sections))

  // ── editor view ──
  if (editing) {
    return (
      <div className="cp">
        <div className="cp-head">
          <button className="cp-back" onClick={() => setEditing(null)}><ArrowLeft size={15} /> Proposals</button>
          <h1 className="cp-title">{form.id ? 'Edit proposal' : 'New client proposal'}</h1>
          <button className="cp-save" onClick={save} disabled={saving || !form.title.trim()}>{saving ? 'Saving…' : 'Save'}</button>
        </div>

        <div className="cp-body">
          <div className="cp-card">
            <input className="cp-input cp-title-input" placeholder="Proposal title (e.g. Kitchen remodel — 320 sq ft)" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
            <div className="cp-row2">
              <input className="cp-input" placeholder="Your company name" value={form.company_name} onChange={e => setForm(f => ({ ...f, company_name: e.target.value }))} />
              <input className="cp-input" type="number" placeholder="Base price (included)" value={form.base_total} onChange={e => setForm(f => ({ ...f, base_total: e.target.value }))} />
            </div>
            <textarea className="cp-input cp-intro" placeholder="Intro / note to the customer (optional)" value={form.intro} onChange={e => setForm(f => ({ ...f, intro: e.target.value }))} />
          </div>

          {form.sections.map(sec => (
            <div className="cp-card cp-section" key={sec.id}>
              <div className="cp-section-head">
                <span className="cp-kind-badge">{KINDS.find(k => k.id === sec.kind)?.label || sec.kind}</span>
                <button className="cp-icon-btn" onClick={() => removeSection(sec.id)}><Trash2 size={15} /></button>
              </div>
              <input className="cp-input" placeholder="Section label (e.g. Countertop material)" value={sec.label} onChange={e => updateSection(sec.id, { label: e.target.value })} />
              <div className="cp-options">
                {sec.options.map(o => (
                  <div className="cp-option-row" key={o.id}>
                    <input className="cp-input cp-opt-name" placeholder="Option name" value={o.name} onChange={e => updateOption(sec.id, o.id, { name: e.target.value })} />
                    {sec.kind === 'tier' && (
                      <input className="cp-input cp-opt-badge" placeholder="GOOD" value={o.badge || ''} onChange={e => updateOption(sec.id, o.id, { badge: e.target.value })} />
                    )}
                    <input className="cp-input cp-opt-delta" type="number" placeholder="+$" value={o.delta} onChange={e => updateOption(sec.id, o.id, { delta: Number(e.target.value) || 0 })} />
                    <label className="cp-default" title="Selected by default">
                      <input type="checkbox" checked={!!o.default} onChange={e => updateOption(sec.id, o.id, { default: e.target.checked })} /> def
                    </label>
                    <button className="cp-icon-btn" onClick={() => removeOption(sec.id, o.id)}><Trash2 size={13} /></button>
                  </div>
                ))}
              </div>
              <button className="cp-add-opt" onClick={() => addOption(sec.id)}><Plus size={13} /> Add option</button>
            </div>
          ))}

          <div className="cp-add-section">
            <span><Layers size={14} /> Add a section</span>
            {KINDS.map(k => (
              <button key={k.id} className="cp-add-kind" onClick={() => addSection(k.id)}><Plus size={12} /> {k.label}</button>
            ))}
          </div>

          <div className="cp-preview">Starting total (defaults): <strong>{money(previewTotal)}</strong></div>
        </div>
      </div>
    )
  }

  // ── list view ──
  return (
    <div className="cp">
      <div className="cp-head">
        <div>
          <h1 className="cp-title"><Send size={20} /> Client proposals</h1>
          <p className="cp-sub">Send an interactive estimate — the customer picks options and approves, the total updates live.</p>
        </div>
        <button className="cp-save" onClick={startNew}><Plus size={15} /> New proposal</button>
      </div>

      <div className="cp-body">
        {list.length === 0 ? (
          <div className="cp-empty">
            <ListChecks size={26} />
            <p>No proposals yet. Build one and share a link your customer can select on.</p>
            <button className="cp-save" onClick={startNew}><Plus size={15} /> New proposal</button>
          </div>
        ) : list.map(p => {
          const total = computeTotal(p.base_total, p.sections, p.selections && Object.keys(p.selections).length ? p.selections : defaultSelections(p.sections))
          return (
            <div className="cp-card cp-list-item" key={p.id}>
              <div className="cp-list-main">
                <div className="cp-list-top">
                  <span className="cp-list-title">{p.title}</span>
                  <span className={`cp-status cp-status-${p.status}`}>{p.status}</span>
                </div>
                <p className="cp-list-meta">{(p.sections || []).length} sections · current total {money(total)}</p>
              </div>
              <div className="cp-list-actions">
                <button className="cp-link-btn" onClick={() => copyLink(p.share_token)}>
                  {copied === p.share_token ? <><Check size={14} /> Copied</> : <><Link2 size={14} /> Copy link</>}
                </button>
                <button className="cp-edit-btn" onClick={() => startEdit(p)}>Edit</button>
                <a className="cp-edit-btn" href={shareUrl(p.share_token)} target="_blank" rel="noreferrer">Preview</a>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
