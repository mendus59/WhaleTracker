import { useEffect } from 'react';
import { CircleMarker, MapContainer, Polyline, Popup, TileLayer, Tooltip, useMap } from 'react-leaflet';
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
  onSelect: (s?: Sighting) => void;
}

function FlyTo({ s }: { s?: Sighting }) {
  const map = useMap();
  useEffect(() => {
    if (s) map.flyTo([s.lat, s.lng], Math.max(map.getZoom(), 11), { duration: 0.6 });
  }, [s, map]);
  return null;
}

export function SightingMap({ sightings, tracks, predictions, cursor, fadeOverMs, selected, onSelect }: Props) {
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
      <FlyTo s={selected} />

      {tracks
        .filter((t) => t.points.length > 1)
        .map((t) => (
          <Polyline
            key={t.key}
            positions={t.points.map((p) => [p.lat, p.lng])}
            pathOptions={{ color: SPECIES[t.points[0].species].color, weight: 2, opacity: 0.55 }}
          />
        ))}

      {predictions.map((p) => (
        <Polyline
          key={`pred-${p.trackKey}`}
          positions={[p.from, ...p.path]}
          pathOptions={{ color: '#e11d48', weight: 3, dashArray: '6 8', opacity: 0.4 + 0.5 * p.confidence }}
        >
          <Tooltip sticky>
            <strong>Predicted path: {p.label}</strong>
            <br />
            Heading {compassPoint(p.bearing)} at ~{p.speedKmh} km/h · next 3 h
            <br />
            Confidence {Math.round(p.confidence * 100)}% (from {p.basedOn} reports, last {timeAgo(p.lastSeen, cursor)})
          </Tooltip>
        </Polyline>
      ))}

      {sightings.map((s) => {
        const age = Math.max(0, cursor - s.time);
        const opacity = Math.max(0.25, 1 - age / fadeOverMs);
        const isSel = selected?.id === s.id;
        return (
          <CircleMarker
            key={s.id}
            center={[s.lat, s.lng]}
            radius={isSel ? 10 : s.species === 'orca' ? 7 : 6}
            pathOptions={{
              color: isSel ? '#e11d48' : '#fff',
              weight: isSel ? 3 : 1.5,
              fillColor: SPECIES[s.species].color,
              fillOpacity: opacity,
              opacity: Math.max(opacity, 0.6),
            }}
            eventHandlers={{ click: () => onSelect(s) }}
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
