# Estimator Upgrade — Spec

*Goal: Xactimate-grade itemization, but if Elon ran it and was getting an 18-year-old into govcon. Robinhood-for-estimating: fast, clean, no jargon, addictive to use.*

---

## What changes
Today the Estimator works in **trades** ($/sq ft by trade, region-adjusted). That stays — it's the fast "ballpark in 5 minutes" path. We add a **materials mode** on top: real line items (lumber, drywall, concrete, fixtures), each with a unit price, that roll into the same total.

The three new powers:
1. **A materials catalog** you search and add from (`2x4`, `drywall`, `conduit`…), priced and region-adjusted.
2. **Add-your-own items** — anything not in the catalog (your supplier's SKU + price) saves to *your* catalog and is reusable.
3. **Real price-trend signals** — up/down arrows on commodity materials so you know lumber's climbing before you lock a bid.

---

## The pricing-data question (your call — here's the honest map)

There is **no official Home Depot or Lowe's API.** Live retail prices only come from paid third-party scrapers that are fragile and against their terms. So we do this in phases:

**Phase 1 — Curated catalog + your-own items. (Free. Build now.)**
A seeded catalog of common construction materials with representative current prices, region-adjusted by ZIP, clearly labeled "a guide, not live retail." Plus the add-your-own table. This alone is a massive upgrade and 100% honest.

**Phase 2 — Real trend signals. (Free-ish. Build next.)**
Pull the [BLS Producer Price Index](https://www.bls.gov/ppi/) (government data) for lumber, steel, concrete, drywall, etc. Show a ↑/↓ % arrow per material. Real data, no scraping, no cost — just a periodic fetch.

**Phase 3 — True live local pricing. (Paid. When revenue justifies it.)**
Integrate [1build](https://www.1build.com/) — live costs sourced daily from big-box + local suppliers, by county, Xactimate-grade, via a real API. This is the "live prices" dream done legitimately, but it's a subscription.

**Recommendation:** ship Phase 1 now, add Phase 2 soon (it's the "real data" wow with no cost), hold Phase 3 until you have paying users who'd value it.

---

## Data model (Phase 1)
- `material_catalog` — shared seed list: name, category, unit, base_price, optional region/notes. (Read-only seed.)
- `user_materials` — a user's own items: user_id, name, category, unit, price. (Their private catalog, RLS like everything else.)
- `estimator_saved_estimates.lines` (jsonb, already exists) gains a `material` line type alongside the current `trade` type — no schema change needed, just a richer line shape.

## UX principles (the Robinhood part)
- One search box. Type, see matches, tap to add. No forms until you want them.
- Big running total, always visible. Every add animates the number.
- Trend arrows make it feel alive and smart.
- "Add your own" is one tap, never a dead end.
- Works thumb-first on a phone, on a job site.

---

## AI Completeness Assistant (the differentiator)

A co-pilot that reads the **project scope** (from the linked bid's title/description/NAICS, or the chosen template) plus your **current line items**, and flags what jobs like this usually need that you forgot — grouped systematically, each with *why it's needed* and *what for*. This is the feature that lets someone with no experience bid like a 20-year veteran.

It works in three systematic passes:

1. **Scope-driven requirements** — what the *type* of job demands. A fire & life-safety job needs fire-rated caulk, rated door hardware, fire-stopping. A kitchen needs GFCI, backsplash, cabinet hardware. Driven by the solicitation, so it's specific, not generic.
2. **Dependency checks** — what your *existing line items* imply you're missing. Added drywall sheets but no screws, compound, or tape? Flag it. Added studs but no fasteners? Flag it. This is the "you can't install X without Y" logic.
3. **The stuff rookies always leave out** — waste/overage %, site protection (drop cloths, plastic), consumables (blades, bits), and disposal (dumpster). The line items that quietly eat margin.

Every suggestion shows: **Why** (the reason) + **For** (which listed item it supports) + a rough price + one-tap **Add**. Plus "Add all" and "Ask why" (opens a chat for the teaching moment). It learns your typical adds over time so it gets sharper per user.

**How it's built:** a new backend endpoint (e.g. `/ai/estimate-completeness`) that takes `{ projectContext, lineItems }` and returns structured `{ group, item, why, forItem, estPrice, qtyHint }[]`. The app already has the AI client + `/ai` router and a vision-capable LLM, so this slots into existing infrastructure — no new AI stack. Suggestions map straight onto the catalog/custom-item add flow from Phase 1.

**Honesty guardrail:** it's labeled as suggestions to sanity-check against the real plans, never as a guaranteed-complete bill of materials.

---

## Build order when you green-light it
1. Migration: `material_catalog` + `user_materials` (+ seed ~80 common items).
2. Materials search/add UI + custom-item flow (Phase 1).
3. Roll material lines into the existing total + save/load.
4. **AI Completeness Assistant** — `/ai/estimate-completeness` endpoint + the suggestions panel (the differentiator; can ship right after the materials mode since it reuses the add flow).
5. (Phase 2) BLS trend fetch + arrows.

*Nothing here is built yet — this is the plan to react to.*
