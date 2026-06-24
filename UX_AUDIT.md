# FASS Flow — Capability + UX Audit

*Code-grounded review of the live app. What it can do, and where the experience is rough.*

---

## What it can do (capability inventory)
27 routes, ~25 module pages covering the **full govcon lifecycle** end to end:

- **Find:** WARDOG (live SAM.gov feed + directory), Inbox (solicitation parsing), the Dashboard ticker.
- **Qualify:** R-E-A-D (bid/no-bid scoring, AI synthesis).
- **Respond:** FASS FILL (compliance matrix, AI drafting), Estimator (materials catalog + AI scope takeoff).
- **Track:** Pipeline (Monday-style board, change tracking, activity feed), Awarded view.
- **Execute:** Witness, Foreman, Restoration, Contractor Camera + Captures.
- **Get paid / grow:** Funding calculator, Network (vendors/teams), BD Partner.
- **Learn / identity:** Classroom, Masterclass, Glossary, Passport.
- **Cross-cutting:** AI backend (live), in-app alerts, North Star dashboard.

This is a genuinely complete product. The gaps below are about **presentation and flow**, not missing features.

**Healthy signs:** strong loading-state coverage, no leftover console logs, no TODOs/placeholders, consistent design-token system.

---

## Findings, prioritized

### P1 — High impact

**1. Mobile navigation is a horizontal-scroll strip of 18 items.**
On ≤900px the sidebar becomes a top bar you scroll *sideways* through every module. On a phone that's near-unusable — and Contractor Camera is a phone-first tool. **Fix:** a proper mobile pattern — a hamburger drawer, or a bottom tab bar of the 4–5 core tools + "More".

**2. Newest tools aren't in the sidebar.**
Contractor Camera, Captures, and Awarded have no nav entry — they're only reachable via Dashboard tiles or deep links. High-value features are effectively hidden. **Fix:** add them to the nav.

**3. Flat 18-item sidebar, no hierarchy.**
A wall of modules with no grouping. Users can't build a mental model. **Fix:** group by the journey — Find / Qualify / Respond / Track / Execute / Learn — with section labels.

**4. Weak cold-start.**
A brand-new user lands on "$0 won," an empty funnel, and locked milestones — no guided first step. **Fix:** a prominent first-run path: set NAICS in Passport → run a WARDOG search → score your first bid. (An OnboardingChecklist exists but the empty state still feels dead.)

### P2 — Medium

**5. Accessibility is thin.**
~9 aria-labels and ~6 alt attributes across the whole app; many icon-only buttons have no label. For a product selling into **government** work, Section 508 / WCAG matters — both for compliance optics and real users. **Fix:** label icon buttons, add alts, check contrast and focus order.

**6. Inconsistent page chrome.**
~20 pages render their own bespoke headers (`pl-header`, `est-header`, `wd-top`, `wit-header`…) with different styles and positions. The app feels stitched-together page to page. **Fix:** a shared page-header component.

**7. Janky native dialogs.**
CapturesGallery uses `window.confirm()` for delete — breaks the polished feel. **Fix:** an in-app confirm.

**8. Several pages lack responsive CSS** (Witness, Classroom, Admin, SignIn). SignIn especially — people sign in on phones. **Fix:** add mobile breakpoints.

### P3 — Polish
- Inline error surfaces vary (some `setError`, some flash). Standardize a toast pattern.
- Mobile top-strip hides plan/email (acceptable).

---

## Recommended order
1. **Mobile nav + add missing tools + grouping** (P1.1–1.3) — one focused pass on AppShell fixes the biggest daily friction.
2. **Cold-start onboarding** (P1.4).
3. **Accessibility pass** (P2.5) — meaningful for govcon buyers.
4. Shared header + confirm + responsive stragglers (P2.6–8).

The #1 lever is the AppShell: fix mobile nav, add the missing tools, and group it. That single file change improves every screen.
