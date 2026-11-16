import type { Ecotype, SpeciesKey } from '../types';

export const SPECIES: Record<SpeciesKey, { label: string; color: string }> = {
  orca: { label: 'Orca (killer whale)', color: '#111827' },
  humpback: { label: 'Humpback whale', color: '#2563eb' },
  gray: { label: 'Gray whale', color: '#6b7280' },
  minke: { label: 'Minke whale', color: '#0d9488' },
  fin: { label: 'Fin whale', color: '#7c3aed' },
  'harbor-porpoise': { label: 'Harbor porpoise', color: '#d97706' },
  'dalls-porpoise': { label: "Dall's porpoise", color: '#db2777' },
  dolphin: { label: 'Dolphin', color: '#16a34a' },
  other: { label: 'Other / unknown cetacean', color: '#94a3b8' },
};

export const ECOTYPE_LABEL: Record<Ecotype, string> = {
  'southern-resident': 'Southern Resident',
  biggs: "Bigg's (transient)",
  unknown: 'Unknown ecotype',
};

const RULES: [RegExp, SpeciesKey][] = [
  [/orca|killer|orcinus|\bsrkw\b|bigg|transient/i, 'orca'],
  [/humpback|megaptera/i, 'humpback'],
  [/gr[ae]y whale|^gr[ae]y$|eschrichtius/i, 'gray'],
  [/minke|acutorostrata/i, 'minke'],
  [/\bfin\b|fin whale|physalus/i, 'fin'],
  [/dall/i, 'dalls-porpoise'],
  [/harbou?r porpoise|phocoena phocoena|^porpoise$/i, 'harbor-porpoise'],
  [/dolphin|lagenorhynchus|sagmatias|delphin|tursiops|grampus|risso/i, 'dolphin'],
];

export function normalizeSpecies(...labels: (string | undefined | null)[]): SpeciesKey {
  for (const label of labels) {
    if (!label) continue;
    const s = label.trim();
    for (const [re, key] of RULES) if (re.test(s)) return key;
  }
  return 'other';
}
