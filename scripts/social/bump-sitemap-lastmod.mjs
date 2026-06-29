#!/usr/bin/env node
/**
 * Bumps <lastmod> on the /updates and /releases entries in public/sitemap.xml
 * to today's date whenever the changelog changes. Pure file edit, no
 * fabricated data — the date really is "the day this last changed."
 *
 * Usage:
 *   node scripts/social/bump-sitemap-lastmod.mjs
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const SITEMAP_PATH = path.join(REPO_ROOT, 'public', 'sitemap.xml');

const TARGET_PATHS = ['/updates', '/releases'];

function bumpLastmod(xml, today) {
  let out = xml;
  for (const targetPath of TARGET_PATHS) {
    // Match the <url>...</url> block whose <loc> ends with the target path.
    const blockRe = new RegExp(
      `(<url>\\s*<loc>[^<]*${targetPath.replace('/', '\\/')}</loc>)([\\s\\S]*?)(<\\/url>)`
    );
    const m = out.match(blockRe);
    if (!m) {
      console.warn(`No sitemap <url> block found for ${targetPath} — skipping.`);
      continue;
    }
    let middle = m[2];
    if (/<lastmod>/.test(middle)) {
      middle = middle.replace(/<lastmod>.*?<\/lastmod>/, `<lastmod>${today}</lastmod>`);
    } else {
      // Insert lastmod right after <loc>, before <changefreq>.
      middle = `\n    <lastmod>${today}</lastmod>` + middle;
    }
    out = out.replace(blockRe, `$1${middle}$3`);
  }
  return out;
}

function main() {
  if (!existsSync(SITEMAP_PATH)) {
    console.error(`Sitemap not found at ${SITEMAP_PATH}`);
    process.exit(1);
  }
  const xml = readFileSync(SITEMAP_PATH, 'utf8');
  const today = new Date().toISOString().slice(0, 10);
  const updated = bumpLastmod(xml, today);
  if (updated === xml) {
    console.log('Sitemap lastmod already current or no matching blocks — no change written.');
    return;
  }
  writeFileSync(SITEMAP_PATH, updated);
  console.log(`Updated lastmod to ${today} for: ${TARGET_PATHS.join(', ')}`);
}

main();
