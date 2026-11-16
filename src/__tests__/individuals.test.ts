import { describe, expect, it } from 'vitest';
import { parseIndividuals } from '../lib/individuals';

describe('parseIndividuals', () => {
  it('finds Southern Resident pods in varied phrasings', () => {
    expect(parseIndividuals('J pod heading south past Point No Point').pods).toEqual(['J']);
    expect(parseIndividuals("Js and Ks off Alki").pods).toEqual(['J', 'K']);
    expect(parseIndividuals('J, K and L pods in Haro Strait').pods).toEqual(['J', 'K', 'L']);
    expect(parseIndividuals('L-pod').ecotype).toBe('southern-resident');
  });
  it('finds individual IDs and infers pods/ecotypes', () => {
    const r = parseIndividuals('J35 Tahlequah and J57 with the J16s');
    expect(r.individuals).toEqual(['J16', 'J35', 'J57']);
    expect(r.pods).toEqual(['J']);
    expect(r.ecotype).toBe('southern-resident');
    const b = parseIndividuals("Bigg's: T65A and T-124A2s near Bainbridge");
    expect(b.individuals).toEqual(['T124A2', 'T65A']);
    expect(b.ecotype).toBe('biggs');
  });
  it('strips HTML and ignores timestamps', () => {
    expect(parseIndividuals('<br>2024-05-01T12:30 gray whale').individuals).toEqual([]);
    expect(parseIndividuals(undefined)).toEqual({ pods: [], individuals: [] });
  });
});
