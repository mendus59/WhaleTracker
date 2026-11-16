import { useEffect, useMemo } from 'react';
import { formatTime } from '../lib/format';

export type TimeMode = 'cumulative' | 'window';

interface Props {
  start: number;
  end: number;
  cursor: number;
  onCursor: (t: number) => void;
  mode: TimeMode;
  onMode: (m: TimeMode) => void;
  windowMs: number;
  onWindow: (ms: number) => void;
  playing: boolean;
  onPlaying: (p: boolean) => void;
  times: number[];
}

const WINDOWS = [
  { ms: 3600e3, label: '1 hour' },
  { ms: 6 * 3600e3, label: '6 hours' },
  { ms: 24 * 3600e3, label: '1 day' },
  { ms: 7 * 24 * 3600e3, label: '1 week' },
  { ms: 30 * 24 * 3600e3, label: '1 month' },
];
const BINS = 60;
const PLAY_STEPS = 120;

export function Timeline(p: Props) {
  const span = Math.max(1, p.end - p.start);

  const bins = useMemo(() => {
    const b = new Array(BINS).fill(0);
    for (const t of p.times) {
      const i = Math.floor(((t - p.start) / span) * BINS);
      if (i >= 0 && i < BINS) b[i]++;
    }
    const max = Math.max(1, ...b);
    return b.map((v) => v / max);
  }, [p.times, p.start, span]);

  useEffect(() => {
    if (!p.playing) return;
    const id = setInterval(() => {
      const next = p.cursor + span / PLAY_STEPS;
      if (next >= p.end) {
        p.onCursor(p.end);
        p.onPlaying(false);
      } else p.onCursor(next);
    }, 120);
    return () => clearInterval(id);
  }, [p.playing, p.cursor, p.end, span, p]);

  const pos = (p.cursor - p.start) / span;
  const winFrac = p.mode === 'window' ? Math.min(1, p.windowMs / span) : pos;

  return (
    <section className="timeline" aria-label="Timeline">
      <div className="tl-controls">
        <button
          className="btn"
          onClick={() => {
            if (!p.playing && p.cursor >= p.end) p.onCursor(p.start);
            p.onPlaying(!p.playing);
          }}
          aria-label={p.playing ? 'Pause' : 'Play'}
        >
          {p.playing ? '❚❚' : '▶'}
        </button>
        <div className="seg" role="radiogroup" aria-label="View">
          <button className={p.mode === 'cumulative' ? 'on' : ''} onClick={() => p.onMode('cumulative')} role="radio" aria-checked={p.mode === 'cumulative'}>
            Cumulative
          </button>
          <button className={p.mode === 'window' ? 'on' : ''} onClick={() => p.onMode('window')} role="radio" aria-checked={p.mode === 'window'}>
            Moving window
          </button>
        </div>
        {p.mode === 'window' && (
          <select value={p.windowMs} onChange={(e) => p.onWindow(Number(e.target.value))} aria-label="Window size">
            {WINDOWS.filter((w) => w.ms < span).map((w) => (
              <option key={w.ms} value={w.ms}>
                {w.label}
              </option>
            ))}
          </select>
        )}
        <span className="tl-time">{p.cursor >= p.end ? 'Now' : formatTime(p.cursor)}</span>
        {p.cursor < p.end && (
          <button className="link" onClick={() => p.onCursor(p.end)}>
            Jump to now
          </button>
        )}
      </div>
      <div className="tl-track">
        <div className="tl-hist" aria-hidden>
          {bins.map((v, i) => (
            <i key={i} style={{ height: `${Math.max(v * 100, v ? 8 : 0)}%` }} />
          ))}
        </div>
        <div className="tl-window" style={{ left: `${(pos - winFrac) * 100}%`, width: `${winFrac * 100}%` }} aria-hidden />
        <input
          type="range"
          min={p.start}
          max={p.end}
          step={span / 1000}
          value={p.cursor}
          onChange={(e) => {
            p.onPlaying(false);
            p.onCursor(Number(e.target.value));
          }}
          aria-label="Timeline position"
        />
      </div>
      <div className="tl-ends">
        <span>{formatTime(p.start)}</span>
        <span>Now</span>
      </div>
    </section>
  );
}
