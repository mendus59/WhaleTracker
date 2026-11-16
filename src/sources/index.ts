import type { SourceId, SourceResult } from '../types';
import { fetchAcartia } from './acartia';
import { fetchINaturalist } from './inaturalist';
import { fetchObis } from './obis';
import { fetchArchive } from './archive';

export const SOURCES: Record<SourceId, { label: string; kind: string; homepage: string; license: string }> = {
  acartia: {
    label: 'Acartia (Orca Network, Whale Alert & partners)',
    kind: 'Public + trusted reports, last 7 days',
    homepage: 'https://acartia.io',
    license: 'Open access, Creative Commons (attribution required)',
  },
  inaturalist: {
    label: 'iNaturalist',
    kind: 'Community observations with photos',
    homepage: 'https://www.inaturalist.org',
    license: 'Per-observation licenses; linked to the original',
  },
  obis: {
    label: 'OBIS',
    kind: 'Scientific survey datasets (delayed)',
    homepage: 'https://obis.org',
    license: 'CC0 / CC-BY per dataset',
  },
};

export async function fetchAll(since: number, signal?: AbortSignal): Promise<SourceResult[]> {
  const jobs: [SourceId, () => Promise<SourceResult['sightings']>][] = [
    ['acartia', () => fetchAcartia(signal)],
    ['inaturalist', () => fetchINaturalist(since, signal)],
    ['obis', () => fetchObis(since, signal)],
  ];
  return Promise.all(
    jobs.map(async ([source, run]) => {
      try {
        return { source, sightings: await run(), fetchedAt: Date.now() };
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        // A TypeError from fetch is almost always CORS or network.
        const error = e instanceof TypeError ? `Unreachable from the browser (network/CORS): ${msg}` : msg;
        return { source, sightings: [], error, fetchedAt: Date.now() };
      }
    }),
  );
}

export interface LoadResult {
  results: SourceResult[];
  /** 'archive' = saved history in Firestore (+ live Acartia); 'live' = straight from the sources. */
  mode: 'archive' | 'live';
  archiveCount?: number;
  archiveError?: string;
}

/**
 * Prefer the Firestore archive (full history, one fast query). Top it up with
 * the live Acartia feed so reports since the last ingest run still appear.
 * If the archive is unavailable or empty, fetch everything live.
 */
export async function loadSightings(since: number, signal?: AbortSignal): Promise<LoadResult> {
  let archiveError: string | undefined;
  try {
    const saved = await fetchArchive(since);
    if (saved.length) {
      let live: SourceResult;
      try {
        live = { source: 'acartia', sightings: await fetchAcartia(signal), fetchedAt: Date.now() };
      } catch (e) {
        live = { source: 'acartia', sightings: [], error: e instanceof Error ? e.message : String(e), fetchedAt: Date.now() };
      }
      const bySource = (id: SourceId) => saved.filter((s) => s.source === id);
      const results: SourceResult[] = (['acartia', 'inaturalist', 'obis'] as SourceId[]).map((id) => ({
        source: id,
        sightings: id === 'acartia' ? [...bySource(id), ...live.sightings] : bySource(id),
        error: id === 'acartia' ? live.error : undefined,
        fetchedAt: Date.now(),
      }));
      return { results, mode: 'archive', archiveCount: saved.length };
    }
  } catch (e) {
    archiveError = e instanceof Error ? e.message : String(e);
  }
  return { results: await fetchAll(since, signal), mode: 'live', archiveError };
}
