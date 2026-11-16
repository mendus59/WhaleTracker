import { SOURCES } from '../sources';
import type { SourceResult } from '../types';

export function SourcesStatus({ results, loading, onReload }: { results: SourceResult[]; loading: boolean; onReload: () => void }) {
  return (
    <details className="sources">
      <summary>
        Data sources {loading ? '· loading…' : results.some((r) => r.error) ? '· some unavailable' : ''}
      </summary>
      <ul>
        {results.map((r) => (
          <li key={r.source}>
            <a href={SOURCES[r.source].homepage} target="_blank" rel="noreferrer">
              {SOURCES[r.source].label}
            </a>{' '}
            <span className="muted small">{SOURCES[r.source].kind}</span>
            <div className={r.error ? 'error small' : 'muted small'}>
              {r.error ? r.error : `${r.sightings.length} in region · ${SOURCES[r.source].license}`}
            </div>
          </li>
        ))}
      </ul>
      <button className="link" onClick={onReload} disabled={loading}>
        Refresh now
      </button>
      <p className="muted small">
        Report a sighting to help researchers: <a href="https://www.orcanetwork.org/" target="_blank" rel="noreferrer">Orca Network</a> or the{' '}
        <a href="https://www.whalealert.org/" target="_blank" rel="noreferrer">Whale Alert app</a>. Keep your distance: Washington law
        requires 1,000 yards from Southern Resident orcas.
      </p>
    </details>
  );
}
