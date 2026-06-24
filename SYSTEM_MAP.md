# FASS Flow — System Map

*What every part is, and how it connects. Grounded in the actual code + database, not a wish list.*

---

## The one idea
Everything orbits a single record: **`proposals`** — one row per government opportunity you're working. Nearly every tool reads or writes it. That shared record is your "Customer 360." Keep it the spine; don't let tools drift off it.

---

## The money path (the core workflow)
This is the line that turns effort into a won contract. It's also the V2MOM's "one workflow to win."

**WARDOG** (find it) → **R-E-A-D** (should we bid?) → **PIPELINE** (track it) → **FASS FILL** (write the response) → *Submitted* → **AWARDED** → **WITNESS / FOREMAN / RESTORATION** (do the work) → **FUNDING** (what's the cash)

Each handoff already exists in the UI: Pipeline cards link out to R-E-A-D, FILL, and Funding; Awarded links into Witness.

---

## The tools, grouped by job

**Find & qualify**
- **WARDOG** — opportunity intel (SAM.gov sweep + curated sources). Writes `proposals`, reads `profiles`.
- **R-E-A-D** — six-question bid/no-bid scoring. Writes the score onto `proposals`.
- **INBOX** — incoming solicitations (`solicitation_inbox`) → promotes them into `proposals`.

**Track & respond**
- **PIPELINE** — the CRM board. Reads/writes `proposals`, `proposal_events` (the new change log), `fass_fill_documents`.
- **AWARDED** — won-contract summary. Reads `proposals` + `proposal_events`.
- **FASS FILL** — compliance matrix + capability statement. Writes `fass_fill_documents`, reads `proposals`, `profiles`.

**Execute the work**
- **WITNESS** — milestones, documents, vendors, insurance for awarded jobs. Ties `proposals` + `witness_*` + vendor tables.
- **FOREMAN** — construction mgmt (SOV, pay apps, RFIs, submittals, logs). All `foreman_*` tables + `proposals`.
- **RESTORATION** — room-by-room loss list. `restoration_projects`, `restoration_items`. ⚠️ *Not linked to `proposals`.*
- **ESTIMATOR** — zip-coded cost ranges. `estimator_saved_estimates`. ⚠️ *Not linked to `proposals`.*

**Money & network**
- **FUNDING** (Show Me The Money) — award math. Reads `proposals`.
- **NETWORK / JOIN NETWORK** — vendor directory (`network_vendors`, `vendor_contracts`, `vendor_team_assignments`).

**Learn & identity**
- **CLASSROOM / MASTERCLASS** — 10-night course (`masterclass_progress`).
- **GLOSSARY** — plain-English govcon terms (static).
- **PASSPORT** — business identity (`profiles`: UEI, CAGE, set-asides).

**Front of house**
- Dashboard (tool launcher + FunnelTracker + onboarding), BD Partner, Support, Sign In.

---

## Where the seams are (fix these to make the spine whole)

1. **`opportunities` table is unused.** WARDOG writes straight to `proposals`, so the funnel's "sourced" count and top-of-funnel stay near zero. Either route sourcing through `opportunities`, or drop it and redefine the metric.
2. **Restoration & Estimator are islands.** A restoration job or an estimate isn't connected to the bid that won it. Add a `proposal_id` link so the whole lifecycle lives on one record (and so won work shows up against the opportunity).
3. **WARDOG → R-E-A-D handoff** goes through Pipeline cards, not a direct path. Worth confirming a found opportunity flows cleanly to scoring without a dead end.

---

## The one number it all serves
**$ of government contracts won by FASS Flow customers.** Every tool above either feeds that number (find → qualify → respond → win) or protects it (execute → get paid). If a feature does neither, it's a someday item.
