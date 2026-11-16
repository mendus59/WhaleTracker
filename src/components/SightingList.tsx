import { SPECIES } from '../lib/species';
import { formatTime, timeAgo } from '../lib/format';
import { compassPoint, type Prediction } from '../lib/tracks';
import { SOURCES } from '../sources';
import type { Sighting } from '../types';

interface Props {
  sightings: Sighting[];
  predictions: Prediction[];
  selected?: Sighting;
  onSelect: (s: Sighting) => void;
  favorites: string[];
  onToggleFavorite?: (id: string) => void;
}

const LIMIT = 300;

export function SightingList({ sightings, predictions, selected, onSelect, favorites, onToggleFavorite }: Props) {
  return (
    <section className="list" aria-label="Sightings">
      {predictions.length > 0 && (
        <div className="predictions">
          <h3>Moving now</h3>
          {predictions.map((p) => (
            <div key={p.trackKey} className="pred">
              <b>{p.label}</b> heading {compassPoint(p.bearing)} ~{p.speedKmh} km/h
              <span className="muted"> · {Math.round(p.confidence * 100)}% conf.</span>
            </div>
          ))}
        </div>
      )}
      <h3>
        {sightings.length} sighting{sightings.length === 1 ? '' : 's'}
      </h3>
      {sightings.length === 0 && <p className="muted">No sightings match. Try a longer time range or fewer filters.</p>}
      <ul>
        {sightings.slice(0, LIMIT).map((s) => (
          <li key={s.id} className={selected?.id === s.id ? 'sel' : ''}>
            <button className="item" onClick={() => onSelect(s)}>
              <i className="dot" style={{ background: SPECIES[s.species].color }} />
              <span className="item-main">
                <span>
                  {SPECIES[s.species].label}
                  {s.pods.length > 0 && <b> · {s.pods.join('/')} pod</b>}
                  {s.individuals.length > 0 && <b> · {s.individuals.slice(0, 4).join(', ')}</b>}
                </span>
                <span className="muted small">
                  {timeAgo(s.time)} · {formatTime(s.time)} · {SOURCES[s.source].label.split(' (')[0]}
                </span>
              </span>
            </button>
            {onToggleFavorite &&
              [...s.pods.map((p) => `${p} pod`), ...s.individuals].slice(0, 3).map((id) => (
                <button
                  key={id}
                  className={`fav ${favorites.includes(id) ? 'on' : ''}`}
                  title={favorites.includes(id) ? `Unfollow ${id}` : `Follow ${id}`}
                  onClick={() => onToggleFavorite(id)}
                >
                  {favorites.includes(id) ? '★' : '☆'} {id}
                </button>
              ))}
          </li>
        ))}
      </ul>
      {sightings.length > LIMIT && <p className="muted small">Showing newest {LIMIT}. Narrow the filters to see more.</p>}
    </section>
  );
}
