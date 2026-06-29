// ── Proposal assembler ─────────────────────────────────────
// Turns a parsed solicitation + its compliance outline (see
// solicitationParser.js: parseSolicitation / buildOutline) into a single
// structured, renderable proposal document: ordered volumes + sections, an
// auto table of contents, and per-section review flags.
//
// Phase 1 generates DETERMINISTIC scaffolding with review placeholders — the
// spans a human has to tailor are wrapped in <mark> so the editor can
// highlight them and count "what still needs review." Phase 2.5 swaps the
// placeholders for live draftSection() output; the shape here stays the same.

const REVIEW = '<mark class="rv">'  // opens a needs-review highlight
const ENDM = '</mark>'

// Per-section body scaffolds. Each returns HTML; anything wrapped in <mark>
// is a review span the user must confirm/replace.
function bodyFor(label) {
  const l = label.toLowerCase()

  if (l.includes('cover') || l.includes('transmittal')) {
    return `<p>${REVIEW}[Company letterhead]${ENDM} respectfully submits the following
      proposal in response to this solicitation. We have reviewed all requirements
      in Sections L and M and confirm full compliance.</p>
      <p>${REVIEW}[Name, title, and signature of authorized representative]${ENDM}</p>`
  }
  if (l.includes('technical')) {
    return `<p>Our technical approach is organized to directly address each requirement
      of the Performance Work Statement.</p>
      <p>${REVIEW}[Describe your specific technical methodology, staffing, equipment,
      and how you will meet each PWS task. Tie every claim to a measurable outcome.]${ENDM}</p>`
  }
  if (l.includes('management')) {
    return `<p>Our management approach ensures accountability, on-time delivery, and clear
      lines of communication with the Contracting Officer.</p>
      <p>${REVIEW}[Describe your org structure, key personnel, quality control process,
      and how you manage risk and schedule.]${ENDM}</p>`
  }
  if (l.includes('past performance')) {
    return `<p>The following references demonstrate relevant, recent, and successful
      performance on comparable efforts.</p>
      <p>${REVIEW}[Insert at least three past-performance references: contract name,
      agency, value, period of performance, and a CPARS/contact for each.]${ENDM}</p>`
  }
  if (l.includes('price') || l.includes('cost')) {
    return `<p>Our pricing is fair, reasonable, and fully burdened in accordance with the
      solicitation's pricing schedule.</p>
      <p>${REVIEW}[Complete the pricing schedule — line items, quantities, unit prices,
      and any options. Confirm totals against the Government's CLIN structure.]${ENDM}</p>`
  }
  if (l.includes('staffing')) {
    return `<p>${REVIEW}[Provide a staffing plan: labor categories, FTEs, key personnel,
      and how you will fully staff at start of performance.]${ENDM}</p>`
  }
  if (l.includes('quality')) {
    return `<p>${REVIEW}[Summarize your Quality Control Plan: inspection methods,
      corrective-action process, and reporting cadence.]${ENDM}</p>`
  }
  // Required documents (Reps & Certs, Insurance, SAM, etc.)
  return `<p>${REVIEW}[Attach the required document: ${label}. Confirm it is current,
    signed where applicable, and matches the entity named in your SAM.gov registration.]${ENDM}</p>`
}

// Rough page estimate so per-volume page-limit warnings have something to
// compare against. ~500 words/page; strip tags first.
function estimatePages(html) {
  const words = html.replace(/<[^>]+>/g, ' ').trim().split(/\s+/).filter(Boolean).length
  return Math.max(1, Math.round(words / 500))
}

// parsed: output of parseSolicitation()
// outline: output of buildOutline(parsed)
// opts: { title, drafts? } — drafts maps sectionId -> html (Phase 2.5, live AI)
export function assembleProposal(parsed, outline, opts = {}) {
  const drafts = opts.drafts || {}
  const sections = []
  let order = 0

  const volumeItems = outline.filter(i => i.type === 'volume')
  const docItems = outline.filter(i => i.type === 'document')
  const sectionItems = outline.filter(i => i.type === 'section')

  // Volumes first (each is a top-level heading with a narrative body), then
  // any plain sections, then required documents grouped at the end.
  const narrativeItems = volumeItems.length ? volumeItems : sectionItems

  narrativeItems.forEach(item => {
    const html = drafts[item.id] || bodyFor(item.label)
    sections.push({
      id: item.id,
      heading: item.label,
      level: 2,
      html,
      source: drafts[item.id] ? 'ai' : 'placeholder',
      reviewStatus: 'needs_review',
      pageLimit: item.pageLimit || null,
      pageEstimate: estimatePages(html),
      order: order++,
    })
  })

  if (docItems.length) {
    docItems.forEach(item => {
      const html = drafts[item.id] || bodyFor(item.label)
      sections.push({
        id: item.id,
        heading: item.label,
        level: 2,
        html,
        source: drafts[item.id] ? 'ai' : 'placeholder',
        reviewStatus: 'needs_review',
        pageLimit: null,
        pageEstimate: estimatePages(html),
        order: order++,
        group: 'Required documents',
      })
    })
  }

  const toc = sections.map(s => ({ id: s.id, label: s.heading, group: s.group || null }))

  return {
    title: opts.title || 'Untitled Proposal',
    format: {
      font: parsed.format?.font || null,
      fontSize: parsed.format?.fontSize || null,
      margin: parsed.format?.margin || null,
      spacing: parsed.format?.spacing || null,
      pageLimit: parsed.pageLimit || null,
    },
    dueDate: parsed.dueDate || null,
    sections,
    toc,
  }
}

// Build the single HTML string TipTap renders from an assembled doc. Each
// section gets a heading carrying a data-sec id so the TOC and review rail
// can scroll to / target it.
export function assembledToHtml(doc) {
  return doc.sections
    .map(s => `<h2 data-sec="${s.id}">${s.heading}</h2>${s.html}`)
    .join('\n')
}
