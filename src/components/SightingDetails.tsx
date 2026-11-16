import { ECOTYPE_LABEL, SPECIES } from '../lib/species';
import { formatTime, timeAgo } from '../lib/format';
import { SOURCES } from '../sources';
import type { Sighting } from '../types';

export function SightingDetails({ s }: { s: Sighting }) {
  return (
    <div className="details">
      <strong>{SPECIES[s.species].label}</strong>
      {s.ecotype && s.ecotype !== 'unknown' && <span className="tag">{ECOTYPE_LABEL[s.ecotype]}</span>}
      {s.verified && <span className="tag ok">Verified</span>}
      <div className="muted">
        {formatTime(s.time)} ({timeAgo(s.time)})
      </div>
      {(s.pods.length > 0 || s.individuals.length > 0) && (
        <div>
          {s.pods.length > 0 && <>Pods: {s.pods.join(', ')} </>}
          {s.individuals.length > 0 && <>· Individuals: {s.individuals.join(', ')}</>}
        </div>
      )}
      {s.count && <div>Animals: {s.count}</div>}
      {s.photoUrl && <img src={s.photoUrl} alt="" loading="lazy" />}
      {s.comments && <p className="comments">{s.comments.length > 400 ? s.comments.slice(0, 400) + '…' : s.comments}</p>}
      <div className="muted small">
        {SOURCES[s.source].label}
        {s.observer ? ` · ${s.observer}` : ''}
        {s.url && (
          <>
            {' · '}
            <a href={s.url} target="_blank" rel="noreferrer">
              Original
            </a>
          </>
        )}
      </div>
    </div>
  );
}
