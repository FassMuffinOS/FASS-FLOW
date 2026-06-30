import { useNavigate } from 'react-router-dom'
import {
  Sparkles, FileText, ArrowRight, Trash2, HardHat, Cpu, Users, Leaf, ShieldCheck, Building2,
} from 'lucide-react'
import { INDUSTRIES, buildTemplateDoc } from '../lib/proposalTemplates'
import useSeo from '../hooks/useSeo'
import './Templates.css'

const ICON = {
  janitorial: Trash2, construction: HardHat, it: Cpu, staffing: Users, grounds: Leaf, security: ShieldCheck,
}

// Industry proposal template gallery. Pick one → land in the Proposal Editor
// pre-loaded with a professional skeleton for that trade, ready to AI-draft.
export default function Templates() {
  useSeo({ title: 'Proposal Templates', description: 'Start from a winning proposal structure for your industry.', path: '/templates' })
  const navigate = useNavigate()

  function useTemplate(id) {
    navigate('/proposal-editor', { state: { template: buildTemplateDoc(id), proposalId: `template-${id}` } })
  }

  return (
    <div className="tpl fx-wrap">
      <header className="tpl-hero">
        <span className="fx-eyebrow">Proposal templates</span>
        <h1>Start from a winning structure</h1>
        <p>Every template is the volume layout agencies expect — cover letter, technical &amp; management approach, past performance, quality control, pricing. Pick your industry, then let the AI draft each section from your past performance.</p>
      </header>

      <div className="fx-grid tpl-grid">
        {INDUSTRIES.map(ind => {
          const Icon = ICON[ind.id] || Building2
          return (
            <button key={ind.id} className="fx-card fx-card-link tpl-card" onClick={() => useTemplate(ind.id)}>
              <span className="fx-icon"><Icon size={22} /></span>
              <span className="tpl-card-body">
                <span className="tpl-card-title">{ind.name}</span>
                <span className="tpl-card-tag">{ind.tagline}</span>
                <span className="tpl-card-use"><FileText size={13} /> Use this template <ArrowRight size={14} /></span>
              </span>
            </button>
          )
        })}
      </div>

      <div className="tpl-note">
        <Sparkles size={15} />
        <p>Templates give you the professional skeleton free. Drafting each section with AI from your past performance uses 1 credit per section — new accounts start with a free allotment.</p>
      </div>
    </div>
  )
}
