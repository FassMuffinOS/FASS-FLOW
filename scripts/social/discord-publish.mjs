#!/usr/bin/env node
/**
 * Changelog -> Discord auto-publish.
 *
 * Unlike generate-drafts.mjs (LinkedIn/FB/X/TikTok/Reddit/newsletter — text
 * files only, a human must paste/post manually because those platforms need
 * a logged-in session), this script actually posts. That's safe here
 * because a Discord webhook is a narrow, server-owner-issued endpoint scoped
 * to exactly one channel — not a login, not a session, not a credential
 * that can do anything else. Posting through it is the intended use, the
 * same mechanism GitHub/Sentry/etc. use for their own Discord integrations.
 *
 * Reads public/llms/updates.md, diffs against its own state file to find
 * changelog entries that haven't been posted yet, and sends each as an
 * embed to every configured webhook.
 *
 * Webhook URLs come from environment variables, never committed to the
 * repo:
 *   DISCORD_WEBHOOK_URL            -> e.g. #build-log
 *   DISCORD_ANNOUNCE_WEBHOOK_URL   -> e.g. #announcements (optional, extra)
 *
 * If neither is set, this script logs why and exits 0 — it's a no-op until
 * someone sets up a webhook, so it never breaks the rest of the publish
 * pipeline for repos/forks that haven't configured Discord.
 *
 * Get a webhook URL: Discord server -> the target channel's gear icon ->
 * Integrations -> Webhooks -> New Webhook -> Copy Webhook URL.
 *
 * Usage:
 *   node scripts/social/discord-publish.mjs            # post new entries
 *   node scripts/social/discord-publish.mjs --all       # re-post every entry (careful — spams the channel)
 *   node scripts/social/discord-publish.mjs --dry-run   # show what would be posted, send nothing
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import crypto from 'crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const CHANGELOG_PATH = path.join(REPO_ROOT, 'public', 'llms', 'updates.md');
const STATE_PATH = path.join(__dirname, '.discord-state.json');
const SITE_URL = 'https://flow.fass.systems';
const BRAND_COLOR = 0x4f46e5; // matches the indigo accent used across /updates and the landing page

const args = process.argv.slice(2);
const FORCE_ALL = args.includes('--all');
const DRY_RUN = args.includes('--dry-run');

const WEBHOOKS = [process.env.DISCORD_WEBHOOK_URL, process.env.DISCORD_ANNOUNCE_WEBHOOK_URL].filter(Boolean);

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

function hashEntry(entry) {
  return crypto.createHash('sha1').update(entry.tag + '|' + entry.title + '|' + entry.body).digest('hex').slice(0, 12);
}

function loadState() {
  if (!existsSync(STATE_PATH)) return { posted: {} };
  try {
    return JSON.parse(readFileSync(STATE_PATH, 'utf8'));
  } catch {
    return { posted: {} };
  }
}

function saveState(state) {
  writeFileSync(STATE_PATH, JSON.stringify(state, null, 2) + '\n');
}

function buildEmbed(entry) {
  return {
    title: entry.title,
    description: entry.body,
    url: `${SITE_URL}/updates`,
    color: BRAND_COLOR,
    timestamp: new Date().toISOString(),
    footer: { text: `FASS Flow · ${entry.tag}` },
  };
}

async function postToWebhook(url, entry) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: 'FASS Flow',
      embeds: [buildEmbed(entry)],
    }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Discord webhook returned ${res.status}: ${text}`);
  }
}

async function main() {
  if (WEBHOOKS.length === 0) {
    console.log(
      'No Discord webhook configured (DISCORD_WEBHOOK_URL / DISCORD_ANNOUNCE_WEBHOOK_URL not set) — skipping. ' +
        'See the comment at the top of this file for how to create one.'
    );
    return;
  }

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
  const toPost = [];
  for (const entry of entries) {
    const hash = hashEntry(entry);
    if (FORCE_ALL || !state.posted[hash]) {
      toPost.push({ entry, hash });
    }
  }

  if (toPost.length === 0) {
    console.log('No new changelog entries since last run. Nothing to post to Discord.');
    return;
  }

  for (const { entry, hash } of toPost) {
    if (DRY_RUN) {
      console.log(`[dry-run] would post "${entry.title}" to ${WEBHOOKS.length} webhook(s)`);
      continue;
    }
    for (const url of WEBHOOKS) {
      await postToWebhook(url, entry);
    }
    state.posted[hash] = { title: entry.title, postedAt: new Date().toISOString() };
    console.log(`Posted: ${entry.title}`);
  }

  if (!DRY_RUN) saveState(state);
}

main().catch((err) => {
  console.error('discord-publish failed:', err.message);
  // Non-fatal: a Discord hiccup shouldn't fail the whole publish pipeline
  // (drafts + RSS + sitemap have already been generated by the time this
  // runs). Surface it loudly in CI logs instead.
  process.exitCode = 0;
});
