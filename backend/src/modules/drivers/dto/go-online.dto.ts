/**
 * GoOnlineDto — optional payload for POST /drivers/online.
 *
 * When the driver's position is sent along, they are added to the geo index
 * immediately and can be matched before their first location heartbeat.
 * Latitude and longitude must be sent together.
 */

import { IsNumber, Max, Min, ValidateIf } from 'class-validator';

const hasPosition = (o: GoOnlineDto) => o.latitude !== undefined || o.longitude !== undefined;

export class GoOnlineDto {
  @ValidateIf(hasPosition)
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number;

  @ValidateIf(hasPosition)
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number;
}
