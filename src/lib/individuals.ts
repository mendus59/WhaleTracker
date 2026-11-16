import type { Ecotype } from '../types';

export interface ParsedIds {
  pods: string[];
  individuals: string[];
  ecotype?: Ecotype;
}

// Southern Resident individuals: J/K/L + number (J35, K12, L87).
const SRKW_ID = /\b([JKL])-?(\d{1,3})s?\b/g;
// Southern Resident pods: "J pod", "Jpod", "J-pod", "Js", "J's", "J, K and L pods".
const POD = /\b([JKL])(?:[- ]?pods?\b|'?s\b)/g;
const POD_LIST = /\b[JKL](?:\s*(?:,|and|&|\+)\s*[JKL]\b)+\s*pods?\b/g;
// Bigg's individuals / matrilines: T65A, T137, T49A1, T36A2, T-124A.
const BIGGS_ID = /\bT-?(\d{1,3}[A-F]?\d?[A-F]?)s?\b/g;

function uniq(xs: string[]): string[] {
  return [...new Set(xs)].sort();
}

/** Extract named pods and individuals from free text (sighting comments). */
export function parseIndividuals(text: string | undefined | null): ParsedIds {
  if (!text) return { pods: [], individuals: [] };
  const plain = text.replace(/<[^>]+>/g, ' ');
  const pods: string[] = [];
  const individuals: string[] = [];

  for (const m of plain.matchAll(POD_LIST)) pods.push(...(m[0].match(/\b[JKL]\b/g) ?? []));
  for (const m of plain.matchAll(POD)) pods.push(m[1]);
  for (const m of plain.matchAll(SRKW_ID)) {
    individuals.push(`${m[1]}${parseInt(m[2], 10)}`);
    pods.push(m[1]);
  }
  for (const m of plain.matchAll(BIGGS_ID)) individuals.push(`T${m[1]}`);

  let ecotype: Ecotype | undefined;
  if (pods.length || /southern resident|\bsrkw\b|\bresidents?\b/i.test(plain)) ecotype = 'southern-resident';
  else if (individuals.some((i) => i.startsWith('T')) || /bigg'?s|transient/i.test(plain)) ecotype = 'biggs';

  return { pods: uniq(pods), individuals: uniq(individuals), ecotype };
}
