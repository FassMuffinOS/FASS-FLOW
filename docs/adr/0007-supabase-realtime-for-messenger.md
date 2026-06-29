# ADR-0007: Supabase Realtime (Postgres change feed) for Messenger and Team Up

Status: Accepted
Date: 2026-06-29 (written retroactively)

## Context

Messenger needed instant message delivery, presence (online dots), typing
indicators, and seen receipts. The realistic options were polling (simple,
but either laggy or expensive at a tight interval), a dedicated third-party
chat/realtime provider (Pusher, Ably, a custom websocket server), or
Supabase Realtime, which was already available as part of the Postgres
database FASS Flow already runs on (see ADR-0001).

## Decision

Use Supabase Realtime's Postgres logical-replication change feed for
delivery: one Realtime channel per page lifetime, subscribed to INSERT
(and later UPDATE, for edits/seen-receipts/reactions) events on the
relevant tables, scoped by row-level security so a channel only ever
delivers rows the subscribing user is actually allowed to see.

## Consequences

No separate realtime infrastructure to run or pay for beyond what Supabase
already provides — message delivery, presence, and typing indicators all
ride the same database the rest of the app already trusts. Security is
inherited "for free" from existing RLS policies rather than needing a
parallel authorization check in a separate realtime service.

The cost: realtime behavior is bound to Postgres's replication feed
characteristics — reconnect/backfill semantics, channel-per-page-lifetime
patterns, and debugging "why didn't this message arrive instantly" all
require Supabase-Realtime-specific knowledge rather than a more generic
websocket mental model. Group/teaming threads (3+ participants) and shared
object attachments (sharing a WARDOG opportunity or R-E-A-D analysis into
chat) were both built as extensions of this same channel model rather than
needing a different transport.

## Evidence

- `fass-flow-frontend/src/pages/Messages.jsx` (line ~51, ~168) — "Delivery
  is push-based: one Supabase Realtime subscription..." and "One realtime
  channel for the page's lifetime."
- `fass-flow-backend/migrations/messenger_realtime.sql`,
  `messenger_v2.sql`, `group_threads.sql`, `messenger_shared_objects.sql`.
- `fass-flow-backend/app/routers/chat.py` — message/thread endpoints the
  realtime feed is built on top of.
