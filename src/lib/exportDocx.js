// ── .docx export (agency-grade) ────────────────────────────
// Generates a polished Word document client-side: a branded cover page, an
// auto table of contents, a running header, page-number footer, and
// numbered, brand-colored section headings — applying the format rules
// parseSolicitation() pulled out of the solicitation (font, point size,
// margins, line spacing). Government portals reject on format, so honoring
// it exactly is the point.
import {
  Document, Packer, Paragraph, TextRun, HeadingLevel, LineRuleType,
  AlignmentType, Header, Footer, PageNumber, BorderStyle, TableOfContents,
} from 'docx'

const NAVY = '1B2A4A'
const TEAL = '1D9E75'
const GRAY = '6B7280'

function fontSizeHalfPts(format) {
  const n = parseInt(format?.fontSize || '', 10)
  return Number.isFinite(n) && n > 0 ? n * 2 : 24 // half-points; default 12pt
}
function marginTwips(format) {
  const m = /(\d+(?:\.\d+)?)/.exec(format?.margin || '')
  const inches = m ? parseFloat(m[1]) : 1
  return Math.round((inches || 1) * 1440) // 1 inch = 1440 twips
}
function lineSpacing(format) {
  const s = (format?.spacing || '').toLowerCase()
  if (s.includes('double')) return 480
  if (s.includes('1.5')) return 360
  return 240
}

function runsFromNode(node, font, size) {
  const out = []
  ;(node.content || []).forEach(child => {
    if (child.type === 'text') {
      const marks = child.marks || []
      out.push(new TextRun({
        text: child.text || '',
        bold: marks.some(m => m.type === 'bold'),
        italics: marks.some(m => m.type === 'italic'),
        font, size,
      }))
    }
  })
  if (!out.length) out.push(new TextRun({ text: '', font, size }))
  return out
}

// json: editor.getJSON() · doc: assembleProposal()/template output · opts: { companyName }
export async function buildDocxBlob(json, doc, opts = {}) {
  const fmt = doc?.format || {}
  const font = fmt.font || 'Times New Roman'
  const size = fontSizeHalfPts(fmt)
  const line = lineSpacing(fmt)
  const margin = marginTwips(fmt)
  const company = (opts.companyName || '').trim()
  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })

  // ── Cover page (its own section, no header/footer) ──
  const cover = [
    new Paragraph({ spacing: { before: 2200 } }),
    new Paragraph({
      border: { bottom: { style: BorderStyle.SINGLE, size: 18, color: TEAL, space: 10 } },
      spacing: { after: 360 },
      children: [new TextRun({ text: company || 'Proposal Submission', bold: true, color: NAVY, size: 26, font })],
    }),
    new Paragraph({
      spacing: { after: 160 },
      children: [new TextRun({ text: doc?.title || 'Proposal', bold: true, color: NAVY, size: 52, font })],
    }),
    new Paragraph({
      spacing: { after: 600 },
      children: [new TextRun({ text: 'Proposal in response to solicitation', color: TEAL, bold: true, size: 24, font })],
    }),
    new Paragraph({ children: [new TextRun({ text: `Prepared by: ${company || '[Company name]'}`, color: GRAY, size: 22, font })] }),
    new Paragraph({ children: [new TextRun({ text: `Date: ${today}`, color: GRAY, size: 22, font })] }),
    ...(doc?.dueDate ? [new Paragraph({ children: [new TextRun({ text: `Proposal due: ${doc.dueDate}`, color: GRAY, size: 22, font })] })] : []),
  ]

  // ── Body: TOC + numbered sections ──
  const body = [
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      spacing: { after: 160 },
      children: [new TextRun({ text: 'Table of Contents', bold: true, color: NAVY, size: size + 8, font })],
    }),
    new TableOfContents('Table of Contents', { hyperlink: true, headingStyleRange: '1-2' }),
    new Paragraph({ pageBreakBefore: true }),
  ]

  let headingNum = 0
  ;(json.content || []).forEach(node => {
    if (node.type === 'heading') {
      headingNum += 1
      const text = (node.content || []).map(c => c.text || '').join('')
      body.push(new Paragraph({
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 320, after: 120 },
        border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: 'E5E7EB', space: 6 } },
        children: [new TextRun({ text: `${headingNum}.  ${text}`, bold: true, color: NAVY, size: size + 6, font })],
      }))
    } else if (node.type === 'paragraph') {
      body.push(new Paragraph({
        spacing: { line, lineRule: LineRuleType.AUTO, after: 140 },
        children: runsFromNode(node, font, size),
      }))
    } else if (node.type === 'bulletList' || node.type === 'orderedList') {
      ;(node.content || []).forEach(li => {
        const para = (li.content || []).find(c => c.type === 'paragraph') || li
        body.push(new Paragraph({
          bullet: { level: 0 },
          spacing: { line, lineRule: LineRuleType.AUTO },
          children: runsFromNode(para, font, size),
        }))
      })
    }
  })

  const runningTitle = [company, doc?.title].filter(Boolean).join(' — ')
  const header = new Header({
    children: [new Paragraph({
      alignment: AlignmentType.RIGHT,
      children: [new TextRun({ text: runningTitle || 'Proposal', color: GRAY, size: 16, font })],
    })],
  })
  const footer = new Footer({
    children: [new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({ text: 'Page ', color: GRAY, size: 16, font }),
        new TextRun({ children: [PageNumber.CURRENT], color: GRAY, size: 16, font }),
        new TextRun({ text: ' of ', color: GRAY, size: 16, font }),
        new TextRun({ children: [PageNumber.TOTAL_PAGES], color: GRAY, size: 16, font }),
        new TextRun({ text: '   ·   Proprietary & Confidential', color: GRAY, size: 16, font }),
      ],
    })],
  })

  const pageMargin = { top: margin, right: margin, bottom: margin, left: margin }

  const document = new Document({
    styles: { default: { document: { run: { font, size } } } },
    sections: [
      { properties: { page: { margin: pageMargin } }, children: cover },
      { properties: { page: { margin: pageMargin } }, headers: { default: header }, footers: { default: footer }, children: body },
    ],
  })
  return Packer.toBlob(document)
}
