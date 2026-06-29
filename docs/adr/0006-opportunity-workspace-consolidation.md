# ADR-0006: Consolidate WARDOG + R-E-A-D + Pipeline into one Opportunity Workspace

Status: Accepted
Date: 2026-06-29 (written retroactively)

## Context

WARDOG (opportunity discovery), R-E-A-D (bid/no-bid analysis), and Pipeline
(tracking) were originally three separate tools a user had to navigate
between for a single opportunity, each holding its own slice of context
about that opportunity. As AI scoring, full solicitation text capture, and
the Chrome capture extension were added, the cost of that fragmentation —
re-orienting on every navigation, no shared "this is what we know about
this specific bid right now" view — grew with every new feature bolted onto
one of the three tools separately.

## Decision

Build a single Opportunity Workspace route/shell that WARDOG, R-E-A-D, and
Pipeline all open *into*, rather than three independent pages a user
clicks between. The header surfaces a real fit score, win probability, and
competition read for whichever opportunity is open, so that context is
always visible regardless of which underlying tool (research, the
bid/no-bid call, or tracking) the user is currently using within it.

## Consequences

This is the single highest-leverage UI decision in the product to date:
every opportunity-specific feature added after this (AI deal scoring, full
solicitation capture, the Chrome extension's inbox handoff) gets a natural
home in the workspace header/sidebar instead of needing its own page. It
also means future opportunity-related features default to "where in the
Workspace does this go" rather than "does this need a fourth page."

The cost: WARDOG, R-E-A-D, and Pipeline as standalone routes still exist
and had to be migrated to route *into* the Workspace shell rather than
being deleted outright (see `App.jsx` entry-point routing), which is more
routing complexity to maintain than a clean three-pages-become-one
rewrite would have been, but avoided breaking existing bookmarks/links and
let the migration ship incrementally in phases.

## Evidence

- `fass-flow-frontend/src/pages/OpportunityWorkspace.jsx` — the shell.
- `fass-flow-frontend/src/pages/Wardog.jsx`, `Read.jsx`, `Fill.jsx` — entry
  points updated to route into the Workspace.
- `fass-flow-frontend/src/components/AppShell.jsx` /
  `AppShell.css` — sidebar dimming behavior added specifically for the
  Workspace shell.
- `docs/opportunity-workspace-spec.md` — original design rationale, written
  before the Phase 1 build.
