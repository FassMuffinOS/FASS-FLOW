# ADR-0004: Stripe Connect (Express) for business payouts, decoupled from checkout rewiring

Status: Accepted
Date: 2026-06-29 (written retroactively)

## Context

Gift card purchases were originally collected into FASS Flow's single
master Stripe account. That doesn't scale past a demo: every business
selling gift cards needs the money to actually land in *their* bank
account, not FASS's. The realistic options were Stripe Connect (Express,
Standard, or Custom account types) or building a manual payout/ledger
system on top of the master account.

## Decision

Use Stripe Connect with Express accounts — Stripe's fastest-to-onboard
Connect type, where Stripe hosts the entire identity/bank-account
onboarding form. `stripe_connect.py` only handles getting a business linked
and verified; it deliberately does **not** simultaneously rewire any
existing checkout flow to actually route money to the new account. Account
state is trusted only via the `account.updated` webhook
(`charges_enabled`/`details_submitted`), never via the redirect alone,
since a business can close the tab mid-flow or get flagged for additional
review after redirecting back.

## Consequences

Splitting "get a business Connect-onboarded" from "make checkout pay that
business" into two separate, sequential changes meant the onboarding flow
could be built, tested, and shipped on its own before any real money
routing changed — lower risk than shipping both at once. It also means
Connect account creation is idempotent per business
(`stripe_connect_account_id` stored once, reused), so an abandoned
onboarding can resume with a fresh Account Link instead of creating
duplicate Stripe accounts.

The cost: there was a real window where a business could appear
"Connect onboarded" without gift card checkout actually paying out to them
yet — anyone reading just the onboarding code without this ADR could
reasonably assume otherwise. Express accounts also mean less control over
the onboarding UI (it's Stripe-hosted) than a Custom account would give,
in exchange for not having to build identity/KYC verification at all.

## Evidence

- `fass-flow-backend/app/routers/stripe_connect.py` (full docstring) —
  states the deliberate decoupling and the webhook-over-redirect trust
  decision explicitly.
- `fass-flow-backend/app/routers/subscriptions.py` — shared webhook
  endpoint also handling `account.updated` events.
- `fass-flow-backend/migrations/business_connect.sql`.
- `fass-flow-frontend/src/pages/Payouts.jsx` — frontend Connect onboarding
  entry point.
