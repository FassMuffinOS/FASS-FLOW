# ADR-0003: Apple Wallet (PassKit) for loyalty cards, gift cards, and credentials

Status: Accepted
Date: 2026-06-29 (written retroactively)

## Context

FASS Flow needed a way for a small business's customers to carry a loyalty
card, a gift card, or a capability credential without that business needing
to build or pay for its own branded app. The realistic alternatives were a
generic third-party punch-card/loyalty app (white-labeled or not), a PWA
add-to-homescreen card, or building Apple Wallet (and eventually Google
Wallet) pass support directly.

## Decision

Build real Apple Wallet `.pkpass` generation and signing in-house
(`app/services/applewallet.py`), under a single Apple Pass Type ID that
covers every pass style FASS Flow issues — stamp/rewards cards, gift cards,
and capability-statement passes all share one signing identity and one
`serial_number` keyspace. A dedicated PassKit Web Service
(`wallet_passkit.py`) implements Apple's 5 device-callback endpoints so a
pass already on a phone can silently re-fetch itself after a stamp,
redemption, or customization, instead of needing a manual re-download.

## Consequences

A customer's loyalty/gift card lives in the wallet app already on their
phone — no separate app to install, no separate login. Push updates (a new
stamp, an updated offer) land on the lock screen the same way a boarding
pass update would. This is also a real differentiator versus generic
loyalty SaaS, since most of those still rely on a branded app or a code in
an email.

The cost: this is Apple-specific. Android users get no equivalent pass
today (Google Wallet has a parallel but separate API that isn't built).
Maintaining the signing certificate (renewal, secure storage in Railway env
vars) is an ongoing operational responsibility that a generic SaaS
integration wouldn't carry. `serial_number` being a single keyspace across
`wallet_passes`, `reward_cards`, and `gift_cards` (chosen because there's
only one Pass Type ID) also means any future second pass *type* needs a
deliberate decision about whether it shares that keyspace or gets its own.

## Evidence

- `fass-flow-backend/app/services/applewallet.py` — `.pkpass` generation,
  signing, `push_auth_token()`.
- `fass-flow-backend/app/routers/wallet_passkit.py` (docstring) — "there's
  only one Apple Pass Type ID covering every pass style... so `_find_pass()`
  just checks each table rather than needing a passTypeIdentifier lookup
  table."
- `fass-flow-backend/app/services/apns.py` — push client for pass updates.
- `fass-flow-backend/migrations/wallet_push.sql`, `rewards_cards.sql`,
  `gift_cards.sql`.
