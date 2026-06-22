# FASS Flow

## What FASS Flow is

FASS Flow is a federal contracting workflow tool for small businesses pursuing
government work. It covers the path from finding an opportunity to deciding
whether to bid, organizing the pipeline, and drafting a compliant proposal.

## Live URL

The current production deployment is on Vercel. (Add the exact production
domain here once confirmed.)

## Tech stack

- **Frontend:** React 19 + Vite, React Router, plain CSS (no UI framework)
- **Auth / data:** Supabase (Postgres + Auth + Row Level Security)
- **Payments:** Stripe Payment Links (no custom checkout code, no webhook
  handling in this repo)
- **Hosting:** Vercel (static SPA build)

## Local setup

```bash
npm install
cp .env.example .env   # then fill in real values, see below
npm run dev
```

Build for production:

```bash
npm run build
npm run preview
```

## Required environment variables

See `.env.example` for the full list. Summary:

| Variable | Required | Purpose |
|---|---|---|
| `VITE_SUPABASE_URL` | Yes | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Yes | Supabase anon/public key (safe for client use) |
| `VITE_API_URL` | No | Base URL for an optional AI backend (see Roadmap). Leave blank to hide AI features entirely. |

No secret/service-role keys belong in this frontend. Anything with write
access beyond RLS policies stays server-side.

## What is real now

- Public landing page, pricing, and marketing pages
- Stripe Masterclass payment link with PDF workbook delivery
- Stripe BD Partner $500/month subscription link
- Supabase authentication (sign in, session handling)
- Protected dashboard, gated by an authenticated Supabase session
- Profiles, opportunities, and proposals data model with Row Level Security
- R-E-A-D bid/no-bid scoring workflow

## What is demo/mock now

- **WARDOG** (opportunity intelligence feed): UI is built and wired into the
  dashboard, but it is currently running on demo/sample data, not a live
  SAM.gov or eMMA feed.
- **Pipeline**: UI concept (Kanban/List view) — not yet connected to live
  opportunity data end-to-end.
- **FASS FILL** (solicitation parsing → compliance matrix): regex-based
  parsing is real; an optional AI-assisted analysis/draft layer exists in a
  separate backend project but is not deployed or connected to production.

## Current roadmap

- Connect WARDOG to a live SAM.gov / eMMA data source
- Wire Pipeline to real opportunity/proposal records
- Decide on and deploy a hosting platform for the FASS FILL AI backend, then
  wire `VITE_API_URL` in production
- Add Stripe webhook handling for subscription lifecycle events (not yet
  built — BD Partner billing currently relies on the Stripe-hosted payment
  link only)
