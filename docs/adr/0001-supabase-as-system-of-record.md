# ADR-0001: Supabase as the system of record

Status: Accepted
Date: 2026-06-29 (written retroactively — decision predates this log)

## Context

FASS Flow needs Postgres, authentication, file storage, and a way to push
live updates to open browser tabs (Messenger, Team Up, presence/typing
indicators). Building each of those as a separate piece of infrastructure
(a hand-rolled auth service, a websocket server, an S3-compatible bucket)
would be more total surface area to operate than a small team can justify
this early.

## Decision

Supabase is the system of record for the whole product: Postgres for every
table, Supabase Auth (including OAuth providers) for every signed-in user,
Supabase Storage for uploaded files (attachments, Passport assets), and
Supabase Realtime (a Postgres logical-replication change feed) for anything
that needs to push to an open tab without polling.

## Consequences

This makes shipping new features fast — a new feature is usually "a new
table + RLS policy + a router," not "a new table + a new service to run."
It also means the backend (`fass-flow-backend`) is a thin layer in front of
Supabase rather than the owner of its own database engine — most routers
call `get_supabase()` directly rather than going through an ORM.

The tradeoff: FASS Flow is meaningfully coupled to Supabase's specific
feature set (Realtime's replication-based delivery, Storage's bucket model,
Auth's session/JWT shape). Migrating off Supabase later would touch nearly
every router and most frontend data-fetching code, not just one isolated
layer — this was accepted knowingly in exchange for shipping speed at this
stage of the company.

## Evidence

- `fass-flow-backend/app/database.py` — `get_supabase()` used directly
  across nearly every router in `app/routers/`.
- `fass-flow-backend/requirements.txt` — `supabase==2.4.3`.
- `fass-flow-frontend/src/context/AuthContext.jsx` — Supabase Auth session
  management, `signInWithProvider`.
- `fass-flow-frontend/src/pages/Messages.jsx` (line ~51) — "Delivery is
  push-based: one Supabase Realtime subscription..." (see ADR-0007 for the
  realtime-specific decision).
- `fass-flow-backend/migrations/*.sql` — 30 migration files, all raw
  Postgres DDL applied directly against the Supabase project (see ADR-0010).
