import { collection, getDocs, limit, orderBy, query, where } from 'firebase/firestore';
import { db } from '../config/firebase';
import type { Sighting } from '../types';

/** Max docs per load; keeps a long-range view within Firestore's free read quota. */
export const ARCHIVE_LIMIT = 8000;

/** Sightings saved by the GitHub Actions ingester (scripts/ingest.ts). */
export async function fetchArchive(since: number): Promise<Sighting[]> {
  const q = query(collection(db, 'sightings'), where('time', '>=', since), orderBy('time', 'desc'), limit(ARCHIVE_LIMIT));
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const data = d.data() as Partial<Sighting> & { ingestedAt?: unknown };
    delete data.ingestedAt;
    return { ...data, pods: data.pods ?? [], individuals: data.individuals ?? [] } as Sighting;
  });
}
