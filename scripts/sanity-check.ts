#!/usr/bin/env npx tsx
/**
 * Structural sanity checks for canon editions.
 * Run after bulk entry to verify internal coherence.
 * Exits 0 on success, 1 if issues found.
 */
import { readFileSync, readdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const EDITIONS_DIR = join(ROOT, 'editions');
const SCHEMA_DIR = join(ROOT, 'schema');

// Mutually exclusive cut tags (shouldn't appear together on same edition)
const CONFLICTING_TAG_SETS = [
  ['director_cut', 'theatrical'],
  ['director_cut', 'extended'],
  ['theatrical', 'extended'],
  ['final_cut', 'theatrical'],
];

interface Edition {
  movie?: { tmdb_movie_id?: number };
  release_year?: number;
  publisher?: string;
  packaging?: { type?: string };
  discs?: Array<{ format?: string; disc_count?: number; region?: string }>;
  upc?: string;
  edition_tags?: string[];
  [key: string]: unknown;
}

function loadEditions(): Map<string, Edition> {
  const editions = new Map<string, Edition>();
  if (!existsSync(EDITIONS_DIR)) return editions;
  for (const f of readdirSync(EDITIONS_DIR)) {
    if (!f.endsWith('.json')) continue;
    const hash = f.replace('.json', '');
    const path = join(EDITIONS_DIR, f);
    try {
      const raw = JSON.parse(readFileSync(path, 'utf-8'));
      editions.set(hash, raw);
    } catch (e) {
      console.error(`  ERROR: ${f} - invalid JSON:`, e);
    }
  }
  return editions;
}

function loadSchema<T>(name: string): T {
  const path = join(SCHEMA_DIR, `${name}.json`);
  return JSON.parse(readFileSync(path, 'utf-8')) as T;
}

function main(): number {
  const editions = loadEditions();
  let failed = false;

  const publishers = loadSchema<{ publisher_id: string }[]>('publishers');
  const publisherIds = new Set(publishers.map((p) => p.publisher_id));
  const editionTags = loadSchema<{ tag_id: string }[]>('edition_tags');
  const tagIds = new Set(editionTags.map((t) => t.tag_id));
  const regions = loadSchema<{ canonical: string[] }>('regions');
  const canonicalRegions = new Set(regions.canonical);

  console.log('\n=== Canon Structural Sanity Check ===\n');
  console.log(`Editions: ${editions.size}\n`);

  // 1. Publisher release_year clusters (report, don't fail)
  const byPublisher = new Map<string, number[]>();
  for (const [, e] of editions) {
    const p = e.publisher ?? 'unknown';
    if (!byPublisher.has(p)) byPublisher.set(p, []);
    if (e.release_year != null) byPublisher.get(p)!.push(e.release_year);
  }
  console.log('1. Publisher release_year distribution:');
  for (const [p, years] of byPublisher) {
    const min = Math.min(...years);
    const max = Math.max(...years);
    const span = max - min;
    const flag = span > 50 ? ' ⚠️  wide span' : '';
    console.log(`   ${p}: ${years.length} editions, ${min}–${max}${flag}`);
  }
  console.log('');

  // 2. Disc region consistency
  // Note: FREE + A on same edition is valid (combo packs: UHD region-free, BD region-locked)
  console.log('2. Disc region consistency:');
  let regionIssues = 0;
  for (const [hash, e] of editions) {
    const discs = e.discs ?? [];
    if (discs.length === 0) {
      console.log(`   ⚠️  ${hash.slice(0, 12)}... has no discs`);
      regionIssues++;
      failed = true;
      continue;
    }
    const regionsInEdition = new Set(discs.map((d) => d.region).filter(Boolean));
    if (regionsInEdition.size > 1) {
      const hasFree = regionsInEdition.has('FREE') || regionsInEdition.has('ABC');
      const hasLocked = [...regionsInEdition].some((r) =>
        ['A', 'B', 'C', '1', '2'].includes(r ?? '')
      );
      if (hasFree && hasLocked) {
        // Combo packs often have FREE UHD + locked BD — informational only
        console.log(
          `   ℹ️  ${hash.slice(0, 12)}... mixed FREE + locked: ${[...regionsInEdition].join(', ')} (combo pack?)`
        );
      }
    }
    for (const d of discs) {
      const r = d.region;
      if (r && !canonicalRegions.has(r)) {
        console.log(`   ⚠️  ${hash.slice(0, 12)}... non-canonical region: "${r}"`);
        regionIssues++;
        failed = true;
      }
    }
  }
  if (regionIssues === 0) console.log('   OK: no region inconsistencies');
  console.log('');

  // 3. Editions without discs
  const noDiscs = [...editions.entries()].filter(([, e]) => !e.discs || e.discs.length === 0);
  if (noDiscs.length > 0) {
    console.log('3. Editions lacking discs:');
    for (const [hash] of noDiscs) console.log(`   ${hash.slice(0, 12)}...`);
    failed = true;
  } else {
    console.log('3. Editions lacking discs: OK (none)');
  }
  console.log('');

  // 4. Redundant/conflicting tags
  console.log('4. Tag conflicts (e.g. director_cut + theatrical):');
  let tagConflicts = 0;
  for (const [hash, e] of editions) {
    const tags = new Set(e.edition_tags ?? []);
    for (const pair of CONFLICTING_TAG_SETS) {
      const [a, b] = pair;
      if (tags.has(a) && tags.has(b)) {
        console.log(`   ⚠️  ${hash.slice(0, 12)}... has both "${a}" and "${b}"`);
        tagConflicts++;
        failed = true;
      }
    }
    for (const t of tags) {
      if (!tagIds.has(t)) {
        console.log(`   ⚠️  ${hash.slice(0, 12)}... unknown tag: "${t}"`);
        tagConflicts++;
        failed = true;
      }
    }
  }
  if (tagConflicts === 0) console.log('   OK: no conflicting or unknown tags');
  console.log('');

  // 5. Duplicate UPCs across different hashes
  console.log('5. Duplicate UPCs across editions:');
  const upcToHashes = new Map<string, string[]>();
  for (const [hash, e] of editions) {
    const upc = e.upc?.trim();
    if (!upc) continue;
    if (!upcToHashes.has(upc)) upcToHashes.set(upc, []);
    upcToHashes.get(upc)!.push(hash);
  }
  let dupCount = 0;
  for (const [upc, hashes] of upcToHashes) {
    if (hashes.length > 1) {
      console.log(`   ⚠️  UPC ${upc} appears in ${hashes.length} editions: ${hashes.map((h) => h.slice(0, 12)).join(', ')}...`);
      dupCount++;
      failed = true;
    }
  }
  if (dupCount === 0) console.log('   OK: no duplicate UPCs');
  console.log('');

  // 6. Unknown publishers
  console.log('6. Publisher validation:');
  let badPubs = 0;
  for (const [hash, e] of editions) {
    const p = e.publisher;
    if (p && !publisherIds.has(p)) {
      console.log(`   ⚠️  ${hash.slice(0, 12)}... unknown publisher: "${p}"`);
      badPubs++;
      failed = true;
    }
  }
  if (badPubs === 0) console.log('   OK: all publishers in schema');
  console.log('');

  // 7. Missing UPCs (informational)
  const missingUpc = [...editions.entries()].filter(([, e]) => !e.upc?.trim());
  if (missingUpc.length > 0) {
    console.log(`7. Editions without UPC: ${missingUpc.length} (informational)`);
    for (const [hash] of missingUpc.slice(0, 5)) console.log(`   ${hash.slice(0, 12)}...`);
    if (missingUpc.length > 5) console.log(`   ... and ${missingUpc.length - 5} more`);
  } else {
    console.log('7. Editions without UPC: 0');
  }

  console.log('\n=== Done ===\n');
  return failed ? 1 : 0;
}

process.exit(main());
