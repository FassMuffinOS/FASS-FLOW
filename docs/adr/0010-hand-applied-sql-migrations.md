# ADR-0010: Hand-applied, unversioned SQL migration files (current state — flagged gap)

Status: Accepted (flagged for revisit)
Date: 2026-06-29 (written retroactively)

## Context

Every schema change to date — 30 of them as of this writing — has been a
standalone `.sql` file in `fass-flow-backend/migrations/`, written by
whoever built the feature, handed to a human to run by hand against the
Supabase project (directly in the SQL editor or via a one-off `psql`
command), and never re-run automatically. There is no migration runner, no
sequence numbering, and no record in the database itself of which files
have actually been applied.

## Decision

This was never a deliberate "this is the right way to do it" decision — it
emerged from speed: every feature needed its schema change shipped fast,
and adding a migration framework was repeatedly deprioritized against
shipping the feature itself. It's documented here as the **current actual
state**, not as a recommendation.

## Consequences

This works as long as exactly one person (or a tightly coordinated small
team) is applying every migration by hand, in the right order, and
remembers which ones already ran. It breaks down as soon as: a second
engineer needs to set up a fresh environment and has no reliable way to
know which of the 30 files to run or in what order; a migration needs to
be rolled back; or due diligence (an investor, an acquirer's engineering
team) asks "what does your schema-change process look like" and the
honest answer is "a folder of files and someone's memory."

This is the most concrete gap surfaced by writing this ADR log at all —
recommend introducing a real migration tool (e.g. Supabase CLI migrations,
or even just a numbered-filename convention plus a `schema_migrations`
tracking table) as a near-term follow-up, not because anything is broken
today, but because the cost of fixing this only goes up as more migrations
accumulate on top of the unversioned 30 that already exist.

## Evidence

- `fass-flow-backend/migrations/*.sql` — 30 files, no numeric prefix, no
  applied-migrations tracking table found in `supabase_schema.sql`.
- Conversation/task history across this project — the repeated pattern of
  "write migration.sql, hand off to user to run in Supabase" rather than
  an automated apply step.
