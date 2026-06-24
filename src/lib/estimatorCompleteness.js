// ── Estimator Completeness Assistant — rules engine v1 ───────────────
// Deterministic, free, and fully explainable. Reads the project scope plus
// the current line items and flags the auxiliary / supporting materials a
// rookie forgets — each with WHY it's needed and WHAT it supports. Three
// systematic passes mirror how an experienced estimator thinks:
//   1. Scope-driven   — what this TYPE of job requires.
//   2. Dependency     — what your existing line items imply you're missing.
//   3. Leave-outs     — waste, protection, disposal that quietly eat margin.
// An LLM endpoint can augment this later, but the value lands today.

// 1. Scope-driven: keyword in the project title/template → required items.
const SCOPE_RULES = [
  {
    test: /fire|life safety|life-safety|fire-rated|fire alarm|sprinkler/i,
    group: 'Fire-stopping & sealants',
    note: 'required by scope',
    items: [
      { match: 'fire-rated intumescent caulk', why: 'every penetration through a fire-rated wall must be sealed or the assembly fails inspection', forItem: 'rated walls & penetrations' },
      { match: 'fire-stop sealant', why: 'larger openings and joints in rated assemblies need a fire-stop system', forItem: 'rated assemblies' },
      { match: 'door closer', why: 'a fire-rated opening only passes with a self-closing device', forItem: 'rated doors' },
    ],
  },
  {
    test: /paint|coating|repaint|finish/i,
    group: 'Paint & finishes',
    items: [
      { match: 'primer', why: 'bare and patched surfaces need primer before the topcoat', forItem: 'painted surfaces' },
      { match: "painter's acrylic caulk", why: 'gaps at trim and corners are caulked before paint for a clean line', forItem: 'trim & transitions' },
      { match: "painter's tape", why: 'masking protects adjacent finishes', forItem: 'cut lines' },
    ],
  },
  {
    test: /roof/i,
    group: 'Roofing',
    items: [
      { match: 'underlayment', why: 'code requires underlayment beneath the shingles', forItem: 'roof deck' },
      { match: 'drip edge', why: 'required at eaves and rakes to shed water', forItem: 'roof edges' },
      { match: 'roofing nails', why: 'shingles need the proper fasteners', forItem: 'shingles' },
    ],
  },
  {
    test: /concrete|slab|sidewalk|pavement|curb|footing|foundation/i,
    group: 'Concrete & reinforcement',
    items: [
      { match: 'rebar', why: 'flatwork and footings need reinforcement to resist cracking', forItem: 'concrete pours' },
    ],
  },
  {
    test: /electric|lighting|power|panel|wiring/i,
    group: 'Electrical rough-in',
    items: [
      { match: 'wire nuts', why: 'every splice needs an approved connector', forItem: 'wiring' },
      { match: 'single-gang box', why: 'devices need boxes', forItem: 'receptacles & switches' },
    ],
  },
  {
    test: /plumb|restroom|bathroom|water|sewer|fixture/i,
    group: 'Plumbing',
    items: [
      { match: 'shutoff valve', why: 'fixtures need isolation valves', forItem: 'fixtures' },
      { match: 'wax ring', why: 'toilets are set on a new wax ring', forItem: 'water closets' },
    ],
  },
]

// 2. Dependency: a line item is present, but the things to install it aren't.
const DEPENDENCY_RULES = [
  { when: /drywall/i, needs: ['drywall screws', 'joint compound', 'drywall paper tape'], group: 'To hang & finish your drywall', why: 'you added drywall but nothing to mount or finish it', forItem: 'drywall sheets' },
  { when: /shingle/i, needs: ['underlayment', 'roofing nails'], group: 'To install your roofing', why: 'shingles need underlayment and fasteners', forItem: 'shingles' },
  { when: /\bpaint\b/i, needs: ['primer'], group: 'To finish your paint', why: 'paint needs primer on bare and patched areas', forItem: 'paint' },
  { when: /stud|framing|\b2x/i, needs: ['framing nails'], group: 'To assemble your framing', why: 'framing needs fasteners', forItem: 'framing lumber' },
  { when: /tile|flooring|lvp/i, needs: ['thinset', 'grout'], group: 'To set your flooring', why: 'tile/LVP needs setting materials', forItem: 'flooring' },
]

// 3. Always relevant once there's any work on the estimate.
const GENERAL = {
  group: 'Waste, prep & disposal',
  items: [
    { match: 'drop cloth', why: 'protect floors and finishes while you work', forItem: 'the work area' },
    { match: 'contractor trash bags', why: 'debris haul-out is a real cost rookies skip', forItem: 'cleanup' },
    { match: 'dumpster', why: 'most jobs need disposal and haul-off', forItem: 'demo & cleanup' },
  ],
}

export function getSuggestions({ projectContext = '', lines = [], catalog = [] }) {
  const ctx = (projectContext || '').toLowerCase()
  const have = lines.map(l => (l.name || '').toLowerCase()).join(' | ')
  const findItem = q => catalog.find(m => m.name.toLowerCase().includes(q.toLowerCase()))
  const alreadyHave = name => have.includes(name.toLowerCase())

  const groups = []
  const pushItems = (cat, meta) => ({ name: cat.name, why: meta.why, forItem: meta.forItem, price: cat.base_price, unit: cat.unit })

  // Pass 1 — scope-driven
  for (const rule of SCOPE_RULES) {
    if (!rule.test.test(ctx)) continue
    const items = rule.items
      .map(it => ({ it, cat: findItem(it.match) }))
      .filter(({ cat }) => cat && !alreadyHave(cat.name))
      .map(({ it, cat }) => pushItems(cat, it))
    if (items.length) groups.push({ group: rule.group, note: rule.note, kind: 'scope', items })
  }

  // Pass 2 — dependency checks
  for (const rule of DEPENDENCY_RULES) {
    if (!rule.when.test(have)) continue
    const items = rule.needs
      .map(n => findItem(n))
      .filter(cat => cat && !alreadyHave(cat.name))
      .map(cat => pushItems(cat, rule))
    if (items.length) groups.push({ group: rule.group, kind: 'dependency', items })
  }

  // Pass 3 — general leave-outs (only if something is on the estimate)
  if (lines.length) {
    const items = GENERAL.items
      .map(it => ({ it, cat: findItem(it.match) }))
      .filter(({ cat }) => cat && !alreadyHave(cat.name))
      .map(({ it, cat }) => pushItems(cat, it))
    if (items.length) groups.push({ group: GENERAL.group, kind: 'general', items })
  }

  return groups
}
