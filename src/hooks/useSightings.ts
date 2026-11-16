import { useCallback, useEffect, useRef, useState } from 'react';
import { loadSightings, type LoadResult } from '../sources';
import { dedupe } from '../lib/filters';
import type { Sighting, SourceResult } from '../types';

const REFRESH_MS = 10 * 60e3;

/**
 * Loads sightings from all sources for [since, now]. Refetches when `since`
 * moves earlier than what's loaded, and every 10 minutes for fresh reports.
 */
export function useSightings(since: number) {
  const [sightings, setSightings] = useState<Sighting[]>([]);
  const [results, setResults] = useState<SourceResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [info, setInfo] = useState<Omit<LoadResult, 'results'>>({ mode: 'live' });
  const loadedSince = useRef<number>(Infinity);
  const abort = useRef<AbortController | null>(null);

  const load = useCallback(async (from: number) => {
    abort.current?.abort();
    const ctl = new AbortController();
    abort.current = ctl;
    setLoading(true);
    try {
      const { results: res, ...meta } = await loadSightings(from, ctl.signal);
      if (ctl.signal.aborted) return;
      loadedSince.current = from;
      setResults(res);
      setInfo(meta);
      setSightings(dedupe(res.flatMap((r) => r.sightings)));
    } finally {
      if (!ctl.signal.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (since < loadedSince.current) load(since);
  }, [since, load]);

  useEffect(() => {
    const t = setInterval(() => load(loadedSince.current === Infinity ? since : loadedSince.current), REFRESH_MS);
    return () => clearInterval(t);
  }, [load, since]);

  return { sightings, results, info, loading, reload: () => load(Math.min(since, loadedSince.current)) };
}
