// ── .docx export ───────────────────────────────────────────
// Generates a Word document client-side from the editor's current content,
// applying the format rules parseSolicitation() pulled out of the solicitation
// (font, point size, margins, line spacing). Government portals reject on
// these, so honoring them exactly is the point of the feature.
import {
  Document, Packer, Paragraph, TextRun, HeadingLevel, LineRuleType,
} from 'docx'

function fontSizeHalfPts(format) {
  const n = parseInt(format?.fontSize || '', 10) // "12-point" -> 12
  return Number.isFinite(n) && n > 0 ? n * 2 : 24 // docx uses half-points; default 12pt
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
  return 240 // single
}

// Build docx runs from a ProseMirror/TipTap node's inline content.
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

// json: editor.getJSON()  ·  doc: assembleProposal() output (for title + format)
export async function buildDocxBlob(json, doc) {
  const fmt = doc?.format || {}
  const font = fmt.font || 'Times New Roman'
  const size = fontSizeHalfPts(fmt)
  const line = lineSpacing(fmt)
  const margin = marginTwips(fmt)

  const children = [
    new Paragraph({
      heading: HeadingLevel.TITLE,
      spacing: { after: 240 },
      children: [new TextRun({ text: doc?.title || 'Proposal', bold: true, font, size: size + 8 })],
    }),
  ]

  ;(json.content || []).forEach(node => {
    if (node.type === 'heading') {
      children.push(new Paragraph({
        heading: node.attrs?.level === 1 ? HeadingLevel.HEADING_1 : HeadingLevel.HEADING_2,
        spacing: { before: 240, after: 120 },
        children: runsFromNode(node, font, size + 4),
      }))
    } else if (node.type === 'paragraph') {
      children.push(new Paragraph({
        spacing: { line, lineRule: LineRuleType.AUTO, after: 120 },
        children: runsFromNode(node, font, size),
      }))
    } else if (node.type === 'bulletList' || node.type === 'orderedList') {
      ;(node.content || []).forEach(li => {
        const para = (li.content || []).find(c => c.type === 'paragraph') || li
        children.push(new Paragraph({
          bullet: { level: 0 },
          spacing: { line, lineRule: LineRuleType.AUTO },
          children: runsFromNode(para, font, size),
        }))
      })
    }
  })

  const document = new Document({
    styles: { default: { document: { run: { font, size } } } },
    sections: [{
      properties: { page: { margin: { top: margin, right: margin, bottom: margin, left: margin } } },
      children,
    }],
  })
  return Packer.toBlob(document)
}
