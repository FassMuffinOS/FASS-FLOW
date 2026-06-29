// ── Sidebar custom views ───────────────────────────────────
// Turns the fixed sidebar into a role-based "command center": named views
// (Bid / Job Site / Growth + any the user creates), each holding up to 7
// tools the user chose, plus a compact icon-rail toggle. Persisted to
// localStorage — no backend, per-device, instant.
//
// Views store tool NAMES (strings that match AppShell's NAV_GROUPS item
// names); AppShell resolves them back to icons/routes. Names that no longer
// resolve (a tool was renamed/removed) are simply skipped, so a stale stored
// config never breaks the nav.

export const MAX_TOOLS_PER_VIEW = 7
const KEY = 'fass_sidebar_config'

// Seeded presets — editable and deletable by the user once they exist.
export const DEFAULT_VIEWS = [
  { id: 'bid', name: 'Bid', tools: ['WARDOG', 'R-E-A-D', 'FASS FILL', 'Proposal Editor', 'Pipeline', 'Estimator', 'Inbox'] },
  { id: 'jobsite', name: 'Job Site', tools: ['Contractor Camera', 'Foreman', 'Restoration', 'Witness', 'Captures', 'Messages'] },
  { id: 'growth', name: 'Growth', tools: ['Feed', 'Network', 'Funding', 'Classroom', 'Affiliates', 'Team Up', 'Rewards'] },
]

function defaults() {
  return { activeView: 'all', compact: false, views: DEFAULT_VIEWS.map(v => ({ ...v, tools: [...v.tools] })) }
}

export function loadSidebarConfig() {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return defaults()
    const parsed = JSON.parse(raw)
    return {
      activeView: typeof parsed.activeView === 'string' ? parsed.activeView : 'all',
      compact: !!parsed.compact,
      views: Array.isArray(parsed.views) && parsed.views.length ? parsed.views : defaults().views,
    }
  } catch {
    return defaults()
  }
}

export function saveSidebarConfig(config) {
  try {
    localStorage.setItem(KEY, JSON.stringify(config))
  } catch {
    // private/locked-down storage — non-fatal, the sidebar just won't persist.
  }
}

export function newViewId() {
  return 'v' + Math.random().toString(36).slice(2, 8)
}
