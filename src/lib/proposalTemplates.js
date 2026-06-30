// ── Industry proposal templates ────────────────────────────
// A master "winning proposal" schema (the volume structure agencies expect),
// cloned per industry with a tailored Technical Approach + an industry-
// specific section. The user picks their industry, lands in the Proposal
// Editor pre-loaded with a professional skeleton, then AI-drafts the
// highlighted spans (each draft costs a credit — that's the monetization loop).
//
// Sections match the shape assembleProposal() produces, so the editor renders
// a template doc with zero special-casing beyond "skip the parse step."

const RV = '<mark class="rv">'
const ENDM = '</mark>'

function pages(html) {
  const words = html.replace(/<[^>]+>/g, ' ').trim().split(/\s+/).filter(Boolean).length
  return Math.max(1, Math.round(words / 500))
}

// Sections common to every industry (the master spine).
function spine(industryNoun) {
  return [
    {
      key: 'cover', heading: 'Cover Letter / Transmittal',
      html: `<p>${RV}[Company letterhead]${ENDM} is pleased to submit this proposal in response to your solicitation for ${industryNoun}. We have reviewed all requirements and confirm full compliance with the terms, conditions, and submission instructions.</p><p>${RV}[Authorized representative name, title, signature, and date]${ENDM}</p>`,
    },
    {
      key: 'exec', heading: 'Executive Summary',
      html: `<p>${RV}[2–3 sentences: who you are, why you're the right ${industryNoun} provider for this specific customer, and the single most important reason to select you.]${ENDM}</p>`,
    },
    { key: 'tech', heading: 'Technical Approach', html: null }, // filled per-industry
    {
      key: 'mgmt', heading: 'Management Approach',
      html: `<p>Our management approach ensures accountability, on-time performance, and a single clear line of communication with the Contracting Officer.</p><p>${RV}[Describe your org structure, the project manager and their authority, your communication/reporting cadence, and how you manage schedule and risk.]${ENDM}</p>`,
    },
    {
      key: 'staffing', heading: 'Staffing & Key Personnel',
      html: `<p>We will fully staff this effort at the start of performance with qualified, vetted personnel.</p><p>${RV}[List labor categories, headcount, key personnel and their relevant qualifications, and your plan to recruit/retain and cover absences.]${ENDM}</p>`,
    },
    {
      key: 'past', heading: 'Past Performance',
      html: `<p>The following references demonstrate relevant, recent, and successful performance on comparable efforts.</p><p>${RV}[Insert at least three references: contract name, agency/client, value, period of performance, scope, and a CPARS rating or point of contact for each.]${ENDM}</p>`,
    },
    { key: 'qc', heading: 'Quality Control Plan', html: null }, // tailored per-industry
    {
      key: 'price', heading: 'Price / Cost Proposal',
      html: `<p>Our pricing is fair, reasonable, and fully burdened in accordance with the solicitation's pricing schedule.</p><p>${RV}[Complete the pricing schedule — line items, quantities, unit prices, options. Confirm totals against the Government's CLIN structure.]${ENDM}</p>`,
    },
    {
      key: 'reps', heading: 'Representations & Certifications',
      html: `<p>${RV}[Attach current Reps & Certs from your SAM.gov registration, and any solicitation-specific certifications. Confirm they match the entity submitting this proposal.]${ENDM}</p>`,
    },
  ]
}

