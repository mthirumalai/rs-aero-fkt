import { parseGpxXml } from '../gpx/parser';
import { parseVccXml } from '../velocitek/vcc-parser';
import { validateGpxTrack } from '../gpx/validator';
import { computeSog, computeAvgMaxSog } from '../gpx/sog';

describe('File Processing Integration Tests', () => {

  // Route coordinates for Southport to Sneads Ferry
  const ROUTE_START_LAT = 33.948889;
  const ROUTE_START_LNG = -78.011667;
  const ROUTE_END_LAT = 34.518056;
  const ROUTE_END_LNG = -77.448056;
  const TOLERANCE_M = 10;

  describe('GPX File Processing Pipeline', () => {
    test('should process valid GPX file from upload to SOG calculation', () => {
      // Simulate uploaded GPX file content
      const gpxContent = `<?xml version="1.0"?>
<gpx version="1.1" creator="Velocitek SpeedPuck">
  <trk>
    <name>Southport to Sneads Ferry FKT</name>
    <trkseg>
      <trkpt lat="33.948889" lon="-78.011667">
        <time>2024-03-15T12:00:00Z</time>
      </trkpt>
      <trkpt lat="33.960000" lon="-78.000000">
        <time>2024-03-15T12:15:00Z</time>
      </trkpt>
      <trkpt lat="34.200000" lon="-77.700000">
        <time>2024-03-15T12:45:00Z</time>
      </trkpt>
      <trkpt lat="34.400000" lon="-77.550000">
        <time>2024-03-15T13:10:00Z</time>
      </trkpt>
      <trkpt lat="34.518056" lon="-77.448056">
        <time>2024-03-15T13:30:00Z</time>
      </trkpt>
    </trkseg>
  </trk>
</gpx>`;

      // Step 1: Parse GPX file (simulates file upload parsing)
      const parsedGpx = parseGpxXml(gpxContent);

      expect(parsedGpx.points).toHaveLength(5);
      expect(parsedGpx.startTime).toEqual(new Date('2024-03-15T12:00:00Z'));
      expect(parsedGpx.endTime).toEqual(new Date('2024-03-15T13:30:00Z'));
      expect(parsedGpx.durationSec).toBe(5400); // 90 minutes

      // Step 2: Validate track against route (simulates FKT submission validation)
      const validation = validateGpxTrack(
        parsedGpx,
        ROUTE_START_LAT,
        ROUTE_START_LNG,
        ROUTE_END_LAT,
        ROUTE_END_LNG,
        TOLERANCE_M
      );

      expect(validation.valid).toBe(true);
      expect(validation.durationSec).toBe(5400);
      expect(validation.nearestStartDistanceM).toBe(0);
      expect(validation.nearestEndDistanceM).toBe(0);
      expect(validation.racePoints).toBeDefined();
      expect(validation.racePoints!.length).toBe(5); // All points in race segment

      // Step 3: Compute SOG for validated race segment
      const sogPoints = computeSog(validation.racePoints!);
      const sogStats = computeAvgMaxSog(sogPoints);

      expect(sogPoints.length).toBe(4); // 4 segments between 5 points
      expect(sogStats.avgSogKnots).toBeGreaterThan(0);
      expect(sogStats.maxSogKnots).toBeGreaterThan(0);
      expect(sogStats.maxSogKnots).toBeGreaterThanOrEqual(sogStats.avgSogKnots);

      // Verify SOG points have cumulative distance
      expect(sogPoints[0].distanceNm).toBeGreaterThan(0);
      expect(sogPoints[3].distanceNm).toBeGreaterThan(sogPoints[0].distanceNm);
    });

    test('should reject GPX file with route validation failure', () => {
      // GPX track that doesn't match the route start/end
      const badGpxContent = `<?xml version="1.0"?>
<gpx version="1.1">
  <trk>
    <trkseg>
      <trkpt lat="35.000000" lon="-76.000000">
        <time>2024-03-15T12:00:00Z</time>
      </trkpt>
      <trkpt lat="35.500000" lon="-75.500000">
        <time>2024-03-15T13:30:00Z</time>
      </trkpt>
    </trkseg>
  </trk>
</gpx>`;

      const parsedGpx = parseGpxXml(badGpxContent);
      const validation = validateGpxTrack(
        parsedGpx,
        ROUTE_START_LAT,
        ROUTE_START_LNG,
        ROUTE_END_LAT,
        ROUTE_END_LNG,
        TOLERANCE_M
      );

      expect(validation.valid).toBe(false);
      expect(validation.error).toContain('does not pass within 10m');
      expect(validation.nearestStartDistanceM).toBeGreaterThan(TOLERANCE_M);
    });

    test('should handle GPX files with minimal track data', () => {
      const minimalGpxContent = `<?xml version="1.0"?>
<gpx>
  <trk>
    <trkseg>
      <trkpt lat="33.948889" lon="-78.011667">
        <time>2024-03-15T12:00:00Z</time>
      </trkpt>
      <trkpt lat="34.518056" lon="-77.448056">
        <time>2024-03-15T13:30:00Z</time>
      </trkpt>
    </trkseg>
  </trk>
</gpx>`;

      const parsedGpx = parseGpxXml(minimalGpxContent);
      const validation = validateGpxTrack(
        parsedGpx,
        ROUTE_START_LAT,
        ROUTE_START_LNG,
        ROUTE_END_LAT,
        ROUTE_END_LNG,
        TOLERANCE_M
      );

      expect(validation.valid).toBe(true);
      expect(validation.durationSec).toBe(5400); // 90 minutes

      // SOG calculation should work with minimal data
      const sogPoints = computeSog(validation.racePoints!);
      expect(sogPoints.length).toBe(1); // 1 segment between 2 points
    });
  });

  describe('VCC File Processing Pipeline', () => {
    test('should process valid VCC file from upload to SOG calculation', () => {
      // Simulate uploaded VCC file content
      const vccContent = `<?xml version="1.0"?>
<VCC>
  <CapturedTrack name="Southport to Sneads Ferry VCC" downloadedOn="2024-03-15T10:30:00Z"/>
  <DeviceInfo ftdiSerialNumber="VX789ABC"/>
  <Trackpoint dateTime="2024-03-15T12:00:00Z" latitude="33.948889" longitude="-78.011667"/>
  <Trackpoint dateTime="2024-03-15T12:15:00Z" latitude="33.960000" longitude="-78.000000"/>
  <Trackpoint dateTime="2024-03-15T12:45:00Z" latitude="34.200000" longitude="-77.700000"/>
  <Trackpoint dateTime="2024-03-15T13:10:00Z" latitude="34.400000" longitude="-77.550000"/>
  <Trackpoint dateTime="2024-03-15T13:30:00Z" latitude="34.518056" longitude="-77.448056"/>
</VCC>`;

      // Step 1: Parse VCC file (simulates file upload parsing)
      const parsedVcc = parseVccXml(vccContent);

      expect(parsedVcc.points).toHaveLength(5);
      expect(parsedVcc.startTime).toEqual(new Date('2024-03-15T12:00:00Z'));
      expect(parsedVcc.endTime).toEqual(new Date('2024-03-15T13:30:00Z'));
      expect(parsedVcc.metadata?.trackName).toBe('Southport to Sneads Ferry VCC');

      // Step 2: Convert to GPX format for validation
      const gpxCompatible = {
        points: parsedVcc.points,
        startTime: parsedVcc.startTime,
        endTime: parsedVcc.endTime,
        durationSec: parsedVcc.startTime && parsedVcc.endTime
          ? Math.round((parsedVcc.endTime.getTime() - parsedVcc.startTime.getTime()) / 1000)
          : null
      };

      // Step 3: Validate track against route
      const validation = validateGpxTrack(
        gpxCompatible,
        ROUTE_START_LAT,
        ROUTE_START_LNG,
        ROUTE_END_LAT,
        ROUTE_END_LNG,
        TOLERANCE_M
      );

      expect(validation.valid).toBe(true);
      expect(validation.durationSec).toBe(5400); // 90 minutes
      expect(validation.nearestStartDistanceM).toBe(0);
      expect(validation.nearestEndDistanceM).toBe(0);

      // Step 4: Compute SOG for validated race segment
      const sogPoints = computeSog(validation.racePoints!);
      const sogStats = computeAvgMaxSog(sogPoints);

      expect(sogPoints.length).toBe(4); // 4 segments between 5 points
      expect(sogStats.avgSogKnots).toBeGreaterThan(0);
      expect(sogStats.maxSogKnots).toBeGreaterThan(0);
    });

    test('should reject VCC file with missing timestamps', () => {
      const vccNoTimestamps = `<?xml version="1.0"?>
<VCC>
  <CapturedTrack name="No Timestamps"/>
  <Trackpoint latitude="33.948889" longitude="-78.011667"/>
  <Trackpoint latitude="34.518056" longitude="-77.448056"/>
</VCC>`;

      const parsedVcc = parseVccXml(vccNoTimestamps);

      expect(parsedVcc.points).toHaveLength(2);
      expect(parsedVcc.startTime).toBeUndefined();
      expect(parsedVcc.endTime).toBeUndefined();

      // Convert to GPX format
      const gpxCompatible = {
        points: parsedVcc.points,
        startTime: null,
        endTime: null,
        durationSec: null
      };

      // Should fail validation due to missing timestamps
      const validation = validateGpxTrack(
        gpxCompatible,
        ROUTE_START_LAT,
        ROUTE_START_LNG,
        ROUTE_END_LAT,
        ROUTE_END_LNG,
        TOLERANCE_M
      );

      expect(validation.valid).toBe(false);
      expect(validation.error).toContain('must contain timestamps');
    });

    test('should handle VCC files with invalid coordinates', () => {
      const vccInvalidCoords = `<?xml version="1.0"?>
<VCC>
  <Trackpoint dateTime="2024-03-15T12:00:00Z" latitude="999" longitude="-78.011667"/>
  <Trackpoint dateTime="2024-03-15T12:15:00Z" latitude="33.960000" longitude="999"/>
  <Trackpoint dateTime="2024-03-15T12:30:00Z" latitude="34.518056" longitude="-77.448056"/>
</VCC>`;

      const parsedVcc = parseVccXml(vccInvalidCoords);

      // Should skip invalid coordinates
      expect(parsedVcc.points.length).toBeGreaterThan(0);
      expect(parsedVcc.metadata?.skippedRows).toBeGreaterThan(0);

      // Valid points should still be processable
      const validPoints = parsedVcc.points.filter(p =>
        p.lat >= -90 && p.lat <= 90 && p.lon >= -180 && p.lon <= 180
      );
      expect(validPoints.length).toBeGreaterThan(0);
    });
  });

  describe('File Type Detection and Processing', () => {
    test('should determine correct parser based on file extension simulation', () => {
      const fileExtensions = [
        { ext: '.gpx', parser: 'GPX' },
        { ext: '.vcc', parser: 'VCC' }
      ];

      fileExtensions.forEach(({ ext, parser }) => {
        const fileName = `track${ext}`;
        const detectedParser = fileName.endsWith('.gpx') ? 'GPX'
          : fileName.endsWith('.vcc') ? 'VCC'
          : 'UNKNOWN';

        expect(detectedParser).toBe(parser);
      });
    });

    test('should reject unsupported file extensions', () => {
      const unsupportedFiles = ['track.kml', 'data.fit', 'route.tcx'];

      unsupportedFiles.forEach(fileName => {
        const isSupported = fileName.endsWith('.gpx') || fileName.endsWith('.vcc');
        expect(isSupported).toBe(false);
      });
    });
  });

  describe('Performance Tests', () => {
    test('should handle large track files efficiently', () => {
      // Generate large GPX track
      const trackPoints = [];
      const baseTime = new Date('2024-03-15T12:00:00Z').getTime();

      for (let i = 0; i < 500; i++) {
        const lat = ROUTE_START_LAT + (ROUTE_END_LAT - ROUTE_START_LAT) * (i / 499);
        const lon = ROUTE_START_LNG + (ROUTE_END_LNG - ROUTE_START_LNG) * (i / 499);
        const time = new Date(baseTime + i * 10000).toISOString(); // Every 10 seconds

        trackPoints.push(`<trkpt lat="${lat}" lon="${lon}"><time>${time}</time></trkpt>`);
      }

      const largeGpxContent = `<?xml version="1.0"?>
<gpx><trk><trkseg>
  ${trackPoints.join('\n  ')}
</trkseg></trk></gpx>`;

      const startTime = Date.now();

      // Parse large file
      const parsedGpx = parseGpxXml(largeGpxContent);
      expect(parsedGpx.points).toHaveLength(500);

      // Validate large track
      const validation = validateGpxTrack(
        parsedGpx,
        ROUTE_START_LAT,
        ROUTE_START_LNG,
        ROUTE_END_LAT,
        ROUTE_END_LNG,
        TOLERANCE_M
      );
      expect(validation.valid).toBe(true);

      // Compute SOG for large track
      const sogPoints = computeSog(validation.racePoints!);
      expect(sogPoints.length).toBe(499); // 499 segments

      const endTime = Date.now();
      expect(endTime - startTime).toBeLessThan(2000); // Should complete in <2s
    });
  });
});