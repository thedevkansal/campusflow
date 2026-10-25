// IIT Roorkee campus. Coordinates are from OpenStreetMap.

// Map centre and the fallback position when geolocation is unavailable.
export const CAMPUS_CENTER = { lat: 29.86635, lng: 77.89621 } as const;

// Quick-pick pickup / drop-off points. Passengers can also use their current
// location or tap anywhere on the map; ride requests always send real
// coordinates so matching, fare estimates and the map reflect the chosen route.
export const CAMPUS_PLACES = [
  // Just inside the gate: the gate node itself snaps to the road outside campus,
  // which makes road routes loop around the north end.
  { id: 'main-gate', name: 'Main Gate', lat: 29.8654, lng: 77.89 },
  { id: 'main-building', name: 'Main Building', lat: 29.86465, lng: 77.89657 },
  { id: 'central-library', name: 'Mahatma Gandhi Central Library', lat: 29.86531, lng: 77.89477 },
  { id: 'lhc', name: 'New Lecture Hall Complex', lat: 29.86482, lng: 77.8939 },
  { id: 'sac', name: 'Student Activity Centre', lat: 29.86652, lng: 77.89973 },
  { id: 'mac', name: 'Multi Activity Centre (MAC)', lat: 29.87014, lng: 77.89636 },
  { id: 'hospital', name: 'Institute Hospital', lat: 29.86172, lng: 77.89292 },
  { id: 'convocation-hall', name: 'Convocation Hall', lat: 29.86818, lng: 77.89095 },
  { id: 'rajendra-bhawan', name: 'Rajendra Bhawan', lat: 29.87101, lng: 77.89408 },
  { id: 'govind-bhawan', name: 'Govind Bhawan', lat: 29.86203, lng: 77.89447 },
  { id: 'kasturba-bhawan', name: 'Kasturba Bhawan', lat: 29.86722, lng: 77.90069 },
  { id: 'lbs-stadium', name: 'LBS Stadium', lat: 29.86712, lng: 77.89531 },
] as const;
