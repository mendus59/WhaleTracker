import { REGION_WKT, inRegion } from '../config/region';
import { normalizeSpecies } from '../lib/species';
import { parseIndividuals } from '../lib/individuals';
import type { Sighting } from '../types';

// OBIS (Ocean Biodiversity Information System): scientific survey datasets,
// open API with CORS, no key. Records are mostly CC0 / CC-BY per dataset and
// usually lag real time by months, so this feeds the long-range/cumulative view.
// https://api.obis.org/
const BASE = 'https://api.obis.org/v3/occurrence';
const CETACEA_APHIA_ID = 2688;
const SIZE = 1000;
const MAX_PAGES = 10;
const FIELDS =
  'id,decimalLatitude,decimalLongitude,eventDate,date_mid,scientificName,vernacularName,individualCount,occurrenceRemarks,datasetName,dataset_id,catalogNumber,institutionCode';

export interface ObisRecord {
  id: string;
  decimalLatitude?: number;
  decimalLongitude?: number;
  eventDate?: string;
  date_mid?: number;
  scientificName?: string;
  vernacularName?: string;
  individualCount?: string | number;
  occurrenceRemarks?: string;
  datasetName?: string;
  dataset_id?: string;
  institutionCode?: string;
  recordedBy?: string;
  catalogNumber?: string;
}

export function parseObisDate(r: ObisRecord): number {
  // eventDate keeps the time of day; date_mid is only the (mid)date.
  const t = r.eventDate ? Date.parse(r.eventDate.split('/')[0]) : NaN;
  if (Number.isFinite(t)) return t;
  return typeof r.date_mid === 'number' ? r.date_mid : NaN;
}

export function normalizeObis(r: ObisRecord): Sighting | null {
  const lat = r.decimalLatitude;
  const lng = r.decimalLongitude;
  const time = parseObisDate(r);
  if (lat == null || lng == null || !Number.isFinite(time) || !inRegion(lat, lng)) return null;
  const ids = parseIndividuals(r.occurrenceRemarks);
  const count = Number(r.individualCount);
  return {
    id: `obis:${r.id}`,
    source: 'obis',
    time,
    lat,
    lng,
    species: normalizeSpecies(r.scientificName, r.vernacularName),
    rawSpecies: r.vernacularName ? `${r.vernacularName} (${r.scientificName})` : r.scientificName ?? 'Cetacea',
    ecotype: ids.ecotype,
    pods: ids.pods,
    individuals: ids.individuals,
    count: Number.isFinite(count) && count > 0 ? count : undefined,
    comments: r.occurrenceRemarks || undefined,
    url: r.catalogNumber?.startsWith('http') ? r.catalogNumber : r.dataset_id ? `https://obis.org/dataset/${r.dataset_id}` : undefined,
    observer: r.datasetName || r.institutionCode || r.recordedBy,
    verified: true,
  };
}

export async function fetchObis(since: number, signal?: AbortSignal): Promise<Sighting[]> {
  const out: Sighting[] = [];
  let after: string | undefined;
  for (let page = 0; page < MAX_PAGES; page++) {
    const p = new URLSearchParams({
      taxonid: String(CETACEA_APHIA_ID),
      geometry: REGION_WKT,
      startdate: new Date(since).toISOString().slice(0, 10),
      size: String(SIZE),
      fields: FIELDS,
    });
    if (after) p.set('after', after);
    const res = await fetch(`${BASE}?${p}`, { signal });
    if (!res.ok) throw new Error(`OBIS HTTP ${res.status}`);
    const body = await res.json();
    const rows: ObisRecord[] = body.results ?? [];
    for (const r of rows) {
      const s = normalizeObis(r);
      if (s) out.push(s);
    }
    if (rows.length < SIZE) break;
    after = rows[rows.length - 1].id;
  }
  return out;
}
