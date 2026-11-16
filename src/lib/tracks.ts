import type { Sighting } from '../types';
import { bearingDeg, destination, distanceKm } from './geo';

/** Max plausible sustained travel speed for linking sightings into a track. */
export const MAX_SPEED_KMH = 15;
/** Sightings further apart in time than this start a new track. */
export const MAX_GAP_H = 6;
/** Slack for position error between reports (km). */
const POSITION_SLACK_KM = 4;

export interface Track {
  key: string;
  label: string;
  points: Sighting[];
}

export interface Prediction {
  trackKey: string;
  label: string;
  from: [number, number];
  /** Projected positions at +1h, +2h, +3h. */
  path: [number, number][];
  speedKmh: number;
  bearing: number;
  /** 0..1, higher when more consistent recent movement. */
  confidence: number;
  basedOn: number;
  lastSeen: number;
  /** Id of the track's most recent sighting (stable across re-renders). */
  lastId: string;
}

/** What "the same animals" means: named pod/individuals if any, otherwise species + ecotype. */
export function groupKey(s: Sighting): string {
  if (s.individuals.length) return `id:${s.individuals.join('+')}`;
  if (s.pods.length) return `pod:${s.pods.join('+')}`;
  return `sp:${s.species}:${s.ecotype ?? 'unknown'}`;
}

function groupLabel(s: Sighting): string {
  if (s.individuals.length) return s.individuals.join(', ');
  if (s.pods.length) return `${s.pods.join('/')} pod`;
  return s.species;
}

/**
 * Chain sightings into tracks: a sighting joins the most recent track of the
 * same group whose last point is reachable at MAX_SPEED_KMH within MAX_GAP_H.
 * Named pods also join generic same-species tracks (reports often omit pod).
 */
export function buildTracks(sightings: Sighting[]): Track[] {
  const sorted = [...sightings].sort((a, b) => a.time - b.time);
  const tracks: Track[] = [];
  for (const s of sorted) {
    const key = groupKey(s);
    let best: Track | undefined;
    let bestDist = Infinity;
    for (const t of tracks) {
      const last = t.points[t.points.length - 1];
      const compatible = t.key === key || (last.species === s.species && (t.key.startsWith('sp:') || key.startsWith('sp:')));
      if (!compatible) continue;
      const dtH = (s.time - last.time) / 3_600_000;
      if (dtH < 0 || dtH > MAX_GAP_H) continue;
      const d = distanceKm(last.lat, last.lng, s.lat, s.lng);
      if (d > MAX_SPEED_KMH * dtH + POSITION_SLACK_KM) continue;
      // Prefer exact group matches, then nearest.
      const score = d + (t.key === key ? 0 : 5);
      if (score < bestDist) {
        best = t;
        bestDist = score;
      }
    }
    if (best) {
      best.points.push(s);
      // Upgrade a generic track's identity once a named report joins it.
      if (best.key.startsWith('sp:') && !key.startsWith('sp:')) {
        best.key = key;
        best.label = groupLabel(s);
      }
    } else {
      tracks.push({ key, label: groupLabel(s), points: [s] });
    }
  }
  tracks.forEach((t, i) => (t.key = `${t.key}#${i}`));
  return tracks;
}

/**
 * Simple dead-reckoning: average velocity over the last few legs of a track
 * (recent legs weighted more), projected 1-3 hours ahead.
 * Returns null when the track is too short or stale.
 */
export function predictTrack(track: Track, now: number, maxAgeH = 6): Prediction | null {
  const pts = track.points;
  if (pts.length < 2) return null;
  const last = pts[pts.length - 1];
  if ((now - last.time) / 3_600_000 > maxAgeH) return null;

  const legs = pts.slice(-5);
  let wSum = 0;
  let vn = 0; // km/h north
  let ve = 0; // km/h east
  const bearings: number[] = [];
  for (let i = 1; i < legs.length; i++) {
    const a = legs[i - 1];
    const b = legs[i];
    const dtH = (b.time - a.time) / 3_600_000;
    if (dtH < 1 / 6) continue; // ignore legs < 10 min: dominated by position error
    const d = distanceKm(a.lat, a.lng, b.lat, b.lng);
    const brg = bearingDeg(a.lat, a.lng, b.lat, b.lng);
    const speed = Math.min(d / dtH, MAX_SPEED_KMH);
    const w = i; // later legs weigh more
    vn += w * speed * Math.cos((brg * Math.PI) / 180);
    ve += w * speed * Math.sin((brg * Math.PI) / 180);
    wSum += w;
    bearings.push(brg);
  }
  if (!wSum) return null;
  vn /= wSum;
  ve /= wSum;
  const speedKmh = Math.hypot(vn, ve);
  if (speedKmh < 0.5) return null; // milling / foraging: no useful direction
  const bearing = ((Math.atan2(ve, vn) * 180) / Math.PI + 360) % 360;

  // Consistency of headings (mean resultant length) x amount of evidence.
  const cx = bearings.reduce((s, b) => s + Math.cos((b * Math.PI) / 180), 0) / bearings.length;
  const cy = bearings.reduce((s, b) => s + Math.sin((b * Math.PI) / 180), 0) / bearings.length;
  const consistency = Math.hypot(cx, cy);
  const evidence = Math.min(1, bearings.length / 3);
  const confidence = Math.round(consistency * evidence * 100) / 100;

  const path: [number, number][] = [1, 2, 3].map((h) => destination(last.lat, last.lng, bearing, speedKmh * h));
  return {
    trackKey: track.key,
    label: track.label,
    from: [last.lat, last.lng],
    path,
    speedKmh: Math.round(speedKmh * 10) / 10,
    bearing: Math.round(bearing),
    confidence,
    basedOn: legs.length,
    lastSeen: last.time,
    lastId: last.id,
  };
}

export function compassPoint(bearing: number): string {
  const pts = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  return pts[Math.round(bearing / 22.5) % 16];
}
