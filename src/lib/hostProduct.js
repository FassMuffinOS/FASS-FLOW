// Single source of truth for "which FASS ecosystem does this hostname
// belong to" — part of the flow./regulars./affiliates.fass.systems
// subdomain rollout (2026-07-01).
//
// Returns null on localhost, a Vercel preview URL, the root fass.systems
// umbrella domain, a white-label tenant's own subdomain/custom domain, or
// any hostname that isn't one of the three recognized subdomains. null
// means "fall back to today's path-based routing" — every call site using
// this treats null as a no-op, so this stays completely inert (current
// production behavior, unchanged) until the DNS records for these
// subdomains actually exist and Vercel is pointed at them.
export function hostProduct() {
  const host = window.location.hostname
  if (host === 'regulars.fass.systems') return 'regulars'
  if (host === 'affiliates.fass.systems') return 'affiliates'
  if (host === 'flow.fass.systems') return 'govcon'
  return null
}

const SUBDOMAIN_BY_PRODUCT = {
  govcon: 'flow.fass.systems',
  regulars: 'regulars.fass.systems',
  affiliates: 'affiliates.fass.systems',
}

// Absolute URL to another FASS ecosystem's path — for links that cross
// subdomains (Regulars' "back to platform" link, an affiliate's referral
// link landing on the right product, etc.). Falls back to a same-origin
// relative path whenever hostProduct() is null, so nothing changes before
// the subdomain cutover — these links work exactly as they do today until
// then.
export function crossDomainUrl(product, path) {
  const host = SUBDOMAIN_BY_PRODUCT[product]
  if (!host || !hostProduct()) return path
  return `https://${host}${path}`
}

// True once we're actually running on one of the three real subdomains —
// callers use this to decide whether a cross-ecosystem link needs to be a
// full <a href> (real navigation, crosses origins) instead of a client-side
// <Link> (same-origin, current behavior).
export function onRealSubdomain() {
  return hostProduct() !== null
}
