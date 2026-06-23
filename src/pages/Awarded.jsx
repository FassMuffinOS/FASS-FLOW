import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { supabase } from '../lib/supabase'
import {
  ArrowLeft, Sun, Moon, RefreshCw, Trophy,
  ExternalLink, Calendar, Building2, ArrowRight
} from 'lucide-react'
import './Awarded.css'

function formatDate(str) {
  if (!str) return '—'
  return new Date(str).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatMoney(v) {
  if (v == null || v === '' || isNaN(Number(v))) return null
  return Number(v).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
}

export default function Awarded() {
  const { session, signOut } = useAuth()
  const { theme, toggle: toggleTheme } = useTheme()
  const navigate = useNavigate()

  const [records, setRecords] = useState([])
  const [awardDates, setAwardDates] = useState({}) // proposal_id -> ISO date won
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('proposals')
      .select('*')
      .eq('user_id', session.user.id)
      .eq('stage', 'awarded')
      .order('updated_at', { ascending: false })

    const awarded = data || []
    setRecords(awarded)

    // Best-effort: find when each was moved to "awarded" from the audit log.
    if (awarded.length) {
      const { data: events } = await supabase
        .from('proposal_events')
        .select('proposal_id, created_at, new_value, event_type')
        .in('proposal_id', awarded.map(r => r.id))
        .eq('event_type', 'stage_change')
        .eq('new_value', 'awarded')
        .order('created_at', { ascending: false })
      const map = {}
      for (const ev of events || []) {
        if (!map[ev.proposal_id]) map[ev.proposal_id] = ev.created_at
      }
      setAwardDates(map)
    }
    setLoading(false)
  }

  const totalValue = records.reduce((acc, r) => acc + (Number(r.estimated_value) || 0), 0)
  const isDark = theme === 'dark'

  return (
    <div className="aw">
      <header className="aw-header">
        <div className="aw-header-inner">
          <button className="aw-back" onClick={() => navigate('/pipeline')}>
            <ArrowLeft size={15} /> Pipeline
          </button>
          <div className="aw-header-center">
            <Trophy size={16} className="aw-logo-icon" />
            <span className="aw-logo-text">FASS <strong>Awarded</strong></span>
          </div>
          <div className="aw-header-right">
            <button className="aw-icon-btn" onClick={toggleTheme} title={isDark ? 'Light mode' : 'Dark mode'}>
              {isDark ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <button className="aw-icon-btn" onClick={load} title="Refresh">
              <RefreshCw size={15} className={loading ? 'spin' : ''} />
            </button>
            <button className="aw-signout" onClick={() => { signOut(); navigate('/') }}>Sign out</button>
          </div>
        </div>
      </header>

      <div className="aw-content">
        {/* Summary band */}
        <div className="aw-summary">
          <div className="aw-summary-card">
            <span className="aw-summary-label">Contracts won</span>
            <span className="aw-summary-value">{records.length}</span>
          </div>
          <div className="aw-summary-card aw-summary-money">
            <span className="aw-summary-label">Total awarded value</span>
            <span className="aw-summary-value">{formatMoney(totalValue) || '$0'}</span>
          </div>
          <div className="aw-summary-card">
            <span className="aw-summary-label">Ready to execute</span>
            <span className="aw-summary-value">
              {records.length}
              <button className="aw-witness-link" onClick={() => navigate('/witness')}>
                Open WITNESS <ArrowRight size={13} />
              </button>
            </span>
          </div>
        </div>

        {loading ? (
          <div className="aw-loading"><RefreshCw size={20} className="spin" /><span>Loading awarded contracts…</span></div>
        ) : records.length === 0 ? (
          <div className="aw-empty">
            <Trophy size={32} className="aw-empty-icon" />
            <p className="aw-empty-title">No awarded contracts yet.</p>
            <p>When you move a bid to the <strong>Awarded</strong> stage in Pipeline, it shows up here with its value and a path into WITNESS to execute the work.</p>
            <button className="btn-primary" style={{ marginTop: 18 }} onClick={() => navigate('/pipeline')}>
              Back to Pipeline →
            </button>
          </div>
        ) : (
          <div className="aw-grid">
            {records.map(r => (
              <div key={r.id} className="aw-card">
                <div className="aw-card-top">
                  <Trophy size={15} className="aw-card-trophy" />
                  {formatMoney(r.estimated_value) && (
                    <span className="aw-card-value">{formatMoney(r.estimated_value)}</span>
                  )}
                </div>
                <h3 className="aw-card-title">{r.title}</h3>
                <div className="aw-card-meta">
                  {r.agency && <span className="aw-card-agency"><Building2 size={12} /> {r.agency}</span>}
                  <span className="aw-card-won"><Calendar size={12} /> Won {formatDate(awardDates[r.id] || r.updated_at)}</span>
                </div>
                <div className="aw-card-actions">
                  <button className="aw-card-btn aw-card-btn-primary" onClick={() => navigate('/witness')}>
                    Execute in WITNESS <ArrowRight size={13} />
                  </button>
                  <a
                    className="aw-card-btn"
                    href={`/money?proposalId=${r.id}`}
                    onClick={e => e.stopPropagation()}
                  >
                    Run the numbers <ExternalLink size={12} />
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
