'use client';

import { useEffect, useMemo } from 'react';
import L from 'leaflet';
import { MapContainer, TileLayer, Marker, Polyline, Tooltip, ZoomControl, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import type { LatLng, MapProps } from './map';
import { CAMPUS_CENTER } from '@/lib/campus';

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

function ClickHandler({ onClick }: { onClick: (point: LatLng) => void }) {
  useMapEvents({ click: (e) => onClick({ lat: e.latlng.lat, lng: e.latlng.lng }) });
  return null;
}

const dragEnd = (cb?: (point: LatLng) => void) =>
  cb && {
    dragend: (e: L.LeafletEvent) => {
      const { lat, lng } = (e.target as L.Marker).getLatLng();
      cb({ lat, lng });
    },
  };

export default function MapInner({
  pickup,
  destination,
  driver,
  route,
  onMapClick,
  onPickupDrag,
  onDestinationDrag,
}: MapProps) {
  const icons = useMemo(() => ({ from: pin('from'), to: pin('to'), driver: pin('driver') }), []);

  // Frame the stops; the driver only moves the view when there is no route yet.
  const framePoints: [number, number][] = [];
  if (pickup) framePoints.push([pickup.lat, pickup.lng]);
  if (destination) framePoints.push([destination.lat, destination.lng]);
  if (!framePoints.length && driver) framePoints.push([driver.lat, driver.lng]);

  const line: [number, number][] | null =
    pickup && destination
      ? route && route.length >= 2
        ? route
        : [[pickup.lat, pickup.lng], [destination.lat, destination.lng]]
      : null;

  return (
    <MapContainer
      center={framePoints[0] ?? [CAMPUS_CENTER.lat, CAMPUS_CENTER.lng]}
      zoom={16}
      scrollWheelZoom={false}
      zoomControl={false}
      style={{ height: '100%', width: '100%', cursor: onMapClick ? 'crosshair' : undefined }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <ZoomControl position="bottomright" />
      <FitToRoute points={framePoints} />
      {onMapClick && <ClickHandler onClick={onMapClick} />}

      {line && (
        <>
          {/* White casing + teal core so the route reads on any map tile */}
          <Polyline
            positions={line}
            pathOptions={{ color: '#ffffff', weight: 10, opacity: 0.95, lineCap: 'round', lineJoin: 'round' }}
          />
          <Polyline positions={line} pathOptions={{ color: '#0b7f68', weight: 5, lineCap: 'round', lineJoin: 'round' }} />
        </>
      )}

      {pickup && (
        <Marker
          position={[pickup.lat, pickup.lng]}
          icon={icons.from}
          title={pickup.label || 'Pickup'}
          draggable={!!onPickupDrag}
          eventHandlers={dragEnd(onPickupDrag)}
        >
          <Tooltip direction="top" offset={[0, -10]}>{pickup.label || 'Pickup'}</Tooltip>
        </Marker>
      )}
      {destination && (
        <Marker
          position={[destination.lat, destination.lng]}
          icon={icons.to}
          title={destination.label || 'Destination'}
          draggable={!!onDestinationDrag}
          eventHandlers={dragEnd(onDestinationDrag)}
        >
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
