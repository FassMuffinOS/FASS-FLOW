import { useState, useRef, useEffect, useMemo } from 'react'
import { Search } from 'lucide-react'
import { NAICS_CODES } from '../data/naicsCodes'
import './NaicsCombobox.css'

// Single searchable type-ahead over the full ~1,060-code US NAICS 2022 list,
// replacing the old hardcoded 8-option <select> + paywalled custom-NAICS
// <input>. Matches on code prefix or title substring so "561" surfaces every
// admin/support services code and "janitorial" finds 561720 directly.
// Ungated for every tier — searching real opportunities by real NAICS code
// is core functionality, not an upsell.
export default function NaicsCombobox({ value, onChange, onSubmit }) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [highlight, setHighlight] = useState(0)
  const wrapRef = useRef(null)

  const selected = useMemo(
    () => NAICS_CODES.find(n => n.code === value),
    [value]
  )

  // Reflect the current value in the input when not actively typing/open.
  useEffect(() => {
    if (!open) setQuery(selected ? `${selected.code} — ${selected.title}` : (value || ''))
  }, [value, selected, open])

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return NAICS_CODES.slice(0, 25)
    const byCode = []
    const byTitle = []
    for (const n of NAICS_CODES) {
      if (n.code.startsWith(q)) byCode.push(n)
      else if (n.title.toLowerCase().includes(q)) byTitle.push(n)
      if (byCode.length + byTitle.length >= 50) break
    }
    return [...byCode, ...byTitle].slice(0, 25)
  }, [query])

  useEffect(() => {
    function onClickOutside(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  function pick(n) {
    onChange(n.code)
    setQuery(`${n.code} — ${n.title}`)
    setOpen(false)
  }

  function handleKeyDown(e) {
    if (!open && (e.key === 'ArrowDown' || e.key === 'Enter')) { setOpen(true); return }
    if (e.key === 'ArrowDown') { e.preventDefault(); setHighlight(h => Math.min(h + 1, results.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHighlight(h => Math.max(h - 1, 0)) }
    else if (e.key === 'Enter') {
      e.preventDefault()
      if (open && results[highlight]) pick(results[highlight])
      else onSubmit?.()
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <div className="naics-combo" ref={wrapRef}>
      <div className="naics-combo-input-wrap">
        <Search size={14} className="naics-combo-icon" />
        <input
          type="text"
          value={query}
          placeholder="Search code or industry — e.g. 561720 or janitorial"
          onChange={e => { setQuery(e.target.value); setOpen(true); setHighlight(0) }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
        />
      </div>
      {open && (
        <ul className="naics-combo-list" role="listbox">
          {results.length === 0 && <li className="naics-combo-empty">No matching NAICS code</li>}
          {results.map((n, i) => (
            <li
              key={n.code}
              role="option"
              aria-selected={n.code === value}
              className={`naics-combo-item ${i === highlight ? 'naics-combo-item-active' : ''} ${n.code === value ? 'naics-combo-item-selected' : ''}`}
              onMouseEnter={() => setHighlight(i)}
              onMouseDown={e => { e.preventDefault(); pick(n) }}
            >
              <span className="naics-combo-code">{n.code}</span>
              <span className="naics-combo-title">{n.title}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
