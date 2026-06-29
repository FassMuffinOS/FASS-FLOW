# ADR-0009: Social/marketing publishing is draft-generation only — no automated posting

Status: Accepted
Date: 2026-06-29 (written retroactively)

## Context

FASS Flow ships real features often enough that a changelog entry could
plausibly drive a daily multi-platform marketing cadence (LinkedIn,
Facebook, Instagram, X, TikTok, Reddit, newsletter). The tempting version
of this automation logs into each platform and posts directly. That also
means a bug, a bad regex match, or a malformed changelog entry could post
something embarrassing or wrong to a public account with no human ever
having seen it first — and once it's posted, it's out.

## Decision

Every piece of this automation (`scripts/social/generate-drafts.mjs`,
`generate-calendar.mjs`, `publish.mjs`, and the
`changelog-marketing.yml` GitHub Action that runs them) only ever writes
text files to disk. Nothing in this pipeline logs into, authenticates
with, or posts to any social platform. A human reviews each generated
draft and posts it manually, or hands it to an assistant to stage in an
already-logged-in browser session — and even then, the assistant does not
click Post/Submit/Send itself.

## Consequences

The worst failure mode of a bug in this pipeline is "a draft file has bad
copy in it," reviewed and caught before it's ever public — not "something
wrong is now live on a real account." This also means the automation can
run unattended (the GitHub Action, the weekly scheduled task) without
needing stored platform credentials anywhere in CI or this repo, which
removes an entire category of credential-leak risk.

The cost: this is fundamentally not a "set and forget" growth engine — a
human still has to read and post every draft, every day, across every
platform in the cadence (Facebook 3/day, LinkedIn 1/day, the
munchiesgourmets cross-promo lane 2/day). The throughput ceiling of this
system is bounded by review/posting time, not generation time.

## Evidence

- `fass-flow-frontend/scripts/social/generate-drafts.mjs` (docstring) —
  "This script ONLY generates text files on disk. It never logs into,
  posts to, or otherwise touches any social platform."
- `fass-flow-frontend/scripts/social/publish.mjs`,
  `generate-calendar.mjs` — same constraint, restated per script.
- `fass-flow-frontend/.github/workflows/changelog-marketing.yml` — the
  automated trigger; commits generated files, never posts.
- `fass-flow-frontend/scripts/social/drafts/*.md` — every file ends with
  `Status: DRAFT — not posted anywhere.`
