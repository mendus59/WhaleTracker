import { inRegion } from '../config/region';
import { normalizeSpecies } from '../lib/species';
import { parseIndividuals } from '../lib/individuals';
import type { Sighting } from '../types';

// Acartia data cooperative (Orca Network, Whale Alert, Orcasound, Ocean Wise...).
// /sightings/current is open (last 7 days, no token). Data is open access under
// Creative Commons; attribution required. https://github.com/salish-sea/acartia
export const ACARTIA_URL = 'https://acartia.io/api/v1/sightings/current';

export interface AcartiaRecord {
  type?: string;
  created?: string; // "YYYY-MM-DD HH:MM:SS" UTC
  latitude?: number | string;
  longitude?: number | string;
  trusted?: number | boolean;
  entry_id?: string;
  ssemmi_id?: string;
  no_sighted?: number | string;
  photo_url?: string;
  data_source_id?: string | number;
  data_source_name?: string;
  data_source_entity?: string;
  data_source_witness?: string;
  data_source_comments?: string;
}

export function parseAcartiaTime(s: string | undefined): number {
  if (!s) return NaN;
  // "2021-11-19 19:54:37" is UTC; ISO strings are passed through.
  const iso = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}(:\d{2})?$/.test(s) ? s.replace(' ', 'T') + 'Z' : s;
  return Date.parse(iso);
}

export function normalizeAcartia(r: AcartiaRecord): Sighting | null {
  const lat = Number(r.latitude);
  const lng = Number(r.longitude);
  const time = parseAcartiaTime(r.created);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || !Number.isFinite(time)) return null;
  if (!inRegion(lat, lng)) return null;
  const comments = (r.data_source_comments ?? '').replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '').trim();
  const ids = parseIndividuals(`${r.type ?? ''} ${comments}`);
  const count = Number(r.no_sighted);
  const sourceKey = r.ssemmi_id || r.entry_id || `${r.data_source_name}-${r.data_source_id}-${time}`;
  return {
    id: `acartia:${sourceKey}`,
    source: 'acartia',
    time,
    lat,
    lng,
    species: normalizeSpecies(r.type, comments),
    rawSpecies: r.type ?? 'Unknown',
    ecotype: ids.ecotype,
    pods: ids.pods,
    individuals: ids.individuals,
    count: Number.isFinite(count) && count > 0 ? count : undefined,
    comments: comments || undefined,
    photoUrl: r.photo_url || undefined,
    observer: [r.data_source_entity, r.data_source_witness].filter(Boolean).join(' · ') || r.data_source_name,
    verified: r.trusted === 1 || r.trusted === true,
  };
}

export async function fetchAcartia(signal?: AbortSignal): Promise<Sighting[]> {
  const res = await fetch(ACARTIA_URL, { signal });
  if (!res.ok) throw new Error(`Acartia HTTP ${res.status}`);
  const body = await res.json();
  const rows: AcartiaRecord[] = Array.isArray(body) ? body : body?.data ?? body?.sightings ?? [];
  return rows.map(normalizeAcartia).filter((s): s is Sighting => s !== null);
}
