# FASS Flow

## What FASS Flow is

FASS Flow is a federal contracting workflow tool for small businesses pursuing
government work. It covers the path from finding an opportunity to deciding
whether to bid, organizing the pipeline, and drafting a compliant proposal.

## Live URL

https://flow.fass.systems (custom domain, aliased from the Vercel deployment
at fass-flow-frontend.vercel.app)

## Tech stack

- **Frontend:** React 19 + Vite 8, React Router 7, plain CSS (no UI framework)
- **Auth / data:** Supabase (Postgres + Auth + Row Level Security)
- **Backend:** FastAPI service (see
  [FassMuffinOS/FASS-FLOW-BACKEND](https://github.com/FassMuffinOS/FASS-FLOW-BACKEND)),
  deployed on Railway, proxies the live SAM.gov opportunities feed and AI
  endpoints. Set via `VITE_API_URL`.
- **Payments:** Stripe — Payment Links for Masterclass/BD Partner, plus a
  Checkout + customer-portal flow and a webhook handler in the backend for
  tiered subscriptions (lite/starter/pro/team)
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
| `VITE_API_URL` | Yes in production | Base URL of the deployed FASS Flow backend (Railway). Powers WARDOG's live SAM.gov proxy, R-E-A-D's AI synthesis, and subscription checkout. Without it, WARDOG falls back to bundled sample data and AI features no-op. |

No secret/service-role keys belong in this frontend. Anything with write
access beyond RLS policies stays server-side.

## What is real now

- Public landing page, pricing, and marketing pages
- Stripe Masterclass payment link with PDF workbook delivery
- Stripe BD Partner $500/month subscription link, plus a tiered Checkout +
  customer-portal flow (lite/starter/pro/team) backed by a Stripe webhook
  handler in the backend
- Supabase authentication (sign in, session handling)
- Protected dashboard, gated by an authenticated Supabase session, with a
  data-driven "Get started" cold-start flow and a free-tier nav lock
- Profiles, opportunities, and proposals data model with Row Level Security
- **WARDOG**: live SAM.gov opportunity search via the backend proxy at
  `VITE_API_URL`. Falls back to bundled sample data only if the backend is
  unreachable or returns 503 (no SAM.gov key configured on that deploy) —
  the UI labels this fallback explicitly when it's active.
- **R-E-A-D**: bid/no-bid scoring workflow, with real opportunity context
  (title/agency/NAICS/due date) carried over from WARDOG and an optional
  AI-generated synthesis per section grounded in the actual solicitation text
- **Pipeline**: proposals created by WARDOG/R-E-A-D land here as one record
  per opportunity (joined via `opportunities.id` / `proposals.opportunity_id`)
- **FASS FILL**: regex-based compliance-matrix parsing, plus an optional
  AI-assisted analysis/draft layer via the backend

## What is demo/mock now

- WARDOG's sample-data fallback (see above) — only active when the backend
  is unreachable or has no SAM.gov key configured for that environment.
- Some of the deeper execution tools (Witness, Foreman, Restoration,
  Estimator, Network) are functionally complete but lower-traffic; expect
  rougher edges than the core Find → Qualify → Respond path.

## Current roadmap

- Backfill `opportunities` rows for any proposals created before that table
  existed, so historical funnel data is fully accurate (current code floors
  the "sourced" count at the proposal count as a safety net)
- Expand AI synthesis coverage and run the backend eval harness against a
  larger gold set
- Continue tightening accessibility (aria-labels, alt text) and mobile
  breakpoints on lower-traffic pages (Sign In, Witness, Classroom, Admin)
