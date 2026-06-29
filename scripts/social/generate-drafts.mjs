#!/usr/bin/env node
/**
 * Changelog -> social draft generator.
 *
 * Reads public/llms/updates.md (the canonical changelog mirror, same content
 * shown on /updates), diffs it against a local state file to find entries
 * that haven't had drafts generated yet, and writes ready-to-paste drafts
 * for LinkedIn, Facebook/Instagram, and TikTok to scripts/social/drafts/.
 *
 * This script ONLY generates text files on disk. It never logs into, posts
 * to, or otherwise touches any social platform. A human reviews and pastes
 * each draft in manually (or an assistant stages it in a browser and a
 * human clicks Post) — nothing here auto-publishes anything.
 *
 * Usage:
 *   node scripts/social/generate-drafts.mjs            # generate drafts for new entries
 *   node scripts/social/generate-drafts.mjs --all       # regenerate drafts for every entry
 *   node scripts/social/generate-drafts.mjs --dry-run   # show what would be generated, write nothing
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import crypto from 'crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const CHANGELOG_PATH = path.join(REPO_ROOT, 'public', 'llms', 'updates.md');
const STATE_PATH = path.join(__dirname, '.drafts-state.json');
const DRAFTS_DIR = path.join(__dirname, 'drafts');
const SITE_URL = 'https://flow.fass.systems';

const args = process.argv.slice(2);
const FORCE_ALL = args.includes('--all');
const DRY_RUN = args.includes('--dry-run');

function slugify(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 60);
}

function hashEntry(entry) {
  return crypto.createHash('sha1').update(entry.tag + '|' + entry.title + '|' + entry.body).digest('hex').slice(0, 12);
}

// Parses lines of the form:
// - **Title** (Tag) — Description text.
function parseChangelog(md) {
  const lines = md.split('\n');
  const entries = [];
  const re = /^\s*-\s*\*\*(.+?)\*\*\s*\((.+?)\)\s*[—-]\s*(.+)$/;
  for (const line of lines) {
    const m = line.match(re);
    if (m) {
      entries.push({ title: m[1].trim(), tag: m[2].trim(), body: m[3].trim() });
    }
  }
  return entries;
}

function loadState() {
  if (!existsSync(STATE_PATH)) return { processed: {} };
  try {
    return JSON.parse(readFileSync(STATE_PATH, 'utf8'));
  } catch {
    return { processed: {} };
  }
}

function saveState(state) {
  writeFileSync(STATE_PATH, JSON.stringify(state, null, 2) + '\n');
}

function linkedinDraft(entry) {
  return `We shipped something new on FASS Flow: ${entry.title.toLowerCase()}.

${entry.body}

This is live now for every business using FASS Flow — no waitlist, no "coming soon." Full changelog: ${SITE_URL}/updates

#GovCon #BuildInPublic #SmallBusiness #${entry.tag.replace(/[^A-Za-z0-9]/g, '')}`;
}

function metaCaption(entry) {
  // Shared starting point for Facebook + Instagram (IG skews shorter/punchier).
  return `New on FASS Flow 🚀

${entry.title}

${entry.body}

See everything we've shipped: ${SITE_URL}/updates

#SmallBusiness #GovCon #BuildInPublic`;
}

function tiktokScript(entry) {
  return `[TikTok script — ${entry.title}]

HOOK (0-3s, on screen + voiceover):
"We just added this to FASS Flow..."

BODY (3-20s, screen-record the feature):
"${entry.body}"

CTA (last 3s):
"Link in bio — flow.fass.systems. Full changelog at /updates."

On-screen text overlay suggestion: "${entry.title}"
Tag: ${entry.tag}`;
}

function buildDraftFile(entry, hash) {
  const date = new Date().toISOString().slice(0, 10);
  return `# ${entry.title}

Tag: ${entry.tag} · Generated: ${date} · Entry hash: ${hash}
Source: ${SITE_URL}/updates

---

## LinkedIn

${linkedinDraft(entry)}

---

## Facebook / Instagram

${metaCaption(entry)}

---

## TikTok

${tiktokScript(entry)}

---

Status: DRAFT — not posted anywhere. Review, edit if needed, then post manually
(or hand to Claude to stage in LinkedIn via the Chrome session — it will not
click Post itself).
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

  const state = loadState();
  const toGenerate = [];

  for (const entry of entries) {
    const hash = hashEntry(entry);
    if (FORCE_ALL || !state.processed[hash]) {
      toGenerate.push({ entry, hash });
    }
  }

  if (toGenerate.length === 0) {
    console.log('No new changelog entries since last run. Nothing to generate.');
    return;
  }

  if (!DRY_RUN) mkdirSync(DRAFTS_DIR, { recursive: true });

  const written = [];
  for (const { entry, hash } of toGenerate) {
    const filename = `${slugify(entry.title)}-${hash}.md`;
    const filepath = path.join(DRAFTS_DIR, filename);
    const content = buildDraftFile(entry, hash);

    if (DRY_RUN) {
      console.log(`[dry-run] would write ${filepath}`);
    } else {
      writeFileSync(filepath, content);
      state.processed[hash] = { title: entry.title, generatedAt: new Date().toISOString(), file: filename };
      written.push(filepath);
    }
  }

  if (!DRY_RUN) {
    saveState(state);
    console.log(`Generated ${written.length} draft(s):`);
    written.forEach((f) => console.log(' -', path.relative(REPO_ROOT, f)));
  }
}

main();
