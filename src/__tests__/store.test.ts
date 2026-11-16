import { describe, expect, it } from 'vitest';
import { sightingDocId } from '../lib/store';

describe('sightingDocId', () => {
  it('keeps ids stable and Firestore-safe', () => {
    expect(sightingDocId('acartia:SPOTTER 263300')).toBe('acartia:SPOTTER 263300');
    expect(sightingDocId('obis:a/b/c')).toBe('obis:a_b_c');
    expect(sightingDocId('..')).toBe('_');
  });
});
