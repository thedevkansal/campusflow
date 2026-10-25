import { AppConfigService } from '@common/config/app-config.service';
import { FareEngineService } from './fare-engine.service';
import { RoutingService } from './routing.service';

// Main Gate → Central Library, IIT Roorkee
const GATE = [29.8654, 77.89] as const;
const LIBRARY = [29.86531, 77.89477] as const;

function makeEngine(routingUrl = 'https://osrm.test') {
  const config = {
    fareBaseFare: 50,
    farePerKmRate: 12,
    routingUrl,
    routingTimeoutMs: 1000,
  } as unknown as AppConfigService;
  const routing = new RoutingService(config);
  return { engine: new FareEngineService(config, routing), routing };
}

function osrmResponse(distanceM: number, durationS: number) {
  return {
    ok: true,
    json: async () => ({
      code: 'Ok',
      routes: [{
        distance: distanceM,
        duration: durationS,
        geometry: { coordinates: [[GATE[1], GATE[0]], [77.8925, 29.8656], [LIBRARY[1], LIBRARY[0]]] },
      }],
    }),
  } as Response;
}

describe('FareEngineService', () => {
  const fetchMock = jest.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  it('prices the road distance and returns the route as [lat, lng]', async () => {
    fetchMock.mockResolvedValue(osrmResponse(620, 90));
    const { engine } = makeEngine();

    const est = await engine.estimate(...GATE, ...LIBRARY);

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/route/v1/driving/77.89,29.8654;77.89477,29.86531'),
      expect.anything(),
    );
    expect(est.source).toBe('road');
    expect(est.distanceKm).toBe(0.62);
    expect(est.estimatedFare).toBe(57.44); // 50 + 0.62 × 12
    expect(est.durationMin).toBeCloseTo(1.5);
    expect(est.geometry[0]).toEqual([GATE[0], GATE[1]]);
  });

  it('falls back to straight-line distance when the router fails', async () => {
    fetchMock.mockRejectedValue(new Error('timeout'));
    const { engine, routing } = makeEngine();

    const est = await engine.estimate(...GATE, ...LIBRARY);

    const straight = parseFloat(routing.haversineKm(...GATE, ...LIBRARY).toFixed(3));
    expect(est.source).toBe('straight-line');
    expect(est.distanceKm).toBe(straight);
    expect(est.estimatedFare).toBe(engine.fareForDistance(straight));
    expect(est.durationMin).toBeNull();
    expect(est.geometry).toEqual([[GATE[0], GATE[1]], [LIBRARY[0], LIBRARY[1]]]);
  });

  it('falls back when the router finds no route', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ code: 'NoRoute', routes: [] }) } as Response);
    const { engine } = makeEngine();

    expect((await engine.estimate(...GATE, ...LIBRARY)).source).toBe('straight-line');
  });

  it('skips the router entirely when ROUTING_URL is empty', async () => {
    const { engine } = makeEngine('');

    const est = await engine.estimate(...GATE, ...LIBRARY);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(est.source).toBe('straight-line');
  });

  it('reuses the cached route so the quote and the booking match', async () => {
    fetchMock.mockResolvedValue(osrmResponse(620, 90));
    const { engine } = makeEngine();

    const quote = await engine.estimate(...GATE, ...LIBRARY);
    const booking = await engine.estimate(...GATE, ...LIBRARY);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(booking.estimatedFare).toBe(quote.estimatedFare);
  });
});
