/**
 * Mock data for E2E tests
 */

export const mockRoutes = [
  {
    id: 'route-1',
    name: 'Solent Crossing',
    startPoint: { lat: 50.7580, lng: -1.2950, name: 'Cowes' },
    endPoint: { lat: 50.8023, lng: -1.1015, name: 'Portsmouth' },
    country: 'GB',
    approved: true,
    approvalDate: '2024-01-15',
    description: 'Classic Solent crossing route'
  },
  {
    id: 'route-2',
    name: 'Thames Estuary Sprint',
    startPoint: { lat: 51.5074, lng: 0.1278, name: 'London Bridge' },
    endPoint: { lat: 51.4894, lng: 0.5707, name: 'Southend' },
    country: 'GB',
    approved: false,
    description: 'Fast downstream Thames route'
  }
];

export const mockFKTAttempts = [
  {
    id: 'attempt-1',
    routeId: 'route-1',
    athleteId: 'athlete-1',
    rigSize: 7,
    completionTime: '02:45:30',
    completionDate: '2024-02-01',
    windConditions: '15-20 knots SW',
    currentConditions: 'Moderate flood tide',
    writeup: 'Perfect conditions with strong southwesterly winds...',
    photos: ['photo1.jpg', 'photo2.jpg'],
    gpxFile: 'attempt-1.gpx',
    isCurrentFKT: true
  },
  {
    id: 'attempt-2',
    routeId: 'route-1',
    athleteId: 'athlete-2',
    rigSize: 7,
    completionTime: '02:52:15',
    completionDate: '2024-01-20',
    windConditions: '12-15 knots NW',
    currentConditions: 'Slack water',
    writeup: 'Challenging light wind conditions...',
    photos: ['photo3.jpg'],
    gpxFile: 'attempt-2.gpx',
    isCurrentFKT: false
  }
];

export const mockAthletes = [
  {
    id: 'athlete-1',
    name: 'Sarah Mitchell',
    email: 'sarah@example.com',
    avatar: 'sarah-avatar.jpg',
    totalAttempts: 5,
    currentFKTs: 2,
    joinDate: '2023-08-15'
  },
  {
    id: 'athlete-2',
    name: 'James Wilson',
    email: 'james@example.com',
    avatar: 'james-avatar.jpg',
    totalAttempts: 8,
    currentFKTs: 1,
    joinDate: '2023-06-20'
  }
];

export const rigSizes = [5, 6, 7, 9]; // RS Aero rig sizes

export const mockTrackPoints = [
  { lat: 50.7580, lng: -1.2950, timestamp: '2024-02-01T10:00:00Z', speed: 0.0 },
  { lat: 50.7585, lng: -1.2945, timestamp: '2024-02-01T10:01:00Z', speed: 8.2 },
  { lat: 50.7590, lng: -1.2940, timestamp: '2024-02-01T10:02:00Z', speed: 12.5 },
  { lat: 50.7600, lng: -1.2930, timestamp: '2024-02-01T10:03:00Z', speed: 15.8 },
  { lat: 50.7620, lng: -1.2900, timestamp: '2024-02-01T10:05:00Z', speed: 18.3 },
  { lat: 50.7650, lng: -1.2850, timestamp: '2024-02-01T10:08:00Z', speed: 16.7 },
  { lat: 50.7680, lng: -1.2800, timestamp: '2024-02-01T10:12:00Z', speed: 14.2 },
  { lat: 50.7720, lng: -1.2700, timestamp: '2024-02-01T10:18:00Z', speed: 19.5 }
];

export const createMockGPX = (trackPoints = mockTrackPoints): string => {
  const points = trackPoints.map(point =>
    `      <trkpt lat="${point.lat}" lon="${point.lng}">
        <time>${point.timestamp}</time>
        <speed>${point.speed}</speed>
      </trkpt>`
  ).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="RS Aero FKT Test">
  <metadata>
    <name>Test FKT Attempt</name>
    <time>${trackPoints[0]?.timestamp}</time>
  </metadata>
  <trk>
    <name>Test Route</name>
    <trkseg>
${points}
    </trkseg>
  </trk>
</gpx>`;
};

export const mockSOGData = [
  { time: 0, speed: 0.0 },
  { time: 60, speed: 8.2 },
  { time: 120, speed: 12.5 },
  { time: 180, speed: 15.8 },
  { time: 300, speed: 18.3 },
  { time: 480, speed: 16.7 },
  { time: 720, speed: 14.2 },
  { time: 1080, speed: 19.5 }
];

export const mockUser = {
  id: 'user-test',
  name: 'Test User',
  email: 'test@example.com',
  avatar: null,
  role: 'athlete'
};

export const mockAdminUser = {
  id: 'admin-test',
  name: 'Test Admin',
  email: 'admin@example.com',
  avatar: null,
  role: 'admin'
};