export type SourceId = 'acartia' | 'inaturalist' | 'obis';

export type SpeciesKey =
  | 'orca'
  | 'humpback'
  | 'gray'
  | 'minke'
  | 'fin'
  | 'harbor-porpoise'
  | 'dalls-porpoise'
  | 'dolphin'
  | 'other';

export type Ecotype = 'southern-resident' | 'biggs' | 'unknown';

export interface Sighting {
  /** Globally unique: `${source}:${sourceId}` */
  id: string;
  source: SourceId;
  /** Observation time, epoch ms (UTC). */
  time: number;
  lat: number;
  lng: number;
  species: SpeciesKey;
  /** Raw species/taxon label as the source gave it. */
  rawSpecies: string;
  ecotype?: Ecotype;
  /** Southern Resident pods named in the record, e.g. ["J", "K"]. */
  pods: string[];
  /** Individual IDs named in the record, e.g. ["J35", "T65A"]. */
  individuals: string[];
  count?: number;
  comments?: string;
  url?: string;
  photoUrl?: string;
  observer?: string;
  /** Research/verified-grade data (Acartia trusted, iNat research grade, OBIS). */
  verified: boolean;
}

export interface SourceResult {
  source: SourceId;
  sightings: Sighting[];
  error?: string;
  fetchedAt: number;
}
