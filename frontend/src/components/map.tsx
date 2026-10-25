'use client';

import dynamic from 'next/dynamic';
import { cn } from '@/lib/utils';

export interface Location {
  lat: number;
  lng: number;
  label?: string;
}

export interface LatLng {
  lat: number;
  lng: number;
}

export interface MapProps {
  pickup?: Location;
  destination?: Location;
  driver?: Location;
  /** Road route as [lat, lng] pairs; a straight pickup→destination line is drawn when absent. */
  route?: [number, number][];
  /** Makes the map tappable, e.g. to drop a pickup or destination pin. */
  onMapClick?: (point: LatLng) => void;
  /** Makes the pickup pin draggable. */
  onPickupDrag?: (point: LatLng) => void;
  /** Makes the destination pin draggable. */
  onDestinationDrag?: (point: LatLng) => void;
  className?: string;
}

// Leaflet touches `window`, so the map only renders on the client.
const MapInner = dynamic(() => import('./map-inner'), {
  ssr: false,
  loading: () => <div className="skeleton size-full rounded-none" aria-hidden />,
});

export function Map({ className, ...props }: MapProps) {
  return (
    <div
      className={cn('map-muted relative isolate overflow-hidden bg-sunken', className ?? 'h-64 w-full rounded-xl')}
      role="region"
      aria-label="Map"
    >
      <MapInner {...props} />
    </div>
  );
}
