#!/usr/bin/env node
/**
 * One-command "ship -> publicize" pipeline. Runs the full chain of file
 * generation that should happen any time public/llms/updates.md gets a new
 * real, shipped entry:
 *
 *   updates.md changes
 *       |
 *       +-- generate-drafts.mjs     -> scripts/social/drafts/*.md
 *       |                              (LinkedIn, FB/IG, X, TikTok, Reddit,
 *       |                               newsletter — DRAFTS ONLY, nothing
 *       |                               here ever logs into or posts to a
 *       |                               platform)
 *       +-- discord-publish.mjs     -> actually posts to Discord via webhook
 *       |                              (no login/session involved, see that
 *       |                               file's header — no-op until a
 *       |                               webhook env var is configured)
 *       +-- generate-rss.mjs        -> public/rss.xml
 *       +-- bump-sitemap-lastmod.mjs -> public/sitemap.xml (lastmod only)
 *
 * The /updates page itself and the llms.txt markdown mirror are already
 * sourced live from updates.md, so they need no separate build step.
 *
 * This script only writes files. It is the single entrypoint used by both
 * the weekly scheduled task and the GitHub Action — running it twice with
 * no new changelog entries is a safe no-op for the draft generator (it
 * tracks state) and a cheap rebuild for RSS/sitemap.
 *
 * Usage:
 *   node scripts/social/publish.mjs
 */

import { fileURLToPath } from 'url';
import path from 'path';
import { spawnSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const steps = [
  ['Generating social drafts', 'generate-drafts.mjs'],
  ['Posting to Discord (no-op if no webhook configured)', 'discord-publish.mjs'],
  ['Generating RSS feed', 'generate-rss.mjs'],
  ['Bumping sitemap lastmod', 'bump-sitemap-lastmod.mjs'],
];

let failed = false;
for (const [label, script] of steps) {
  console.log(`\n--- ${label} (${script}) ---`);
  const res = spawnSync(process.execPath, [path.join(__dirname, script)], {
    stdio: 'inherit',
  });
  if (res.status !== 0) {
    console.error(`Step failed: ${script} (exit ${res.status})`);
    failed = true;
  }
}

if (failed) {
  console.error('\nOne or more publish steps failed — see output above.');
  process.exit(1);
}

console.log('\nDone. New social copy (if any) is in scripts/social/drafts/ — review before posting.');
console.log('public/rss.xml and public/sitemap.xml are updated and ready to commit.');
