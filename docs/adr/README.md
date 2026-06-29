# Architectural Decision Log — FASS Flow

This log records the real architectural decisions behind FASS Flow — not just
what got built, but why it was built that way instead of the alternative.
It covers the whole system (frontend in this repo, backend in
`fass-flow-backend`), kept here because this is the repo with an active
publishing pipeline already wired to documentation (see `/updates`,
`/releases`, `scripts/social/`).

## Why this exists

As FASS Flow grows from a set of pages into an integrated system — onboarding,
opportunity discovery, bid qualification, proposal generation, pipeline
tracking, execution, and growth tooling all sharing data — the cost of
*recreating* that integration goes up faster than the cost of recreating any
one page. The relationships between pieces (which service owns a fact, which
layer is allowed to be wrong, what's deterministic vs. AI-assisted) are the
part a README or code comment alone tends to lose over time. This log is
where that reasoning lives permanently, independent of who wrote the code or
whether they're still working on it.

It's useful for the same reasons release notes and a clean git history are
useful: due diligence by an investor, a new engineer ramping up, an acquirer
evaluating the codebase, or just future-Maurice needing to remember why
something is the way it is.

## Status of this log

The ADRs in this file (0001–0010) were written **retroactively** — the
decisions were already made and shipped; this is the first time they've been
written down. Going forward, new ADRs should be written *at decision time*,
ideally in the same PR/commit that implements the decision, while the
tradeoffs are still fresh.

## Format

Each ADR is a single markdown file: `NNNN-short-title.md`. Use this template
for new entries:

```markdown
# ADR-NNNN: <Decision title>

Status: Proposed | Accepted | Superseded by ADR-XXXX | Deprecated
Date: YYYY-MM-DD

## Context
What problem or fork in the road prompted this decision? What were the
realistic alternatives?

## Decision
What was actually decided, stated plainly.

## Consequences
What does this make easier? What does it make harder or rule out later?
What would have to change to reverse this?

## Evidence
File paths / migrations / commits that show this decision in the live
codebase, so this doc can be checked against reality instead of trusted
blindly.
```

## Index

| # | Title | Status |
|---|-------|--------|
| [0001](./0001-supabase-as-system-of-record.md) | Supabase as the system of record | Accepted |
| [0002](./0002-fastapi-backend-separate-service.md) | FastAPI backend as a separate service from the frontend | Accepted |
| [0003](./0003-apple-wallet-passkit-for-loyalty-and-gift-cards.md) | Apple Wallet (PassKit) for loyalty cards, gift cards, and credentials | Accepted |
| [0004](./0004-stripe-connect-for-business-payouts.md) | Stripe Connect (Express) for business payouts, decoupled from checkout rewiring | Accepted |
| [0005](./0005-deterministic-parsing-with-ai-layered-on-top.md) | Deterministic regex as source of truth; AI layered on top for judgment + generation | Accepted |
| [0006](./0006-opportunity-workspace-consolidation.md) | Consolidate WARDOG + R-E-A-D + Pipeline into one Opportunity Workspace | Accepted |
| [0007](./0007-supabase-realtime-for-messenger.md) | Supabase Realtime (Postgres change feed) for Messenger and Team Up | Accepted |
| [0008](./0008-extension-capture-key-not-session.md) | Per-user revocable capture key (not a Supabase session) for the Chrome capture extension | Accepted |
| [0009](./0009-draft-only-social-publishing.md) | Social/marketing publishing is draft-generation only — no automated posting | Accepted |
| [0010](./0010-hand-applied-sql-migrations.md) | Hand-applied, unversioned SQL migration files (current state — flagged gap) | Accepted (flagged for revisit) |
