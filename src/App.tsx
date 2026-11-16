import { useEffect, useMemo, useRef, useState } from 'react';
import { AuthPanel } from './components/AuthPanel';
import { FiltersPanel } from './components/FiltersPanel';
import { SightingList } from './components/SightingList';
import { SightingMap } from './components/SightingMap';
import { SourcesStatus } from './components/SourcesStatus';
import { Timeline, type TimeMode } from './components/Timeline';
import { useAuth } from './hooks/useAuth';
import { useSightings } from './hooks/useSightings';
import { useUserPrefs } from './hooks/useUserPrefs';
import { DEFAULT_FILTERS, applyFilters, knownWhales, recencyMs, type Filters } from './lib/filters';
import { buildTracks, predictTrack } from './lib/tracks';
import type { Sighting, SpeciesKey } from './types';

export default function App() {
  const { user } = useAuth();
  const { prefs, update } = useUserPrefs(user);
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [now, setNow] = useState(() => Date.now());
  const nowRef = useRef(now);
  const [cursor, setCursor] = useState(now);
  const [mode, setMode] = useState<TimeMode>('cumulative');
  const [windowMs, setWindowMs] = useState(24 * 3600e3);
  const [playing, setPlaying] = useState(false);
  const [selected, setSelected] = useState<Sighting>();
  const [panel, setPanel] = useState<'list' | 'filters'>('list');

  // Restore a signed-in user's saved filters once.
  useEffect(() => {
    if (prefs.savedFilters) setFilters((f) => ({ ...f, ...prefs.savedFilters }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid, !!prefs.savedFilters]);

  // Keep "now" fresh; if the cursor was pinned to now, keep it there.
  useEffect(() => {
    const id = setInterval(() => {
      const t = Date.now();
      setCursor((c) => (c >= nowRef.current ? t : c));
      nowRef.current = t;
      setNow(t);
    }, 60e3);
    return () => clearInterval(id);
  }, []);

  const start = now - recencyMs(filters.recency);
  const { sightings: all, results, loading, reload } = useSightings(start);

  const filtered = useMemo(() => applyFilters(all, filters, now), [all, filters, now]);
  const visible = useMemo(() => {
    const from = mode === 'window' ? cursor - windowMs : start;
    return filtered.filter((s) => s.time >= from && s.time <= cursor);
  }, [filtered, mode, cursor, windowMs, start]);

  const tracks = useMemo(() => buildTracks(visible), [visible]);
  const predictions = useMemo(
    () =>
      tracks
        .map((t) => predictTrack(t, cursor))
        .filter((p): p is NonNullable<typeof p> => p !== null)
        .sort((a, b) => b.confidence - a.confidence),
    [tracks, cursor],
  );

  const whales = useMemo(() => knownWhales(all), [all]);
  const speciesCounts = useMemo(() => {
    const c: Partial<Record<SpeciesKey, number>> = {};
    for (const s of filtered) c[s.species] = (c[s.species] ?? 0) + 1;
    return c;
  }, [filtered]);

  const changeFilters = (f: Filters) => {
    setFilters(f);
    if (cursor >= now || cursor < now - recencyMs(f.recency)) setCursor(now);
    if (user) update({ savedFilters: f });
  };

  const toggleFavorite = (id: string) =>
    update({ favorites: prefs.favorites.includes(id) ? prefs.favorites.filter((x) => x !== id) : [...prefs.favorites, id] });

  return (
    <div className="app">
      <header>
        <h1>
          <span aria-hidden>🐋</span> WhaleTracker <small>Puget Sound</small>
        </h1>
        <AuthPanel user={user} />
      </header>
      <main>
        <aside>
          <div className="tabs" role="tablist">
            <button role="tab" aria-selected={panel === 'list'} className={panel === 'list' ? 'on' : ''} onClick={() => setPanel('list')}>
              Sightings ({visible.length})
            </button>
            <button role="tab" aria-selected={panel === 'filters'} className={panel === 'filters' ? 'on' : ''} onClick={() => setPanel('filters')}>
              Filters
            </button>
          </div>
          {panel === 'filters' ? (
            <FiltersPanel filters={filters} onChange={changeFilters} whales={whales} favorites={prefs.favorites} speciesCounts={speciesCounts} />
          ) : (
            <SightingList
              sightings={visible}
              predictions={predictions}
              selected={selected}
              onSelect={setSelected}
              favorites={prefs.favorites}
              onToggleFavorite={user ? toggleFavorite : undefined}
            />
          )}
          {!user && <p className="muted small hint">Sign in to follow specific whales and keep your filters.</p>}
          <SourcesStatus results={results} loading={loading} onReload={reload} />
        </aside>
        <div className="map-wrap">
          <SightingMap
            sightings={visible}
            tracks={tracks}
            predictions={predictions}
            cursor={cursor}
            fadeOverMs={mode === 'window' ? windowMs : Math.max(now - start, 1)}
            selected={selected}
            onSelect={setSelected}
          />
          {loading && all.length === 0 && <div className="loading">Loading sightings…</div>}
        </div>
      </main>
      <Timeline
        start={start}
        end={now}
        cursor={Math.min(Math.max(cursor, start), now)}
        onCursor={setCursor}
        mode={mode}
        onMode={setMode}
        windowMs={windowMs}
        onWindow={setWindowMs}
        playing={playing}
        onPlaying={setPlaying}
        times={filtered.map((s) => s.time)}
      />
    </div>
  );
}
