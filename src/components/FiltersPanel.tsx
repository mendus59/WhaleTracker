import type { Ecotype, SourceId, SpeciesKey } from '../types';
import { RECENCY_OPTIONS, type Filters } from '../lib/filters';
import { ECOTYPE_LABEL, SPECIES } from '../lib/species';
import { SOURCES } from '../sources';

interface Props {
  filters: Filters;
  onChange: (f: Filters) => void;
  whales: { id: string; count: number }[];
  favorites: string[];
  speciesCounts: Partial<Record<SpeciesKey, number>>;
}

function toggle<T>(list: T[], v: T): T[] {
  return list.includes(v) ? list.filter((x) => x !== v) : [...list, v];
}

export function FiltersPanel({ filters: f, onChange, whales, favorites, speciesCounts }: Props) {
  const set = (patch: Partial<Filters>) => onChange({ ...f, ...patch });
  const whaleOptions = [...new Set([...favorites, ...whales.map((w) => w.id)])];
  return (
    <section className="filters" aria-label="Filters">
      <label>
        <span>When</span>
        <select value={f.recency} onChange={(e) => set({ recency: e.target.value as Filters['recency'] })}>
          {RECENCY_OPTIONS.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
      </label>

      <label>
        <span>Whale or pod</span>
        <input
          list="whale-ids"
          placeholder="e.g. J pod, J35, T65A"
          value={f.whale}
          onChange={(e) => set({ whale: e.target.value })}
        />
        <datalist id="whale-ids">
          {whaleOptions.map((w) => (
            <option key={w} value={w} />
          ))}
        </datalist>
      </label>

      <label>
        <span>Orca ecotype</span>
        <select value={f.ecotype} onChange={(e) => set({ ecotype: e.target.value as Ecotype | 'any' })}>
          <option value="any">Any</option>
          {(Object.keys(ECOTYPE_LABEL) as Ecotype[]).map((k) => (
            <option key={k} value={k}>
              {ECOTYPE_LABEL[k]}
            </option>
          ))}
        </select>
      </label>

      <fieldset>
        <legend>Species</legend>
        <div className="chips">
          {(Object.keys(SPECIES) as SpeciesKey[]).map((k) => (
            <button
              key={k}
              className={`chip ${f.species.includes(k) ? 'on' : ''}`}
              onClick={() => set({ species: toggle(f.species, k) })}
              aria-pressed={f.species.includes(k)}
            >
              <i style={{ background: SPECIES[k].color }} />
              {SPECIES[k].label}
              {speciesCounts[k] ? <small>{speciesCounts[k]}</small> : null}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend>Sources</legend>
        <div className="chips">
          {(Object.keys(SOURCES) as SourceId[]).map((k) => (
            <button
              key={k}
              className={`chip ${f.sources.includes(k) ? 'on' : ''}`}
              onClick={() => set({ sources: toggle(f.sources, k) })}
              aria-pressed={f.sources.includes(k)}
            >
              {SOURCES[k].label.split(' (')[0]}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="row">
        <label className="check">
          <input type="checkbox" checked={f.verifiedOnly} onChange={(e) => set({ verifiedOnly: e.target.checked })} />
          Verified / research grade only
        </label>
        <label>
          <span>Sort</span>
          <select value={f.sort} onChange={(e) => set({ sort: e.target.value as Filters['sort'] })}>
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
          </select>
        </label>
      </div>
    </section>
  );
}
