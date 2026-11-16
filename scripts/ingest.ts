/**
 * Collect Puget Sound sightings from all sources and upsert them into
 * Firestore `sightings/{docId}`. Run by .github/workflows/ingest.yml.
 *
 *   FIREBASE_SERVICE_ACCOUNT='{"type":"service_account",...}' npx tsx scripts/ingest.ts [--days N] [--sources acartia,inaturalist,obis] [--dry-run]
 */
import { cert, initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { fetchAcartia } from '../src/sources/acartia';
import { fetchINaturalist } from '../src/sources/inaturalist';
import { fetchObis } from '../src/sources/obis';
import { sightingDocId } from '../src/lib/store';
import type { Sighting, SourceId } from '../src/types';

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

const days = Number(arg('days') ?? 3);
const sources = (arg('sources') ?? 'acartia,inaturalist,obis').split(',') as SourceId[];
const dryRun = process.argv.includes('--dry-run');
const since = Date.now() - days * 864e5;

const fetchers: Record<SourceId, () => Promise<Sighting[]>> = {
  acartia: () => fetchAcartia(),
  inaturalist: () => fetchINaturalist(since, undefined, { maxPages: days > 30 ? 50 : 5 }),
  obis: () => fetchObis(since, undefined, { maxPages: days > 60 ? 100 : 10 }),
};

async function main() {
  const results = await Promise.all(
    sources.map(async (s) => {
      try {
        const rows = await fetchers[s]();
        console.log(`${s}: ${rows.length} sightings in region`);
        return { source: s, rows };
      } catch (e) {
        console.error(`${s}: FAILED ${e instanceof Error ? e.message : e}`);
        return { source: s, rows: [] as Sighting[], error: String(e) };
      }
    }),
  );
  const all = results.flatMap((r) => r.rows);
  const failed = results.filter((r) => 'error' in r && r.error).map((r) => r.source);

  if (dryRun) {
    console.log(`dry run: would write ${all.length} sightings`);
    return failed.length === sources.length ? 1 : 0;
  }

  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) throw new Error('FIREBASE_SERVICE_ACCOUNT is not set');
  initializeApp({ credential: cert(JSON.parse(raw)) });
  const db = getFirestore();
  db.settings({ ignoreUndefinedProperties: true });

  // BulkWriter batches and retries; set() with merge keeps first-seen time.
  const writer = db.bulkWriter();
  for (const s of all) {
    writer.set(db.collection('sightings').doc(sightingDocId(s.id)), { ...s, ingestedAt: FieldValue.serverTimestamp() }, { merge: true });
  }
  writer.set(
    db.collection('meta').doc('ingest'),
    {
      lastRun: FieldValue.serverTimestamp(),
      days,
      counts: Object.fromEntries(results.map((r) => [r.source, r.rows.length])),
      failed,
    },
    { merge: true },
  );
  await writer.close();
  console.log(`wrote ${all.length} sightings`);
  // Fail the run only if every source failed, so one flaky API doesn't page anyone.
  return failed.length === sources.length ? 1 : 0;
}

main().then(
  (code) => process.exit(code),
  (e) => {
    console.error(e);
    process.exit(1);
  },
);
