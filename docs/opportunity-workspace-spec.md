# Opportunity Workspace — Engineering Spec

**Status:** Draft for review
**Author:** Claude (FASS Flow engagement)
**Date:** 2026-06-28

## 1. Problem

WARDOG, R-E-A-D, and FASS FILL are already joined by one real piece of continuity: every page reads/writes the same `proposals.id` row, passed as a `?proposalId=` query param. That's the right foundation — it's just invisible to the user.

What the user actually experiences working one opportunity end-to-end:

- Three separate routes (`/wardog`, `/read`, `/fill`), each rendered by `<ProtectedRoute>` inside the shared `AppShell`, so the sidebar/ChatDock/BottomNav never unmount — but each page itself fully unmounts and remounts on every hop.
- Each page has its own header, its own "← Dashboard" back button, and re-fetches the opportunity from scratch via `useSearchParams()` (`Wardog.jsx`, `Read.jsx`, `Fill.jsx` all independently call Supabase for the same `proposalId`).
- Pipeline (`Pipeline.jsx` lines 119, 213, 221) is a fourth entry point doing the exact same `?proposalId=` query-param handoff into `/read` and `/fill`.
- There's no pinned "here's the opportunity you're working" context — title/agency/due date only exist inside whichever single page is currently mounted, then disappear on the next hop.
- The sidebar treats WARDOG / R-E-A-D / FASS FILL / Pipeline as four unrelated nav items, with no visual indication that you're mid-flow on one specific record.

This is the "manual gear shift": same engine speed, but the driver feels every shift point.

## 2. Goal

One persistent **Opportunity Workspace** that replaces the page-to-page handoff with in-place panel switching:

- A pinned header showing the opportunity's identity (title, agency, NAICS, due date, status/recommendation badge) that stays on screen across Decide and Draft.
- Tab/panel switching between **Decide** (today's R-E-A-D) and **Draft** (today's FASS FILL, opportunity-bound mode only — Capability Statement stays separate, it isn't per-opportunity) — switching is local state, not a route change, so nothing remounts or flickers.
- Sidebar shifts into a "focused" state while inside the workspace: WARDOG / R-E-A-D / FASS FILL / Pipeline stay lit, everything else dims.

## 3. Architecture

### New route
`/opportunity/:proposalId` — the workspace shell. `/opportunity/new?title=&agency=&solnum=&source=` covers the not-yet-saved case (arriving straight from a WARDOG search result before a `proposals` row exists).

### Component: `OpportunityWorkspace.jsx`
- Pinned header bar: title, agency, NAICS, due date, recommendation/status badge (reuses the badge logic already in `Read.jsx`'s `recommendation()`).
- Tab strip: **Decide** | **Draft** (mirrors the existing `topTab` pattern already proven inside `Fill.jsx` — this generalizes a pattern that already works, not a new idea).
- Content area renders the active panel; switching tabs is a `useState`, not `navigate()`.

### State: `OpportunityContext`
Fetch the `proposals` row (and linked `opportunities` row) once when the workspace mounts; pass it down to both panels instead of each panel independently re-querying Supabase off its own `useSearchParams()`. This removes the duplicate fetch logic in `Read.jsx` and `Fill.jsx` and kills the "did it just reload?" flicker on tab switch.

### Sidebar dimming
`AppShell.jsx` already computes `active` per nav item via `location.pathname.startsWith(p)` (line 183). Add:
```js
const inWorkspace = location.pathname.startsWith('/opportunity')
```
and a `shell-sidebar-dimmed` class on any nav item whose group isn't "Find work" / "Bid" when `inWorkspace` is true. Pure CSS opacity change, no new state machine.

## 4. Routing / backward compatibility

Update all four entry points that currently hard-navigate with `?proposalId=`:

| Source | Current | New |
|---|---|---|
| `Wardog.jsx` "Send to R-E-A-D" | `navigate('/read?...')` | `navigate('/opportunity/' + proposalId + '?panel=decide')` |
| `Wardog.jsx` "Send to FASS FILL" link | `<Link to="/fill?new=1&...">` | `<Link to="/opportunity/{id}?panel=draft">` |
| `Read.jsx` "Continue to FASS FILL →" | `<Link to="/fill?new=1&proposalId=...">` | `<Link to="/opportunity/{id}?panel=draft">` |
| `Pipeline.jsx` (lines 119, 213, 221) | `href="/read?..."` / `href="/fill?proposalId=..."` | `href="/opportunity/{id}?panel=decide"` / `?panel=draft` |

Keep `/read` and `/fill` alive as routes (don't break bookmarks or in-flight links): if either is hit with a `proposalId` param, redirect straight into `/opportunity/:proposalId`. `/fill` with no `proposalId` keeps working as-is for the standalone Capability Statement tab.

## 5. Phasing

**Phase 1 — Shell wrapper (lowest risk, ships first):**
Add the `/opportunity/:proposalId` route and `OpportunityWorkspace` component as a thin wrapper: pinned header + tab strip on top, with `Read.jsx` and `Fill.jsx` rendered underneath *unchanged*, just fed their existing query params programmatically instead of via a real URL. This alone removes the page-reload feeling and adds the pinned context. Low risk because neither large file's internals change.
*Est: 2–3 days.*

**Phase 2 — Shared state:**
Extract the proposal/opportunity fetch into `OpportunityContext`; refactor `Read.jsx` and `Fill.jsx` to read from context instead of independently calling Supabase off `useSearchParams()`. This is the real refactor — both files are 900–1000+ lines, so budget time for regression testing each (R-E-A-D scoring/save logic, FASS FILL document generation/save logic).
*Est: 3–4 days.*

**Phase 3 — Polish:**
Cross-fade/slide transition between Decide ↔ Draft panels; optional third tab ("Source") showing the original WARDOG listing inline so the user never has to leave the workspace to re-check the notice.
*Est: 1–2 days.*

**Phase 4 — Stretch:**
Bring opportunity *selection* itself into the workspace as a left rail (jump to the next saved opportunity without exiting) — true Rule-of-Three master/detail.

## 6. Risks / open items

- `Read.jsx` and `Fill.jsx` are large, single-purpose pages today (own header, own save logic, own localStorage tracking) — Phase 2's refactor touches the riskiest, highest-value code in the product. Phase 1 is deliberately structured to ship the felt improvement before that refactor starts.
- Pipeline's two other `/read` / `/fill` links (and any others not yet audited — e.g. notifications, alerts, search) need a full grep pass before Phase 1 ships, not just the three found here.
- Mobile layout: the new pinned header + tab strip is another fixed-position element competing for vertical space with `BottomNav` (`z-index 65`, `@media max-width 900px`) — apply the same lesson learned from the ChatDock fix and explicitly account for `BottomNav`'s height rather than discovering the overlap from a screenshot.

## 7. Estimate

Phase 1: 2–3 days. Phase 2: 3–4 days. Phase 3: 1–2 days. **~1.5–2 weeks for the full effect; Phase 1 alone is shippable in under a week and is where the "driver's seat" feeling actually starts.**
