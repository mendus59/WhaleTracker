import { describe, expect, it } from 'vitest';
import { normalizeAcartia, parseAcartiaTime } from '../sources/acartia';
import { normalizeINat } from '../sources/inaturalist';
import { normalizeObis } from '../sources/obis';

describe('Acartia', () => {
  it('parses its UTC timestamp format', () => {
    expect(parseAcartiaTime('2021-11-19 19:54:37')).toBe(Date.UTC(2021, 10, 19, 19, 54, 37));
  });
  it('normalizes a record and drops out-of-region ones', () => {
    const s = normalizeAcartia({
      type: 'Southern Resident Killer Whale',
      created: '2025-08-01 18:00:00',
      latitude: '47.6',
      longitude: '-122.45',
      trusted: 1,
      ssemmi_id: 'ORCANETWORK1',
      no_sighted: 6,
      data_source_comments: 'Js northbound<br>J35 seen',
      data_source_entity: 'Orca Network',
    })!;
    expect(s.species).toBe('orca');
    expect(s.pods).toEqual(['J']);
    expect(s.individuals).toEqual(['J35']);
    expect(s.verified).toBe(true);
    expect(s.comments).toBe('Js northbound\nJ35 seen');
    expect(normalizeAcartia({ type: 'Humpback', created: '2025-08-01 18:00:00', latitude: 34.3, longitude: -119.8 })).toBeNull();
  });
});

describe('iNaturalist', () => {
  it('normalizes an observation', () => {
    const s = normalizeINat({
      id: 123,
      time_observed_at: '2025-07-04T10:00:00-07:00',
      geojson: { coordinates: [-122.5, 47.7] },
      taxon: { name: 'Megaptera novaeangliae', preferred_common_name: 'Humpback Whale' },
      quality_grade: 'research',
      photos: [{ url: 'https://x/square.jpg' }],
      user: { login: 'obs' },
    })!;
    expect(s.species).toBe('humpback');
    expect(s.lat).toBe(47.7);
    expect(s.verified).toBe(true);
    expect(s.photoUrl).toBe('https://x/small.jpg');
  });
});

describe('OBIS', () => {
  it('normalizes a record with a date range', () => {
    const s = normalizeObis({
      id: 'abc',
      decimalLatitude: 48.5,
      decimalLongitude: -123.1,
      eventDate: '2019-06-01/2019-06-02',
      scientificName: 'Phocoena phocoena',
    })!;
    expect(s.species).toBe('harbor-porpoise');
    expect(s.time).toBe(Date.parse('2019-06-01'));
  });
});
