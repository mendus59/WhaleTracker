import { describe, expect, it } from 'vitest';
import { buildTracks, predictTrack } from '../lib/tracks';
import { dedupe, applyFilters, DEFAULT_FILTERS } from '../lib/filters';
import type { Sighting } from '../types';

const H = 3600e3;
const T0 = Date.UTC(2025, 6, 1, 12);
function s(id: string, hours: number, lat: number, lng: number, extra: Partial<Sighting> = {}): Sighting {
  return { id, source: 'acartia', time: T0 + hours * H, lat, lng, species: 'orca', rawSpecies: 'Orca', pods: [], individuals: [], verified: true, ...extra };
}

describe('tracks & prediction', () => {
  // ~5.5 km/h due south (0.05 deg lat per hour)
  const southbound = [s('a', 0, 47.9, -122.45, { pods: ['J'] }), s('b', 1, 47.85, -122.45), s('c', 2, 47.8, -122.45, { pods: ['J'] })];

  it('links reachable same-species reports into one track and adopts the pod name', () => {
    const tracks = buildTracks(southbound);
    expect(tracks).toHaveLength(1);
    expect(tracks[0].label).toBe('J pod');
  });

  it('does not link reports that would need impossible speed', () => {
    const tracks = buildTracks([s('a', 0, 47.9, -122.45), s('b', 0.5, 47.2, -122.45)]);
    expect(tracks).toHaveLength(2);
  });

  it('predicts continued southbound travel', () => {
    const [t] = buildTracks(southbound);
    const p = predictTrack(t, T0 + 2.2 * H)!;
    expect(p.bearing).toBeGreaterThan(170);
    expect(p.bearing).toBeLessThan(190);
    expect(p.speedKmh).toBeCloseTo(5.6, 0);
    expect(p.path[0][0]).toBeLessThan(47.8);
    expect(p.confidence).toBeGreaterThan(0.6);
  });

  it('gives no prediction for stale or single-point tracks', () => {
    const [t] = buildTracks(southbound);
    expect(predictTrack(t, T0 + 12 * H)).toBeNull();
    expect(predictTrack({ key: 'x', label: 'x', points: [southbound[0]] }, T0)).toBeNull();
  });
});

describe('filters', () => {
  it('dedupes the same event reported by two sources', () => {
    const a = s('acartia:1', 0, 47.6, -122.4);
    const b = { ...s('inaturalist:1', 0.05, 47.601, -122.401), source: 'inaturalist' as const };
    expect(dedupe([a, b])).toHaveLength(1);
  });
  it('filters by pod and individual', () => {
    const list = [s('1', 0, 47.6, -122.4, { pods: ['J'], individuals: ['J35'] }), s('2', 0, 47.6, -122.4, { pods: ['K'] })];
    const now = T0 + H;
    expect(applyFilters(list, { ...DEFAULT_FILTERS, whale: 'J pod' }, now).map((x) => x.id)).toEqual(['1']);
    expect(applyFilters(list, { ...DEFAULT_FILTERS, whale: 'j35' }, now).map((x) => x.id)).toEqual(['1']);
    expect(applyFilters(list, { ...DEFAULT_FILTERS, whale: 'K' }, now).map((x) => x.id)).toEqual(['2']);
  });
});
