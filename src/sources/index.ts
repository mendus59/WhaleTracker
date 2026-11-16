import type { SourceId, SourceResult } from '../types';
import { fetchAcartia } from './acartia';
import { fetchINaturalist } from './inaturalist';
import { fetchObis } from './obis';

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
