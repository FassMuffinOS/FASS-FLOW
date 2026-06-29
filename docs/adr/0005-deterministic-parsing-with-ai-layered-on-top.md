# ADR-0005: Deterministic regex as source of truth; AI layered on top for judgment + generation

Status: Accepted
Date: 2026-06-29 (written retroactively)

## Context

FASS FILL needs to read a government solicitation and produce a compliance
matrix (due date, page limit, submission method, requirements) and a draft
proposal section. The easy version of this is "send the document to an
LLM and take whatever comes back." That's also the version where a
hallucinated due date silently costs a small business a contract.

## Decision

The compliance matrix's deterministic fields (due date, page limit,
submission method) are extracted by regex
(`solicitationParser.js` on the frontend) and treated as the source of
truth — zero API key, zero latency, zero marginal cost, works on every
paste with no LLM dependency at all. The LLM is layered on top only for
the two things regex genuinely can't do: judgment calls (flagging ambiguous
or missing requirements, summarizing intent, calling out risks a
first-time bidder would miss) and generation grounded in the business's
own past-performance record via retrieval (RAG), not invented experience.
Where the LLM also extracts a deterministic field as a byproduct, that
extraction is tagged as a fallback and never overrides the regex value.

## Consequences

The product works (compliance matrix, deadline tracking) even if the LLM
provider is down, rate-limited, or the user has no AI quota left — degraded
mode is "no AI insights," not "no product." It also means deterministic
fields can be trusted for anything safety-critical (deadline reminders,
pipeline due dates) without an LLM hallucination risk in that path.

The cost is real engineering investment in regex parsing that an
all-LLM approach would have skipped — `solicitationParser.js` has to be
maintained and extended as new solicitation formats show up, work an LLM
would have absorbed for free (at the cost of trust).

## Evidence

- `fass-flow-backend/app/routers/ai.py` (full docstring) — states this
  layering explicitly: "a contractor shouldn't need an LLM call just to
  find a due date in a PDF" and "a hallucinated date is worse than no
  date."
- `fass-flow-frontend/src/lib/solicitationParser.js` — the regex layer.
- `fass-flow-backend/app/services/retrieval.py` — RAG grounding for
  `/draft-section`.
- `fass-flow-backend/app/services/quota.py` — AI quota gating, confirming
  AI is treated as an opt-in upgrade, not the base product.
