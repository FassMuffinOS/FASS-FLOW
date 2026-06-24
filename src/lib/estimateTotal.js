// Shared selection math for interactive client estimates — used by both the
// public customer page and the in-app builder so the total is always the same.

export function defaultSelections(sections = []) {
  const sel = {}
  for (const sec of sections) {
    if (sec.kind === 'addons') {
      sel[sec.id] = (sec.options || []).filter(o => o.default).map(o => o.id)
    } else {
      const def = (sec.options || []).find(o => o.default) || (sec.options || [])[0]
      sel[sec.id] = def?.id
    }
  }
  return sel
}

export function computeTotal(base, sections = [], selections = {}) {
  let total = Number(base) || 0
  for (const sec of sections) {
    if (sec.kind === 'addons') {
      const included = Array.isArray(selections[sec.id])
        ? selections[sec.id]
        : (sec.options || []).filter(o => o.default).map(o => o.id)
      for (const o of sec.options || []) {
        if (included.includes(o.id)) total += Number(o.delta) || 0
      }
    } else {
      const selId = selections[sec.id] ?? ((sec.options || []).find(o => o.default)?.id ?? (sec.options || [])[0]?.id)
      const opt = (sec.options || []).find(o => o.id === selId)
      if (opt) total += Number(opt.delta) || 0
    }
  }
  return total
}

export function money(v) {
  return Number(v || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
}

export function fmtDelta(v) {
  const n = Number(v) || 0
  if (n === 0) return 'included'
  return (n > 0 ? '+' : '') + money(n)
}
