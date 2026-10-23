// Presentation-only view of the ride state machine (docs/RIDE_STATE_MACHINE.md).
// The lifecycle is drawn as a transit line; each status maps to a stop on it.

export const RIDE_STOPS = [
  { key: 'requested', label: 'Requested' },
  { key: 'assigned', label: 'Driver assigned' },
  { key: 'on-the-way', label: 'On the way' },
  { key: 'arrived', label: 'At pickup' },
  { key: 'in-ride', label: 'In ride' },
  { key: 'done', label: 'Arrived' },
] as const;

const STOP_INDEX: Record<string, number> = {
  REQUESTED: 0,
  SEARCHING: 0,
  ASSIGNED: 1,
  ACCEPTED: 2,
  ARRIVING: 3,
  IN_PROGRESS: 4,
  COMPLETED: 5,
};

export const ENDED_STATUSES = ['PASSENGER_CANCELLED', 'DRIVER_CANCELLED', 'NO_DRIVER_FOUND', 'TIMED_OUT'];

export function stopIndex(status: string): number {
  return STOP_INDEX[status] ?? -1;
}

/** What the passenger needs to know right now, in their words. */
export const PASSENGER_STATUS: Record<string, { title: string; detail: string }> = {
  REQUESTED: { title: 'Finding your driver', detail: 'Matching you with the closest available driver.' },
  SEARCHING: { title: 'Finding your driver', detail: 'Matching you with the closest available driver.' },
  ASSIGNED: { title: 'Driver assigned', detail: 'Waiting for your driver to confirm.' },
  ACCEPTED: { title: 'Driver on the way', detail: 'Head to your pickup point.' },
  ARRIVING: { title: 'Driver at pickup', detail: 'Check the number plate before you get on.' },
  IN_PROGRESS: { title: 'On your way', detail: 'Enjoy the ride.' },
  COMPLETED: { title: 'You’ve arrived', detail: 'Thanks for riding.' },
  PASSENGER_CANCELLED: { title: 'Ride cancelled', detail: 'You cancelled this ride.' },
  DRIVER_CANCELLED: { title: 'Driver cancelled', detail: 'Request again and we’ll find another driver.' },
  NO_DRIVER_FOUND: { title: 'No driver free right now', detail: 'Try again in a minute.' },
  TIMED_OUT: { title: 'Request timed out', detail: 'Try again in a minute.' },
};

/** What the driver needs to do right now. */
export const DRIVER_STATUS: Record<string, { title: string; detail: string }> = {
  ASSIGNED: { title: 'New ride request', detail: 'Accept to confirm with the passenger.' },
  ACCEPTED: { title: 'Head to pickup', detail: 'Tap “I’ve arrived” when you reach the stop.' },
  ARRIVING: { title: 'Waiting at pickup', detail: 'Start the ride once the passenger is on.' },
  IN_PROGRESS: { title: 'Ride in progress', detail: 'Complete the ride at the destination.' },
  COMPLETED: { title: 'Ride complete', detail: 'Nice one.' },
};

export function shortRideId(id: string) {
  return id.slice(-6).toUpperCase();
}
