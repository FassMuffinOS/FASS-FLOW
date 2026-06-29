#!/usr/bin/env node
/**
 * Changelog -> RSS feed generator.
 *
 * Reads public/llms/updates.md (the same source as the /updates page and
 * the social draft generator) and writes a standard RSS 2.0 feed to
 * public/rss.xml. Pure file generation — no login, no platform, nothing to
 * approve. Safe to run automatically on every changelog change.
 *
 * Note: updates.md has no per-entry dates, so every item shares a single
 * <pubDate> (the date this script last ran). That's honest — we don't have
 * real per-entry timestamps to report, and inventing one would violate the
 * site's no-fabricated-data rule. Re-running after a genuine new entry is
 * added will move that entry to the top and refresh the feed-level date.
 *
 * Usage:
 *   node scripts/social/generate-rss.mjs
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const CHANGELOG_PATH = path.join(REPO_ROOT, 'public', 'llms', 'updates.md');
const RSS_PATH = path.join(REPO_ROOT, 'public', 'rss.xml');
const SITE_URL = 'https://flow.fass.systems';

function parseChangelog(md) {
  const re = /^\s*-\s*\*\*(.+?)\*\*\s*\((.+?)\)\s*[—-]\s*(.+)$/;
  return md
    .split('\n')
    .map((l) => l.match(re))
    .filter(Boolean)
    .map((m) => ({ title: m[1].trim(), tag: m[2].trim(), body: m[3].trim() }));
}

function escapeXml(s) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function buildRss(entries) {
  const now = new Date().toUTCString();
  const items = entries
    .map((e) => {
      return `    <item>
      <title>${escapeXml(e.title)}</title>
      <description>${escapeXml(e.body)}</description>
      <category>${escapeXml(e.tag)}</category>
      <link>${SITE_URL}/updates</link>
      <guid isPermaLink="false">${escapeXml(e.tag + '|' + e.title)}</guid>
      <pubDate>${now}</pubDate>
    </item>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<!-- Auto-generated from public/llms/updates.md by scripts/social/generate-rss.mjs.
     Do not edit by hand — edit updates.md instead and regenerate. -->
<rss version="2.0">
  <channel>
    <title>FASS Flow Product Updates</title>
    <link>${SITE_URL}/updates</link>
    <description>A running changelog of real features shipped on FASS Flow.</description>
    <language>en-us</language>
    <lastBuildDate>${now}</lastBuildDate>
${items}
  </channel>
</rss>
`;
}

function main() {
  if (!existsSync(CHANGELOG_PATH)) {
    console.error(`Changelog not found at ${CHANGELOG_PATH}`);
    process.exit(1);
  }
  const md = readFileSync(CHANGELOG_PATH, 'utf8');
  const entries = parseChangelog(md);
  if (entries.length === 0) {
    console.error('No changelog entries parsed — check the bullet format in updates.md.');
    process.exit(1);
  }
  const rss = buildRss(entries);
  writeFileSync(RSS_PATH, rss);
  console.log(`Wrote ${path.relative(REPO_ROOT, RSS_PATH)} with ${entries.length} item(s).`);
}

main();
