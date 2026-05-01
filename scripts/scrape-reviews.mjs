#!/usr/bin/env node
// Refreshes src/reviews.json from the OwnerRez v2 API.
// Runs at build time in CI; also runnable locally with env vars.
//
// Required env vars:
//   OWNERREZ_EMAIL  — your OwnerRez login email
//   OWNERREZ_PAT    — Personal Access Token (starts with pt_)
// Optional:
//   OWNERREZ_PROPERTY_ID — defaults to 411874 (Chillax Creeks)
//
// Usage:  OWNERREZ_EMAIL=… OWNERREZ_PAT=… node scripts/scrape-reviews.mjs

import { writeFile } from 'node:fs/promises';

const EMAIL = process.env.OWNERREZ_EMAIL;
const PAT = process.env.OWNERREZ_PAT;
const PROPERTY_ID = process.env.OWNERREZ_PROPERTY_ID || '411874';
const OUT_PATH = new URL('../src/reviews.json', import.meta.url);

if (!EMAIL || !PAT) {
  console.error('Missing OWNERREZ_EMAIL or OWNERREZ_PAT — keeping existing reviews.json.');
  process.exit(0);
}

const auth = 'Basic ' + Buffer.from(`${EMAIL}:${PAT}`).toString('base64');

async function fetchPage(offset = 0, limit = 100) {
  const url = new URL('https://api.ownerrez.com/v2/reviews');
  url.searchParams.set('property_id', PROPERTY_ID);
  url.searchParams.set('host_review', 'false');
  url.searchParams.set('active', 'true');
  url.searchParams.set('include_guest', 'true');
  url.searchParams.set('limit', String(limit));
  url.searchParams.set('offset', String(offset));

  const res = await fetch(url, {
    headers: { Authorization: auth, Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`OwnerRez ${res.status}: ${await res.text()}`);
  return res.json();
}

async function fetchAll() {
  const all = [];
  let offset = 0;
  const limit = 100;
  while (true) {
    const page = await fetchPage(offset, limit);
    const items = page.items ?? [];
    all.push(...items);
    if (items.length < limit) break;
    offset += limit;
  }
  return all;
}

const items = await fetchAll();

const reviews = items
  .map((r) => ({
    name: r.guest?.first_name || 'Guest',
    date: (r.date || r.created_utc || '').slice(0, 10),
    text: (r.body || '').replace(/\s+/g, ' ').trim(),
    stars: r.stars,
    source: r.listing_site || 'OwnerRez',
  }))
  .filter((r) => r.text.length > 0)
  .sort((a, b) => b.date.localeCompare(a.date));

const total = reviews.length;
const ratingAvg =
  total > 0
    ? Math.round((reviews.reduce((s, r) => s + (r.stars || 0), 0) / total) * 100) / 100
    : 0;

const out = {
  aggregate: { rating: ratingAvg, count: total },
  reviews,
};

await writeFile(OUT_PATH, JSON.stringify(out, null, 2) + '\n');
console.log(`Wrote ${total} reviews to src/reviews.json (avg ${ratingAvg}★).`);
