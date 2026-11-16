import { useEffect, useRef } from 'react';
import { CircleMarker, MapContainer, Polyline, Popup, TileLayer, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { REGION } from '../config/region';
import { SPECIES } from '../lib/species';
import { compassPoint, type Prediction, type Track } from '../lib/tracks';
import { formatTime, timeAgo } from '../lib/format';
import type { Sighting } from '../types';
import { SightingDetails } from './SightingDetails';

interface Props {
  sightings: Sighting[];
  tracks: Track[];
  predictions: Prediction[];
  cursor: number;
  fadeOverMs: number;
  selected?: Sighting;
  /** Track to highlight, identified by its latest sighting id. */
  selectedTrackId?: string;
  /** Bumped on every list click so re-clicking the same item re-centres. */
  focusNonce: number;
  onSelect: (s?: Sighting) => void;
  onSelectTrack: (lastId?: string) => void;
}

const FOCUS_ZOOM = 13;

/** Moves the map to whatever is selected and opens its popup. */
function FocusController({
  selected,
  track,
  prediction,
  nonce,
  markers,
}: {
  selected?: Sighting;
  track?: Track;
  prediction?: Prediction;
  nonce: number;
  markers: React.MutableRefObject<Map<string, L.CircleMarker>>;
}) {
  const map = useMap();
  useEffect(() => {
    if (!nonce) return;
    if (track && track.points.length > 1) {
      const pts: [number, number][] = [...track.points.map((p) => [p.lat, p.lng] as [number, number]), ...(prediction?.path ?? [])];
      map.flyToBounds(L.latLngBounds(pts), { padding: [48, 48], maxZoom: FOCUS_ZOOM, duration: 0.8 });
    } else if (selected) {
      map.flyTo([selected.lat, selected.lng], Math.max(map.getZoom(), FOCUS_ZOOM), { duration: 0.8 });
    }
    if (selected) {
      const open = () => markers.current.get(selected.id)?.openPopup();
      map.once('moveend', open);
      return () => {
        map.off('moveend', open);
      };
    }
    // Only react to explicit focus requests, not to data refreshes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nonce]);
  return null;
}

export function SightingMap({
  sightings,
  tracks,
  predictions,
  cursor,
  fadeOverMs,
  selected,
  selectedTrackId,
  focusNonce,
  onSelect,
  onSelectTrack,
}: Props) {
  const markers = useRef(new Map<string, L.CircleMarker>());
  const track = selectedTrackId ? tracks.find((t) => t.points.some((p) => p.id === selectedTrackId)) : undefined;
  const prediction = track ? predictions.find((p) => track.points.some((pt) => pt.id === p.lastId)) : undefined;
  const trackIds = new Set(track?.points.map((p) => p.id));
  const dim = !!track;

  return (
    <MapContainer
      center={REGION.center}
      zoom={REGION.zoom}
      minZoom={7}
      maxBounds={[
        [REGION.south - 1, REGION.west - 1.5],
        [REGION.north + 1, REGION.east + 1.5],
      ]}
      className="map"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FocusController selected={selected} track={track} prediction={prediction} nonce={focusNonce} markers={markers} />

      {tracks
        .filter((t) => t.points.length > 1)
        .map((t) => {
          const on = t === track;
          return (
            <Polyline
              key={t.key}
              positions={t.points.map((p) => [p.lat, p.lng])}
              pathOptions={{
                color: on ? '#e11d48' : SPECIES[t.points[0].species].color,
                weight: on ? 4 : 2,
                opacity: on ? 0.9 : dim ? 0.15 : 0.55,
              }}
              eventHandlers={{ click: () => onSelectTrack(t.points[t.points.length - 1].id) }}
            />
          );
        })}

      {predictions.map((p) => {
        const on = p === prediction;
        return (
          <Polyline
            key={`pred-${p.trackKey}`}
            positions={[p.from, ...p.path]}
            pathOptions={{
              color: '#e11d48',
              weight: on ? 4 : 3,
              dashArray: '6 8',
              opacity: dim && !on ? 0.15 : 0.4 + 0.5 * p.confidence,
            }}
            eventHandlers={{ click: () => onSelectTrack(p.lastId) }}
          >
            <Tooltip sticky>
              <strong>Predicted path: {p.label}</strong>
              <br />
              Heading {compassPoint(p.bearing)} at ~{p.speedKmh} km/h · next 3 h
              <br />
              Confidence {Math.round(p.confidence * 100)}% (from {p.basedOn} reports, last {timeAgo(p.lastSeen, cursor)})
            </Tooltip>
          </Polyline>
        );
      })}

      {sightings.map((s) => {
        const age = Math.max(0, cursor - s.time);
        const fade = Math.max(0.25, 1 - age / fadeOverMs);
        const isSel = selected?.id === s.id;
        const inTrack = trackIds.has(s.id);
        const opacity = dim && !inTrack && !isSel ? 0.12 : fade;
        return (
          <CircleMarker
            key={s.id}
            ref={(m) => {
              if (m) markers.current.set(s.id, m);
              else markers.current.delete(s.id);
            }}
            center={[s.lat, s.lng]}
            radius={isSel ? 11 : inTrack ? 8 : s.species === 'orca' ? 7 : 6}
            pathOptions={{
              color: isSel || inTrack ? '#e11d48' : '#fff',
              weight: isSel ? 4 : inTrack ? 2.5 : 1.5,
              fillColor: SPECIES[s.species].color,
              fillOpacity: opacity,
              opacity: dim && !inTrack && !isSel ? 0.2 : Math.max(opacity, 0.6),
            }}
            eventHandlers={{
              click: () => onSelect(s),
              add: (e) => isSel && (e.target as L.CircleMarker).bringToFront(),
            }}
          >
            <Tooltip direction="top">
              {SPECIES[s.species].label}
              {s.pods.length ? ` · ${s.pods.join('/')} pod` : ''} · {formatTime(s.time)}
            </Tooltip>
            <Popup>
              <SightingDetails s={s} />
            </Popup>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}
