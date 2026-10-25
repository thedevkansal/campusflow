import { Injectable } from '@nestjs/common';
import { AppConfigService } from '@common/config/app-config.service';
import { Route, RoutingService } from './routing.service';

export interface FareEstimate extends Route {
  estimatedFare: number;
}

@Injectable()
export class FareEngineService {
  constructor(
    private readonly config: AppConfigService,
    private readonly routing: RoutingService,
  ) {}

  /** Calculate fare for a given distance. */
  fareForDistance(distKm: number): number {
    return parseFloat(
      (this.config.fareBaseFare + distKm * this.config.farePerKmRate).toFixed(2),
    );
  }

  /**
   * Road distance + fare from coordinates. Falls back to straight-line
   * distance when the router is unavailable (see RoutingService).
   */
  async estimate(lat1: number, lng1: number, lat2: number, lng2: number): Promise<FareEstimate> {
    const route = await this.routing.route(lat1, lng1, lat2, lng2);
    // Match the DB column precision (Decimal(10, 3)) so estimate == stored value.
    const distanceKm = parseFloat(route.distanceKm.toFixed(3));
    return { ...route, distanceKm, estimatedFare: this.fareForDistance(distanceKm) };
  }
}
