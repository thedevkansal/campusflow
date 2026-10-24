'use client';

import { useEffect, useMemo } from 'react';
import L from 'leaflet';
import { MapContainer, TileLayer, Marker, Polyline, Tooltip, ZoomControl, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import type { MapProps } from './map';

const CAMPUS_CENTER: [number, number] = [12.9716, 77.5946];

// Pins are drawn with the same vocabulary as the route line (see globals.css).
const pin = (kind: 'from' | 'to' | 'driver') =>
  L.divIcon({
    className: '',
    html: `<span class="cf-pin cf-pin-${kind}"></span>`,
    iconSize: kind === 'driver' ? [22, 22] : [18, 18],
    iconAnchor: kind === 'driver' ? [11, 11] : [9, 9],
  });

function FitToRoute({ points }: { points: [number, number][] }) {
  const map = useMap();
  const key = points.map((p) => p.join(',')).join('|');
  useEffect(() => {
    if (points.length >= 2) {
      // On desktop the ride sheet floats over the left ~500px, so keep the route clear of it.
      const sheetOverlap = map.getSize().x >= 1024 ? 520 : 0;
      map.fitBounds(L.latLngBounds(points), {
        paddingTopLeft: [56 + sheetOverlap, 56],
        paddingBottomRight: [56, 56],
        maxZoom: 17,
      });
    } else if (points.length === 1) {
      map.setView(points[0], 16);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, map]);
  return null;
}

export default function MapInner({ pickup, destination, driver }: MapProps) {
  const icons = useMemo(() => ({ from: pin('from'), to: pin('to'), driver: pin('driver') }), []);

  // Frame the stops; the driver only moves the view when there is no route yet.
  const framePoints: [number, number][] = [];
  if (pickup) framePoints.push([pickup.lat, pickup.lng]);
  if (destination) framePoints.push([destination.lat, destination.lng]);
  if (!framePoints.length && driver) framePoints.push([driver.lat, driver.lng]);

  return (
    <MapContainer
      center={framePoints[0] ?? CAMPUS_CENTER}
      zoom={16}
      scrollWheelZoom={false}
      zoomControl={false}
      style={{ height: '100%', width: '100%' }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <ZoomControl position="bottomright" />
      <FitToRoute points={framePoints} />

      {pickup && destination && (
        <>
          {/* White casing + teal core so the route reads on any map tile */}
          <Polyline
            positions={[[pickup.lat, pickup.lng], [destination.lat, destination.lng]]}
            pathOptions={{ color: '#ffffff', weight: 10, opacity: 0.95, lineCap: 'round' }}
          />
          <Polyline
            positions={[[pickup.lat, pickup.lng], [destination.lat, destination.lng]]}
            pathOptions={{ color: '#0b7f68', weight: 5, lineCap: 'round' }}
          />
        </>
      )}

      {pickup && (
        <Marker position={[pickup.lat, pickup.lng]} icon={icons.from} title={pickup.label || 'Pickup'}>
          <Tooltip direction="top" offset={[0, -10]}>{pickup.label || 'Pickup'}</Tooltip>
        </Marker>
      )}
      {destination && (
        <Marker position={[destination.lat, destination.lng]} icon={icons.to} title={destination.label || 'Destination'}>
          <Tooltip direction="top" offset={[0, -10]}>{destination.label || 'Destination'}</Tooltip>
        </Marker>
      )}
      {driver && (
        <Marker position={[driver.lat, driver.lng]} icon={icons.driver} title={driver.label || 'Driver'} zIndexOffset={500}>
          <Tooltip direction="top" offset={[0, -12]}>{driver.label || 'Driver'}</Tooltip>
        </Marker>
      )}
    </MapContainer>
  );
}
