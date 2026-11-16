import { REGION, inRegion } from '../config/region';
import { normalizeSpecies } from '../lib/species';
import { parseIndividuals } from '../lib/individuals';
import type { Sighting } from '../types';

// iNaturalist community observations. Public read API, CORS enabled, no key.
// Rate limit guidance: <= ~1 req/sec, <= 10k/day. Each observation carries its
// own license; we link back to the observation page for attribution.
// https://api.inaturalist.org/v1/docs/
const BASE = 'https://api.inaturalist.org/v1/observations';
const CETACEA_TAXON_ID = 152871; // infraorder Cetacea (taxon_name=Cetacea returns nothing)
const PER_PAGE = 200;
const MAX_PAGES = 5;

export interface INatObservation {
  id: number;
  uri?: string;
  observed_on?: string;
  time_observed_at?: string | null;
  geojson?: { coordinates: [number, number] } | null;
  location?: string | null;
  description?: string | null;
  quality_grade?: string;
  taxon?: { name?: string; preferred_common_name?: string } | null;
  photos?: { url?: string }[];
  user?: { login?: string; name?: string };
}

export function normalizeINat(o: INatObservation): Sighting | null {
  let lat: number, lng: number;
  if (o.geojson?.coordinates) [lng, lat] = o.geojson.coordinates;
  else if (o.location) [lat, lng] = o.location.split(',').map(Number);
  else return null;
  const time = Date.parse(o.time_observed_at || o.observed_on || '');
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || !Number.isFinite(time)) return null;
  if (!inRegion(lat, lng)) return null;
  const common = o.taxon?.preferred_common_name;
  const sci = o.taxon?.name;
  const ids = parseIndividuals(o.description);
  return {
    id: `inaturalist:${o.id}`,
    source: 'inaturalist',
    time,
    lat,
    lng,
    species: normalizeSpecies(sci, common),
    rawSpecies: common ? `${common} (${sci})` : sci ?? 'Cetacea',
    ecotype: ids.ecotype,
    pods: ids.pods,
    individuals: ids.individuals,
    comments: o.description || undefined,
    url: o.uri ?? `https://www.inaturalist.org/observations/${o.id}`,
    photoUrl: o.photos?.[0]?.url?.replace('square', 'small'),
    observer: o.user?.name || o.user?.login,
    verified: o.quality_grade === 'research',
  };
}

export function inatUrl(sinceIso: string, page: number): string {
  const p = new URLSearchParams({
    taxon_id: String(CETACEA_TAXON_ID),
    nelat: String(REGION.north),
    nelng: String(REGION.east),
    swlat: String(REGION.south),
    swlng: String(REGION.west),
    d1: sinceIso.slice(0, 10),
    order_by: 'observed_on',
    order: 'desc',
    per_page: String(PER_PAGE),
    page: String(page),
  });
  return `${BASE}?${p}`;
}

export async function fetchINaturalist(since: number, signal?: AbortSignal, opts: { maxPages?: number } = {}): Promise<Sighting[]> {
  const maxPages = opts.maxPages ?? MAX_PAGES;
  const out: Sighting[] = [];
  const sinceIso = new Date(since).toISOString();
  for (let page = 1; page <= maxPages; page++) {
    const res = await fetch(inatUrl(sinceIso, page), { signal });
    if (!res.ok) throw new Error(`iNaturalist HTTP ${res.status}`);
    const body = await res.json();
    const results: INatObservation[] = body.results ?? [];
    for (const o of results) {
      const s = normalizeINat(o);
      if (s) out.push(s);
    }
    if (results.length < PER_PAGE || page * PER_PAGE >= body.total_results) break;
    await new Promise((r) => setTimeout(r, 1000)); // be polite: ~1 req/sec
  }
  return out;
}
