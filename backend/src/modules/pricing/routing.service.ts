import { Injectable, Logger } from '@nestjs/common';
import { AppConfigService } from '@common/config/app-config.service';

export interface Route {
  distanceKm: number;
  /** Driving time from the router; null for straight-line fallback. */
  durationMin: number | null;
  /** Route polyline as [lat, lng] pairs (pickup first). */
  geometry: [number, number][];
  /** 'road' when the router answered, 'straight-line' when we fell back. */
  source: 'road' | 'straight-line';
}

const CACHE_MAX_ENTRIES = 500;
const CACHE_TTL_MS = 10 * 60 * 1000;

/**
 * Road routing via an OSRM-compatible server.
 *
 * Every failure (disabled, timeout, network, no route) falls back to the
 * straight-line distance so ride requests never depend on the router being up.
 * Results are cached in memory so the estimate the passenger saw and the fare
 * stored on POST /rides come from one router call.
 */
@Injectable()
export class RoutingService {
  private readonly logger = new Logger(RoutingService.name);
  private readonly cache = new Map<string, { route: Route; expiresAt: number }>();

  constructor(private readonly config: AppConfigService) {}

  async route(lat1: number, lng1: number, lat2: number, lng2: number): Promise<Route> {
    const key = [lat1, lng1, lat2, lng2].map((n) => n.toFixed(5)).join(',');
    const cached = this.cache.get(key);
    if (cached && cached.expiresAt > Date.now()) return cached.route;

    const road = await this.fetchRoadRoute(lat1, lng1, lat2, lng2);
    if (!road) return this.straightLine(lat1, lng1, lat2, lng2);

    if (this.cache.size >= CACHE_MAX_ENTRIES) {
      // Map keeps insertion order — drop the oldest entry.
      this.cache.delete(this.cache.keys().next().value!);
    }
    this.cache.set(key, { route: road, expiresAt: Date.now() + CACHE_TTL_MS });
    return road;
  }

  /** Haversine great-circle distance in km. */
  haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  private straightLine(lat1: number, lng1: number, lat2: number, lng2: number): Route {
    return {
      distanceKm: this.haversineKm(lat1, lng1, lat2, lng2),
      durationMin: null,
      geometry: [[lat1, lng1], [lat2, lng2]],
      source: 'straight-line',
    };
  }

  private async fetchRoadRoute(
    lat1: number, lng1: number, lat2: number, lng2: number,
  ): Promise<Route | null> {
    const base = this.config.routingUrl.replace(/\/+$/, '');
    if (!base) return null;

    // OSRM takes lng,lat order.
    const url =
      `${base}/route/v1/driving/${lng1},${lat1};${lng2},${lat2}` +
      '?overview=full&geometries=geojson&alternatives=false&steps=false';

    try {
      const res = await fetch(url, {
        signal: AbortSignal.timeout(this.config.routingTimeoutMs),
        headers: { 'User-Agent': 'CampusFlow/1.0' },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const body = (await res.json()) as {
        code?: string;
        routes?: { distance: number; duration: number; geometry: { coordinates: [number, number][] } }[];
      };
      const best = body.routes?.[0];
      if (body.code !== 'Ok' || !best) throw new Error(`no route (code=${body.code})`);

      return {
        distanceKm: best.distance / 1000,
        durationMin: best.duration / 60,
        geometry: best.geometry.coordinates.map(([lng, lat]) => [lat, lng]),
        source: 'road',
      };
    } catch (err) {
      this.logger.warn(`Road routing failed, using straight line: ${(err as Error).message}`);
      return null;
    }
  }
}
