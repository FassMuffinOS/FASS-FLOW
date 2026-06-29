# ADR-0002: FastAPI backend as a separate service from the frontend

Status: Accepted
Date: 2026-06-29 (written retroactively)

## Context

Some of what FASS Flow does can't live in the browser even with Supabase
doing most of the data/auth work: holding Stripe secret keys, signing Apple
Wallet passes with a private certificate, calling APNs over HTTP/2, calling
an LLM with a server-side API key, and running quota/rate-limit checks that
a client can't be trusted to enforce on itself.

## Decision

Run a dedicated Python/FastAPI backend (`fass-flow-backend`, deployed
separately on Railway) for everything that needs a private key, a paid
third-party API call, or money movement. The React frontend
(`fass-flow-frontend`) talks to Supabase directly for plain CRUD/realtime
and to this backend only for the operations that need a trusted server.

## Consequences

This keeps Stripe secret keys, Apple Wallet signing certs, APNs auth, and
LLM API keys out of the browser entirely — they only ever live in the
backend's environment. It also gives a natural home for anything
deterministic-then-AI-layered (see ADR-0005) and for webhook receivers
(Stripe, future providers) that need a stable server endpoint.

The cost is two deployable services instead of one: every backend change
needs its own deploy/redeploy step (Railway) independent of the frontend's
(separate from the frontend's static-host deploy), and local dev needs both
running to exercise anything that isn't pure Supabase CRUD.

## Evidence

- `fass-flow-backend/requirements.txt` — `fastapi`, `stripe`, `pywebpush`,
  `h2` (APNs over HTTP/2), `reportlab`, `pypdf`.
- `fass-flow-backend/app/routers/` — 20+ routers, each owning one
  trusted-server concern (`stripe_connect.py`, `wallet_passkit.py`, `ai.py`,
  `comms.py`, etc).
- `fass-flow-frontend/src/lib/` — API client code calling the backend's
  base URL for these specific concerns, Supabase client directly for
  everything else.
