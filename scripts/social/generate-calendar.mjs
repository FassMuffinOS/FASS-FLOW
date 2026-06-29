#!/usr/bin/env node
/**
 * Multi-lane weekly content calendar generator.
 *
 * Cadence (per day):
 *   - LinkedIn (FASS Technologies LLC Company Page): 1 post/day
 *   - Facebook (Maurice Nobles personal page, facebook.com/maurice.nobles.9): 3 posts/day
 *   - Instagram (munchiesgourmets, 38.4K followers, cross-promo lane): 2 posts/day
 *
 * 19 changelog entries cannot sustain 6 posts/day on their own, so this
 * mixes changelog-driven copy with evergreen content pillars:
 *   - changelog: a shipped feature, straight from public/llms/updates.md
 *   - build:     behind-the-build / process / founder POV, no changelog needed
 *   - engage:    question / opinion / poll-style post to drive comments
 *   - usecase:   a FASS Flow capability reframed for a food/retail business
 *                (used for the munchiesgourmets lane specifically)
 *
 * This script only WRITES TEXT FILES. It never logs into or posts to any
 * platform. Output is one markdown calendar file per run, meant to be
 * reviewed and pasted/staged manually.
 *
 * Usage:
 *   node scripts/social/generate-calendar.mjs              # next 7 days, starting tomorrow
 *   node scripts/social/generate-calendar.mjs --days=14
 *   node scripts/social/generate-calendar.mjs --start=2026-06-30
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const CHANGELOG_PATH = path.join(REPO_ROOT, 'public', 'llms', 'updates.md');
const CALENDAR_DIR = path.join(__dirname, 'calendar');
const SITE_URL = 'https://flow.fass.systems';

const args = process.argv.slice(2);
function argVal(name, fallback) {
  const hit = args.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.split('=')[1] : fallback;
}
const DAYS = parseInt(argVal('days', '7'), 10);
const START = argVal('start', null);

function parseChangelog(md) {
  const re = /^\s*-\s*\*\*(.+?)\*\*\s*\((.+?)\)\s*[—-]\s*(.+)$/;
  return md
    .split('\n')
    .map((l) => l.match(re))
    .filter(Boolean)
    .map((m) => ({ title: m[1].trim(), tag: m[2].trim(), body: m[3].trim() }));
}

// --- Evergreen pillar templates (no changelog dependency) ---------------

const BUILD_POSTS = [
  `Spent today heads-down on FASS Flow instead of talking about it. That's the actual job most days — not the highlight reel, just shipping the next real thing.`,
  `Every feature on FASS Flow exists because a real small business or GovCon shop hit a wall first. We don't build features looking for a problem.`,
  `Unpopular opinion: most "AI-powered" software tools are a chatbot bolted onto a spreadsheet. We've tried to make ours actually do the work — scoring, drafting, summarizing — not just talk about it.`,
  `Building FASS Flow in public means the wins and the slow weeks both show up. This week was a shipping week. Check /updates for the receipts.`,
  `If you're a small business owner reading this: what's the one tool you wish existed but doesn't? Building the list.`,
];

const ENGAGE_POSTS = [
  `Question for small business owners: what's eating the most hours in your week right now — sales, ops, or just keeping the lights on? Curious what's actually the bottleneck out there.`,
  `Hot take: most CRMs are built for sales teams of 20, not founders doing everything themselves. Agree or disagree?`,
  `If you could automate one part of running your business tomorrow, what would it be?`,
  `Tag a small business owner who needs to see this — building something for exactly that person.`,
];

const USE_CASES = [
  {
    title: 'Digital stamp cards',
    body: `Loyalty cards that live in your customer's Apple Wallet — no app, no punch card to lose. Tap to join, staff redeems from a phone. This is exactly the kind of thing a food brand like mine could run at every pop-up.`,
  },
  {
    title: 'Gift cards with real Apple Wallet delivery',
    body: `Sell a gift card, it shows up as an actual Apple Wallet pass — not a code in an email people forget about. Built-in storefront, no extra app needed.`,
  },
  {
    title: 'Push offers straight to a customer\'s wallet pass',
    body: `Send a "today only" offer directly to a pass that's already sitting in someone's phone. That's a re-engagement channel most small food/retail brands don't have at all.`,
  },
];

// --- Slot builders --------------------------------------------------------

function linkedinPost(entry) {
  return `We shipped something new on FASS Flow: ${entry.title.toLowerCase()}.

${entry.body}

Live now — no waitlist. Full changelog: ${SITE_URL}/updates

#GovCon #BuildInPublic #SmallBusiness #${entry.tag.replace(/[^A-Za-z0-9]/g, '')}`;
}

function fbChangelogPost(entry) {
  return `New on FASS Flow: ${entry.title}.

${entry.body}

${SITE_URL}/updates`;
}

function fbBuildPost(i) {
  return BUILD_POSTS[i % BUILD_POSTS.length];
}

function fbEngagePost(i) {
  return ENGAGE_POSTS[i % ENGAGE_POSTS.length];
}

function munchiesUseCasePost(i) {
  const u = USE_CASES[i % USE_CASES.length];
  return `Real talk — if your food/retail brand isn't doing this yet, you're leaving money on the table:

${u.title}

${u.body}

This is on FASS Flow (@flow.fass.systems link in bio) — the platform I'm building with. Built for small businesses, not enterprise bloat.`;
}

function munchiesChangelogPost(entry) {
  return `Behind the scenes: the platform I run my business stuff through (FASS Flow) just shipped — ${entry.title}.

${entry.body}

Worth a look if you run a small business: flow.fass.systems`;
}

// --- Calendar assembly -----------------------------------------------------

function dateAt(offsetDays) {
  const base = START ? new Date(START + 'T00:00:00') : new Date();
  const d = new Date(base);
  if (!START) d.setDate(d.getDate() + 1); // default: start tomorrow
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

function buildCalendar() {
  const md = readFileSync(CHANGELOG_PATH, 'utf8');
  const entries = parseChangelog(md);
  if (entries.length === 0) throw new Error('No changelog entries parsed from updates.md');

  let liIdx = 0, fbChangelogIdx = 0, muIdx = 0;
  const days = [];

  for (let d = 0; d < DAYS; d++) {
    const date = dateAt(d);

    // LinkedIn: 1/day, cycles through changelog entries
    const liEntry = entries[liIdx % entries.length]; liIdx++;
    const linkedin = [{ slot: 1, copy: linkedinPost(liEntry) }];

    // Facebook (Maurice personal): 3/day — changelog, build, engage
    const fbEntry = entries[fbChangelogIdx % entries.length]; fbChangelogIdx++;
    const facebook = [
      { slot: 1, label: 'changelog', copy: fbChangelogPost(fbEntry) },
      { slot: 2, label: 'build-in-public', copy: fbBuildPost(d) },
      { slot: 3, label: 'engagement', copy: fbEngagePost(d) },
    ];

    // munchiesgourmets IG: 2/day — alternate use-case framing and changelog cross-post
    const muEntry = entries[muIdx % entries.length]; muIdx++;
    const munchies = [
      { slot: 1, label: 'use-case', copy: munchiesUseCasePost(d) },
      { slot: 2, label: 'changelog-crosspost', copy: munchiesChangelogPost(muEntry) },
    ];

    days.push({ date, linkedin, facebook, munchies });
  }
  return days;
}

function renderMarkdown(days) {
  let out = `# Social Content Calendar\n\nGenerated: ${new Date().toISOString().slice(0, 10)}\nCovers: ${days[0].date} -> ${days[days.length - 1].date}\n\nCadence: LinkedIn 1/day (FASS Technologies LLC Company Page) · Facebook 3/day (Maurice Nobles personal page) · Instagram 2/day (@munchiesgourmets cross-promo)\n\nStatus: ALL DRAFTS. Nothing here has been posted. Review and edit before use.\n\n---\n\n`;

  for (const day of days) {
    out += `## ${day.date}\n\n`;

    out += `### LinkedIn (1 post)\n\n`;
    day.linkedin.forEach((p) => { out += `${p.copy}\n\n`; });

    out += `### Facebook — Maurice Nobles personal page (3 posts)\n\n`;
    day.facebook.forEach((p) => { out += `**Slot ${p.slot} (${p.label}):**\n\n${p.copy}\n\n`; });

    out += `### Instagram — @munchiesgourmets cross-promo (2 posts)\n\n`;
    day.munchies.forEach((p) => { out += `**Slot ${p.slot} (${p.label}):**\n\n${p.copy}\n\n`; });

    out += `---\n\n`;
  }
  return out;
}

function main() {
  const days = buildCalendar();
  const md = renderMarkdown(days);
  mkdirSync(CALENDAR_DIR, { recursive: true });
  const filename = `week-${days[0].date}.md`;
  const filepath = path.join(CALENDAR_DIR, filename);
  writeFileSync(filepath, md);
  console.log(`Generated calendar: ${path.relative(REPO_ROOT, filepath)}`);
  console.log(`${days.length} days x 6 posts/day = ${days.length * 6} drafts (1 LinkedIn + 3 FB + 2 IG)`);
}

main();
