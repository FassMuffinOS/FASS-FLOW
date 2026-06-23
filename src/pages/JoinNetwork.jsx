import { useState } from 'react'
import { Network, CheckCircle, ArrowRight } from 'lucide-react'
import { supabase } from '../lib/supabase'
import './JoinNetwork.css'

// This is the actual moat, not a marketing page — every row this form
// writes is a real sub/supplier FASS Flow recruited directly, which is what
// lets a contractor logged into /network see "we are signing business up"
// instead of a static directory scraped from public award data.
const TRADE_CATEGORIES = [
  'Electrical', 'Concrete', 'HVAC', 'Roofing', 'Plumbing', 'Janitorial',
  'Generators & Power', 'Landscaping & Grounds', 'Security Services',
  'IT & Low Voltage', 'Trucking & Logistics', 'General Labor', 'Other',
]

export default function JoinNetwork() {
  const [form, setForm] = useState({
    company_name: '', trade_category: '', city: '', state: '',
    certifications: '', capacity_notes: '',
    contact_name: '', contact_email: '', contact_phone: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  function update(field, value) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.company_name.trim() || !form.trade_category || !form.contact_email.trim()) {
      setError('Company name, trade, and contact email are required.')
      return
    }
    setSubmitting(true)
    setError('')
    const { error: insertError } = await supabase.from('network_vendors').insert({
      company_name: form.company_name.trim(),
      trade_category: form.trade_category,
      city: form.city.trim() || null,
      state: form.state.trim() || null,
      certifications: form.certifications.trim() || null,
      capacity_notes: form.capacity_notes.trim() || null,
      contact_name: form.contact_name.trim() || null,
      contact_email: form.contact_email.trim(),
      contact_phone: form.contact_phone.trim() || null,
    })
    setSubmitting(false)
    if (insertError) setError(insertError.message)
    else setSubmitted(true)
  }

  if (submitted) {
    return (
      <div className="jn">
        <div className="container jn-done">
          <CheckCircle size={40} className="jn-done-icon" />
          <h1>You're in the network</h1>
          <p>
            {form.company_name} is now listed for {form.trade_category.toLowerCase()} work.
            Contractors using FASS Flow can find and reach out to you directly when they're
            building a team for a contract that needs your trade.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="jn">
      <section className="jn-hero">
        <div className="container jn-hero-inner">
          <Network size={28} className="jn-hero-icon" />
          <h1>Join the FASS Network</h1>
          <p>
            FASS Flow connects small-business government contractors with the subs, suppliers,
            and vendors they need to actually deliver a contract. Register your company once,
            for free — show up when a contractor in your trade and area is building a team.
          </p>
        </div>
      </section>

      <section className="jn-section">
        <div className="container">
          <form className="jn-form" onSubmit={handleSubmit}>
            <div className="jn-field">
              <label>Company name *</label>
              <input
                type="text"
                value={form.company_name}
                onChange={e => update('company_name', e.target.value)}
                placeholder="Acme Electric LLC"
              />
            </div>

            <div className="jn-field">
              <label>Trade / category *</label>
              <select value={form.trade_category} onChange={e => update('trade_category', e.target.value)}>
                <option value="">Select a trade…</option>
                {TRADE_CATEGORIES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            <div className="jn-row">
              <div className="jn-field">
                <label>City</label>
                <input type="text" value={form.city} onChange={e => update('city', e.target.value)} placeholder="Houston" />
              </div>
              <div className="jn-field">
                <label>State</label>
                <input type="text" value={form.state} onChange={e => update('state', e.target.value)} placeholder="TX" />
              </div>
            </div>

            <div className="jn-field">
              <label>Certifications / licenses</label>
              <input
                type="text"
                value={form.certifications}
                onChange={e => update('certifications', e.target.value)}
                placeholder="Master electrician license, bonded & insured, OSHA 30…"
              />
            </div>

            <div className="jn-field">
              <label>Capacity notes</label>
              <textarea
                rows={3}
                value={form.capacity_notes}
                onChange={e => update('capacity_notes', e.target.value)}
                placeholder="Crew size, typical project size, current availability…"
              />
            </div>

            <div className="jn-row">
              <div className="jn-field">
                <label>Contact name</label>
                <input type="text" value={form.contact_name} onChange={e => update('contact_name', e.target.value)} />
              </div>
              <div className="jn-field">
                <label>Contact phone</label>
                <input type="tel" value={form.contact_phone} onChange={e => update('contact_phone', e.target.value)} />
              </div>
            </div>

            <div className="jn-field">
              <label>Contact email *</label>
              <input
                type="email"
                value={form.contact_email}
                onChange={e => update('contact_email', e.target.value)}
                placeholder="you@company.com"
              />
            </div>

            {error && <p className="jn-error">{error}</p>}

            <button type="submit" className="btn-primary jn-submit" disabled={submitting}>
              {submitting ? 'Submitting…' : 'Join the network'} <ArrowRight size={15} />
            </button>
          </form>
        </div>
      </section>
    </div>
  )
}