// Per-industry: tailored Technical Approach + Quality Control + one extra
// section unique to the trade.
export const INDUSTRIES = [
  {
    id: 'janitorial', name: 'Janitorial & Custodial', tagline: 'Facility cleaning, custodial, sanitation',
    tech: `<p>Our technical approach delivers consistent, inspection-ready cleanliness across all spaces in scope.</p><p>${RV}[Describe your cleaning methodology by area type (restrooms, offices, common areas), frequencies, equipment and green-certified products, and how you'll meet the Performance Work Statement's standards.]${ENDM}</p>`,
    qc: `<p>Our Quality Control Plan keeps performance above the contract's acceptable quality levels.</p><p>${RV}[Describe inspection schedules, the customer-complaint and corrective-action process, and how results are documented and reported.]${ENDM}</p>`,
    extra: { heading: 'Cleaning Standards & Green Practices', html: `<p>${RV}[Detail the standards you follow (CIMS, GS-42 green cleaning), products and certifications, and any sustainability commitments relevant to this customer.]${ENDM}</p>` },
  },
  {
    id: 'construction', name: 'Construction & Renovation', tagline: 'GC, renovation, build-out, repair',
    tech: `<p>Our technical approach sequences the work to deliver on schedule, on budget, and to specification.</p><p>${RV}[Describe your construction methodology, phasing/sequencing, subcontractor management, materials and submittals, and how you'll meet the drawings and specifications.]${ENDM}</p>`,
    qc: `<p>Our Quality Control Plan enforces conformance to drawings, specs, and code at every phase.</p><p>${RV}[Describe your three-phase QC (preparatory, initial, follow-up), inspections, submittal review, and deficiency tracking.]${ENDM}</p>`,
    extra: { heading: 'Safety Plan (EM 385 / OSHA)', html: `<p>${RV}[Detail your site safety program, the Site Safety & Health Officer, hazard analyses, and your EMR/safety record. Government construction is scored heavily on safety.]${ENDM}</p>` },
  },
  {
    id: 'it', name: 'IT & Technology Services', tagline: 'IT support, software, managed services, cyber',
    tech: `<p>Our technical approach delivers secure, reliable technology services aligned to the customer's mission and compliance posture.</p><p>${RV}[Describe your solution architecture, service delivery model, SLAs, tooling, and how you meet the SOW's technical and security requirements.]${ENDM}</p>`,
    qc: `<p>Our Quality Control Plan ensures service levels, security controls, and deliverable quality are met and measured.</p><p>${RV}[Describe SLA monitoring, change management, deliverable review, and continuous improvement.]${ENDM}</p>`,
    extra: { heading: 'Security & Compliance', html: `<p>${RV}[Detail relevant frameworks (NIST 800-171, CMMC, FedRAMP, FISMA), your authorization status, and how you'll protect government data.]${ENDM}</p>` },
  },
  {
    id: 'staffing', name: 'Staffing & Professional Services', tagline: 'Admin, technical & professional staffing',
    tech: `<p>Our technical approach provides qualified, cleared, mission-ready personnel with fast fill and low turnover.</p><p>${RV}[Describe your recruiting pipeline, screening/vetting, clearance handling, onboarding, and how you ensure candidates meet each labor category's requirements.]${ENDM}</p>`,
    qc: `<p>Our Quality Control Plan ensures placement quality, performance, and continuity.</p><p>${RV}[Describe performance reviews, replacement guarantees, time/attendance accuracy, and the customer feedback loop.]${ENDM}</p>`,
    extra: { heading: 'Recruiting & Retention', html: `<p>${RV}[Detail sourcing channels, time-to-fill metrics, retention rate, and your bench/surge capacity.]${ENDM}</p>` },
  },
  {
    id: 'grounds', name: 'Landscaping & Grounds', tagline: 'Grounds maintenance, landscaping, snow',
    tech: `<p>Our technical approach keeps grounds safe, healthy, and presentable year-round.</p><p>${RV}[Describe mowing/turf, seasonal services, irrigation, snow & ice response, equipment, and how you meet the PWS frequencies and standards.]${ENDM}</p>`,
    qc: `<p>Our Quality Control Plan maintains appearance and safety standards across all areas.</p><p>${RV}[Describe inspection routes, seasonal checklists, and corrective-action turnaround.]${ENDM}</p>`,
    extra: { heading: 'Equipment & Seasonal Readiness', html: `<p>${RV}[Detail your equipment fleet, snow/ice response time and call-out plan, and seasonal staffing.]${ENDM}</p>` },
  },
  {
    id: 'security', name: 'Security & Guard Services', tagline: 'Armed/unarmed guards, access control',
    tech: `<p>Our technical approach provides trained, licensed officers and reliable coverage at every post.</p><p>${RV}[Describe post coverage, officer licensing/training, supervision, incident response, and how you meet the PWS post orders and response times.]${ENDM}</p>`,
    qc: `<p>Our Quality Control Plan ensures post compliance, officer readiness, and incident handling.</p><p>${RV}[Describe post inspections, officer certification tracking, and incident reporting/review.]${ENDM}</p>`,
    extra: { heading: 'Post Orders & Officer Training', html: `<p>${RV}[Detail licensing/certifications, training hours and curriculum, and how you maintain coverage during call-offs.]${ENDM}</p>` },
  },
]

export function industryById(id) {
  return INDUSTRIES.find(i => i.id === id) || INDUSTRIES[0]
}

// Build a full editor doc from an industry template.
export function buildTemplateDoc(industryId) {
  const ind = industryById(industryId)
  const base = spine(ind.name.toLowerCase())

  // Fill the per-industry sections + insert the extra section after QC.
  const sections = []
  let order = 0
  for (const s of base) {
    let html = s.html
    if (s.key === 'tech') html = ind.tech
    if (s.key === 'qc') html = ind.qc
    sections.push({
      id: `tpl-${s.key}`,
      heading: s.heading,
      level: 2,
      html,
      source: 'template',
      reviewStatus: 'needs_review',
      pageLimit: null,
      pageEstimate: pages(html),
      order: order++,
    })
    if (s.key === 'qc' && ind.extra) {
      sections.push({
        id: 'tpl-extra',
        heading: ind.extra.heading,
        level: 2,
        html: ind.extra.html,
        source: 'template',
        reviewStatus: 'needs_review',
        pageLimit: null,
        pageEstimate: pages(ind.extra.html),
        order: order++,
      })
    }
  }

  return {
    title: `${ind.name} — Proposal`,
    format: { font: 'Times New Roman', fontSize: '12-point', margin: '1-inch margins', spacing: 'single-spaced', pageLimit: null },
    dueDate: null,
    sections,
    toc: sections.map(s => ({ id: s.id, label: s.heading, group: null })),
    industryId: ind.id,
  }
}
