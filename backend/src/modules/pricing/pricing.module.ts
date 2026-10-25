import { Global, Module } from '@nestjs/common';
import { FareEngineService } from './fare-engine.service';
import { RoutingService } from './routing.service';

@Global()
@Module({
  providers: [FareEngineService, RoutingService],
  exports: [FareEngineService, RoutingService],
})
export class PricingModule {}
