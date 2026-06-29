import { useEffect } from 'react'

const SITE_URL = 'https://flow.fass.systems'
const DEFAULT_IMAGE = `${SITE_URL}/favicon.svg`

function setMeta(attr, key, content) {
  if (!content) return
  let el = document.head.querySelector(`meta[${attr}="${key}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

function setLink(rel, href) {
  if (!href) return
  let el = document.head.querySelector(`link[rel="${rel}"]`)
  if (!el) {
    el = document.createElement('link')
    el.setAttribute('rel', rel)
    document.head.appendChild(el)
  }
  el.setAttribute('href', href)
}

function setJsonLd(id, data) {
  let el = document.getElementById(id)
  if (!data) {
    if (el) el.remove()
    return
  }
  if (!el) {
    el = document.createElement('script')
    el.id = id
    el.type = 'application/ld+json'
    document.head.appendChild(el)
  }
  el.textContent = JSON.stringify(data)
}

// Lightweight, dependency-free per-page SEO. We don't have server-side
// rendering here (plain Vite SPA), so this only helps crawlers that execute
// JS (Google does; most AI crawlers don't reliably) — the real fallback for
// non-JS crawlers is the static markdown mirrors under /llms/*.md, linked
// via the `markdownUrl` option below.
//
// Usage: useSeo({ title, description, path: '/about', markdownUrl: '/llms/about.md', jsonLd })
export default function useSeo({ title, description, path = '/', markdownUrl, jsonLd } = {}) {
  useEffect(() => {
    const fullTitle = title ? `${title} | FASS Flow` : 'FASS Flow'
    document.title = fullTitle

    setMeta('name', 'description', description)
    setMeta('property', 'og:title', fullTitle)
    setMeta('property', 'og:description', description)
    setMeta('property', 'og:type', 'website')
    setMeta('property', 'og:url', `${SITE_URL}${path}`)
    setMeta('property', 'og:image', DEFAULT_IMAGE)
    setMeta('name', 'twitter:card', 'summary')
    setMeta('name', 'twitter:title', fullTitle)
    setMeta('name', 'twitter:description', description)

    setLink('canonical', `${SITE_URL}${path}`)
    if (markdownUrl) {
      setLink('alternate', `${SITE_URL}${markdownUrl}`)
      const el = document.head.querySelector('link[rel="alternate"]')
      if (el) el.setAttribute('type', 'text/markdown')
    }

    setJsonLd('page-jsonld', jsonLd)

    return () => {
      setJsonLd('page-jsonld', null)
    }
  }, [title, description, path, markdownUrl, jsonLd])
}
