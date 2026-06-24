import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Camera } from 'lucide-react'
import './JobCaptures.css'

// Shared field-captures strip — drop into any view that has a proposal_id
// (Pipeline record, Witness, Foreman, Restoration). Renders nothing when a
// job has no captures, so it never clutters an empty record.
export default function JobCaptures({ proposalId, title = 'Site captures' }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!proposalId) { setItems([]); setLoading(false); return }
    let cancelled = false
    supabase
      .from('site_captures')
      .select('*')
      .eq('proposal_id', proposalId)
      .order('created_at', { ascending: false })
      .then(({ data }) => { if (!cancelled) { setItems(data || []); setLoading(false) } })
    return () => { cancelled = true }
  }, [proposalId])

  if (loading || items.length === 0) return null

  return (
    <div className="jc">
      <p className="jc-label"><Camera size={13} /> {title} · {items.length}</p>
      <div className="jc-grid">
        {items.map(c => (
          <a
            className="jc-item"
            key={c.id}
            href={c.media_url}
            target="_blank"
            rel="noreferrer"
            title={c.note || ''}
          >
            <img src={c.media_url} alt={c.area || 'capture'} />
            {c.area && <span className="jc-area">{c.area}</span>}
          </a>
        ))}
      </div>
    </div>
  )
}
