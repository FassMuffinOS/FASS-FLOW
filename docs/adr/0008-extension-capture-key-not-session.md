# ADR-0008: Per-user revocable capture key (not a Supabase session) for the Chrome capture extension

Status: Accepted
Date: 2026-06-29 (written retroactively)

## Context

The Chrome capture extension reads solicitation pages on government
procurement portals (e.g. SAM.gov) and posts the captured content into
FASS Flow's ingest pipeline. It needs to authenticate as a specific FASS
Flow user, but it runs inside the browser on a third-party government
site — not on flow.fass.systems — which makes shipping a normal,
refreshable Supabase JWT into that context awkward and riskier than
necessary.

## Decision

Auth for the extension's write path is a per-user, long-lived bearer
"capture key" the extension stores locally, checked by the ingest router —
not a Supabase session. The key is scoped to exactly one write path
(posting captured solicitations) and is revocable independently of the
user's actual login session.

## Consequences

If the extension or a user's browser is compromised, the blast radius is
limited to "someone can submit fake solicitation captures as this user" —
not "someone has this user's full session" with access to messaging,
payments, or account settings. The key can be rotated without forcing a
full re-login. This also sidesteps the awkwardness of refreshing a
Supabase JWT from inside a content script running on a third-party
domain.

The cost: this is a second auth mechanism to reason about and document
separately from the normal session-based auth everything else in the app
uses — anyone auditing auth has to know two systems exist, not one.

## Evidence

- `fass-flow-backend/app/routers/ingest.py` (docstring) — "Auth here is a
  per-user capture key... not a Supabase session: the extension runs in
  the browser on a government portal, where shipping a refreshable JWT
  would be awkward and riskier than a single revocable key scoped to
  exactly this one write path."
- `fass-flow-backend/migrations/ingest_pipeline.sql`.
- Chrome extension source (manifest + capture script) — stores and sends
  this key, not a Supabase session token.
