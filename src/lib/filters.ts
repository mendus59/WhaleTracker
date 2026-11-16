import type { Ecotype, Sighting, SourceId, SpeciesKey } from '../types';

export const RECENCY_OPTIONS = [
  { id: '24h', label: 'Last 24 hours', ms: 24 * 3600e3 },
  { id: '3d', label: 'Last 3 days', ms: 3 * 24 * 3600e3 },
  { id: '7d', label: 'Last 7 days', ms: 7 * 24 * 3600e3 },
  { id: '30d', label: 'Last 30 days', ms: 30 * 24 * 3600e3 },
  { id: '1y', label: 'Last year', ms: 365 * 24 * 3600e3 },
  { id: '5y', label: 'Last 5 years', ms: 5 * 365 * 24 * 3600e3 },
] as const;
export type RecencyId = (typeof RECENCY_OPTIONS)[number]['id'];

export interface Filters {
  recency: RecencyId;
  species: SpeciesKey[]; // empty = all
  ecotype: Ecotype | 'any';
  /** Pod letter ("J") or individual id ("J35", "T65A"); empty = any. */
  whale: string;
  sources: SourceId[]; // empty = all
  verifiedOnly: boolean;
  sort: 'newest' | 'oldest';
}

export const DEFAULT_FILTERS: Filters = {
  recency: '7d',
  species: [],
  ecotype: 'any',
  whale: '',
  sources: [],
  verifiedOnly: false,
  sort: 'newest',
};

export function recencyMs(id: RecencyId): number {
  return RECENCY_OPTIONS.find((o) => o.id === id)!.ms;
}

export function matchesWhale(s: Sighting, q: string): boolean {
  const needle = q.trim().toUpperCase().replace(/[\s-]/g, '').replace(/POD$/, '');
  if (!needle) return true;
  if (needle.length === 1) return s.pods.includes(needle);
  return s.individuals.some((i) => i.toUpperCase() === needle || i.toUpperCase().startsWith(needle));
}

/** Filters that don't depend on the timeline position. */
export function applyFilters(all: Sighting[], f: Filters, now: number): Sighting[] {
  const since = now - recencyMs(f.recency);
  const out = all.filter(
    (s) =>
      s.time >= since &&
      s.time <= now &&
      (!f.species.length || f.species.includes(s.species)) &&
      (f.ecotype === 'any' || s.ecotype === f.ecotype) &&
      (!f.sources.length || f.sources.includes(s.source)) &&
      (!f.verifiedOnly || s.verified) &&
      matchesWhale(s, f.whale),
  );
  out.sort((a, b) => (f.sort === 'newest' ? b.time - a.time : a.time - b.time));
  return out;
}

/** Remove near-duplicate reports of the same event syndicated across sources. */
export function dedupe(all: Sighting[]): Sighting[] {
  const seen = new Map<string, Sighting>();
  for (const s of all) seen.set(s.id, s);
  const unique = [...seen.values()].sort((a, b) => a.time - b.time);
  const kept: Sighting[] = [];
  for (const s of unique) {
    let dup = false;
    for (let i = kept.length - 1; i >= 0 && s.time - kept[i].time < 10 * 60e3; i--) {
      const k = kept[i];
      if (k.source !== s.source && k.species === s.species && Math.abs(k.lat - s.lat) < 0.01 && Math.abs(k.lng - s.lng) < 0.01) {
        dup = true;
        break;
      }
    }
    if (!dup) kept.push(s);
  }
  return kept;
}

/** All pods/individuals seen in a set of sightings, for the whale picker. */
export function knownWhales(all: Sighting[]): { id: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const s of all) {
    for (const p of s.pods) counts.set(`${p} pod`, (counts.get(`${p} pod`) ?? 0) + 1);
    for (const i of s.individuals) counts.set(i, (counts.get(i) ?? 0) + 1);
  }
  return [...counts].map(([id, count]) => ({ id, count })).sort((a, b) => b.count - a.count || a.id.localeCompare(b.id));
}
