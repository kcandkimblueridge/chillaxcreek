#!/usr/bin/env node
// Refreshes src/reviews.json with the latest reviews from the Airbnb listing.
// Run periodically (manually or via a scheduled GitHub Action) to keep the
// homepage reviews fresh. The committed JSON is what the site builds against.
//
// Usage:  node scripts/scrape-reviews.mjs
//
// Requires Node 22+ (uses native fetch).

import { writeFile } from 'node:fs/promises';

const LISTING_URL =
  'https://www.airbnb.com/rooms/974620110074586016';
const OUT_PATH = new URL('../src/reviews.json', import.meta.url);

const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

async function main() {
  const res = await fetch(LISTING_URL, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`Airbnb returned ${res.status}`);
  const html = await res.text();

  // Pull rating + count from JSON-LD VacationRental block
  const ldMatches = html.match(
    /<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g
  );
  let aggregate = null;
  for (const block of ldMatches ?? []) {
    const inner = block.replace(/<[^>]+>/g, '');
    try {
      const data = JSON.parse(inner);
      if (data['@type'] === 'VacationRental' && data.aggregateRating) {
        aggregate = {
          rating: Number(data.aggregateRating.ratingValue),
          count: Number(data.aggregateRating.reviewCount ?? 0),
        };
        break;
      }
    } catch {}
  }

  // Pull individual reviews from the deferred client state.
  // Airbnb's PDP only returns a limited set in-page (~6); for more,
  // we'd need their GraphQL API which requires a session token.
  const stateMatch = html.match(
    /<script id="data-deferred-state-0"[^>]*>([\s\S]*?)<\/script>/
  );
  const reviews = [];
  if (stateMatch) {
    const state = JSON.parse(decodeHtml(stateMatch[1]));
    walk(state, (key, val) => {
      if (
        typeof val === 'object' &&
        val !== null &&
        typeof val.comments === 'string' &&
        val.comments.length > 30 &&
        val.reviewer
      ) {
        reviews.push({
          name: val.reviewer.firstName ?? val.reviewer.host?.smartName ?? 'Guest',
          date: val.localizedDate ?? val.createdAt ?? '',
          text: val.comments.replace(/\s+/g, ' ').trim(),
        });
      }
    });
  }

  // De-dupe by (name, date, first 40 chars of text)
  const seen = new Set();
  const deduped = reviews.filter((r) => {
    const k = `${r.name}|${r.date}|${r.text.slice(0, 40)}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  const out = { aggregate, reviews: deduped };
  await writeFile(OUT_PATH, JSON.stringify(deduped.length ? deduped : await loadFallback(), null, 2));
  console.log(
    `Scraped ${deduped.length} reviews. Aggregate: ${aggregate?.rating ?? '?'} (${aggregate?.count ?? '?'})`
  );
  if (!deduped.length) {
    console.log('Airbnb returned no inline reviews — kept existing src/reviews.json.');
  }
}

function walk(obj, fn, key = null) {
  if (obj === null || typeof obj !== 'object') return;
  fn(key, obj);
  for (const k in obj) walk(obj[k], fn, k);
}

function decodeHtml(s) {
  return s
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

async function loadFallback() {
  const { readFile } = await import('node:fs/promises');
  try {
    return JSON.parse(await readFile(OUT_PATH, 'utf8'));
  } catch {
    return [];
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
