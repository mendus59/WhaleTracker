/** Firestore document id for a sighting id (ids may contain '/', which Firestore forbids). */
export function sightingDocId(id: string): string {
  return id.replace(/\//g, '_').replace(/^\.+$/, '_').slice(0, 1400);
}
