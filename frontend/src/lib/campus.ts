// Campus pickup / drop-off points. Ride requests send these real coordinates so
// matching, fare estimates and the map all reflect the chosen route.
export const CAMPUS_PLACES = [
  { id: 'main-gate', name: 'Main Gate', lat: 12.9716, lng: 77.5946 },
  { id: 'library', name: 'Library', lat: 12.978, lng: 77.598 },
  { id: 'academic-block', name: 'Academic Block', lat: 12.9748, lng: 77.5962 },
  { id: 'hostels', name: 'Hostels', lat: 12.9695, lng: 77.5992 },
  { id: 'sports-complex', name: 'Sports Complex', lat: 12.9762, lng: 77.5918 },
  { id: 'cafeteria', name: 'Cafeteria', lat: 12.9731, lng: 77.5975 },
] as const;
