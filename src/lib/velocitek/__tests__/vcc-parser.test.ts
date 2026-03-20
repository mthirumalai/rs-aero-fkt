import { parseVccXml } from '../vcc-parser';

describe('VCC Parser Tests', () => {

  describe('Valid VCC File Parsing', () => {
    test('should parse valid VCC file with all trackpoints', () => {
      const vccContent = `<?xml version="1.0"?>
<VCC>
  <CapturedTrack name="Test Track" downloadedOn="2024-03-15T10:30:00Z"/>
  <DeviceInfo ftdiSerialNumber="VX123456"/>
  <Trackpoint dateTime="2024-03-15T12:00:00Z" latitude="33.948889" longitude="-78.011667"/>
  <Trackpoint dateTime="2024-03-15T12:30:00Z" latitude="34.000000" longitude="-77.500000"/>
  <Trackpoint dateTime="2024-03-15T13:00:00Z" latitude="34.518056" longitude="-77.448056"/>
</VCC>`;

      const result = parseVccXml(vccContent);

      expect(result.points).toHaveLength(3);
      expect(result.startTime).toEqual(new Date('2024-03-15T12:00:00Z'));
      expect(result.endTime).toEqual(new Date('2024-03-15T13:00:00Z'));

      // Check first point
      expect(result.points[0]).toEqual({
        lat: 33.948889,
        lon: -78.011667,
        time: new Date('2024-03-15T12:00:00Z'),
        ele: undefined
      });

      // Check metadata
      expect(result.metadata?.trackName).toBe('Test Track');
      expect(result.metadata?.deviceSerial).toBe('VX123456');
    });

    test('should parse VCC file with missing optional timestamps', () => {
      const vccContent = `<?xml version="1.0"?>
<VCC>
  <CapturedTrack name="No Timestamps"/>
  <Trackpoint latitude="33.948889" longitude="-78.011667"/>
  <Trackpoint latitude="34.518056" longitude="-77.448056"/>
</VCC>`;

      const result = parseVccXml(vccContent);

      expect(result.points).toHaveLength(2);
      expect(result.startTime).toBeUndefined();
      expect(result.endTime).toBeUndefined();

      expect(result.points[0].time).toBeNull();
      expect(result.points[1].time).toBeNull();
    });

    test('should parse VCC file with mixed timestamp formats', () => {
      const vccContent = `<?xml version="1.0"?>
<VCC>
  <Trackpoint dateTime="2024-03-15T12:00:00-07:00" latitude="33.948889" longitude="-78.011667"/>
  <Trackpoint dateTime="2024-03-15T12:30:00+00:00" latitude="34.000000" longitude="-77.500000"/>
  <Trackpoint dateTime="2024-03-15T13:00:00.123Z" latitude="34.518056" longitude="-77.448056"/>
</VCC>`;

      const result = parseVccXml(vccContent);

      expect(result.points).toHaveLength(3);
      expect(result.points.every(p => p.time !== null)).toBe(true);

      // Points should be sorted by time
      expect(result.points[0].time!.getTime()).toBeLessThan(result.points[1].time!.getTime());
      expect(result.points[1].time!.getTime()).toBeLessThan(result.points[2].time!.getTime());
    });
  });

  describe('Invalid VCC File Handling', () => {
    test('should handle malformed XML gracefully', () => {
      const vccContent = `<?xml version="1.0"?>
<VCC>
  <Trackpoint latitude="33.948889" longitude="-78.011667"
  <Trackpoint latitude="34.518056" longitude="-77.448056"/>
</VCC>`;

      const result = parseVccXml(vccContent);
      // Malformed XML results in fewer or no points
      expect(result.points.length).toBeLessThan(2);
    });

    test('should skip trackpoints with invalid coordinates', () => {
      const vccContent = `<?xml version="1.0"?>
<VCC>
  <Trackpoint dateTime="2024-03-15T12:00:00Z" latitude="33.948889" longitude="-78.011667"/>
  <Trackpoint dateTime="2024-03-15T12:15:00Z" latitude="999" longitude="-78.000000"/>
  <Trackpoint dateTime="2024-03-15T12:30:00Z" latitude="34.000000" longitude="999"/>
  <Trackpoint dateTime="2024-03-15T12:45:00Z" latitude="34.518056" longitude="-77.448056"/>
</VCC>`;

      const result = parseVccXml(vccContent);

      expect(result.points).toHaveLength(2); // Only valid points
      expect(result.points[0].lat).toBe(33.948889);
      expect(result.points[1].lat).toBe(34.518056);
    });

    test('should handle empty session', () => {
      const vccContent = `<?xml version="1.0"?>
<VCC>
  <CapturedTrack name="Empty Track"/>
</VCC>`;

      const result = parseVccXml(vccContent);

      expect(result.points).toHaveLength(0);
      expect(result.startTime).toBeUndefined();
      expect(result.endTime).toBeUndefined();
      expect(result.metadata?.trackName).toBe('Empty Track');
    });

    test('should handle missing coordinate attributes', () => {
      const vccContent = `<?xml version="1.0"?>
<VCC>
  <Trackpoint dateTime="2024-03-15T12:00:00Z" latitude="33.948889"/>
  <Trackpoint dateTime="2024-03-15T12:15:00Z" longitude="-78.011667"/>
  <Trackpoint dateTime="2024-03-15T12:30:00Z" latitude="34.518056" longitude="-77.448056"/>
</VCC>`;

      const result = parseVccXml(vccContent);

      expect(result.points).toHaveLength(1); // Only the complete point
      expect(result.points[0].lat).toBe(34.518056);
      expect(result.points[0].lon).toBe(-77.448056);
    });

    test('should handle invalid timestamp formats gracefully', () => {
      const vccContent = `<?xml version="1.0"?>
<VCC>
  <Trackpoint dateTime="invalid-date" latitude="33.948889" longitude="-78.011667"/>
  <Trackpoint dateTime="2024-13-99T99:99:99Z" latitude="34.000000" longitude="-77.500000"/>
  <Trackpoint dateTime="2024-03-15T12:30:00Z" latitude="34.518056" longitude="-77.448056"/>
</VCC>`;

      const result = parseVccXml(vccContent);

      expect(result.points).toHaveLength(3);

      // Points are sorted by timestamp, so valid timestamp comes first
      const validPoint = result.points.find(p => p.time !== null);
      const invalidPoints = result.points.filter(p => p.time === null);

      expect(validPoint).toBeDefined();
      expect(invalidPoints.length).toBe(2);
      expect(validPoint!.time).toEqual(new Date('2024-03-15T12:30:00Z'));
    });
  });

  describe('Coordinate Validation', () => {
    test('should validate latitude bounds [-90, 90]', () => {
      const vccContent = `<?xml version="1.0"?>
<VCC>
  <Trackpoint latitude="-91" longitude="-78.011667"/>
  <Trackpoint latitude="91" longitude="-78.011667"/>
  <Trackpoint latitude="-90" longitude="-78.011667"/>
  <Trackpoint latitude="90" longitude="-78.011667"/>
  <Trackpoint latitude="45.5" longitude="-78.011667"/>
</VCC>`;

      const result = parseVccXml(vccContent);

      expect(result.points).toHaveLength(3); // Only valid latitudes
      expect(result.points.map(p => p.lat)).toEqual([-90, 90, 45.5]);
    });

    test('should validate longitude bounds [-180, 180]', () => {
      const vccContent = `<?xml version="1.0"?>
<VCC>
  <Trackpoint latitude="33.948889" longitude="-181"/>
  <Trackpoint latitude="33.948889" longitude="181"/>
  <Trackpoint latitude="33.948889" longitude="-180"/>
  <Trackpoint latitude="33.948889" longitude="180"/>
  <Trackpoint latitude="33.948889" longitude="-78.011667"/>
</VCC>`;

      const result = parseVccXml(vccContent);

      expect(result.points).toHaveLength(3); // Only valid longitudes
      expect(result.points.map(p => p.lon)).toEqual([-180, 180, -78.011667]);
    });
  });

  describe('Real-world VCC File Structure', () => {
    test('should handle VCC file with additional XML elements', () => {
      const vccContent = `<?xml version="1.0" encoding="UTF-8"?>
<VCC xmlns="http://velocitek.com/vcc/1.0">
  <CapturedTrack name="Southport to Sneads Ferry" downloadedOn="2024-03-15T10:30:00-05:00"/>
  <DeviceInfo ftdiSerialNumber="VX789ABC"/>
  <Trackpoint dateTime="2024-03-15T12:00:00-05:00" latitude="33.948889" longitude="-78.011667" speed="0.0"/>
  <Trackpoint dateTime="2024-03-15T12:05:00-05:00" latitude="33.960000" longitude="-78.000000" speed="5.2"/>
  <Trackpoint dateTime="2024-03-15T12:10:00-05:00" latitude="33.970000" longitude="-77.990000" speed="6.8"/>
  <Trackpoint dateTime="2024-03-15T13:30:00-05:00" latitude="34.518056" longitude="-77.448056" speed="4.1"/>
</VCC>`;

      const result = parseVccXml(vccContent);

      expect(result.points).toHaveLength(4);
      expect(result.metadata?.trackName).toBe('Southport to Sneads Ferry');
      expect(result.metadata?.deviceSerial).toBe('VX789ABC');
    });

    test('should maintain chronological order after parsing', () => {
      // Test with out-of-order timestamps
      const vccContent = `<?xml version="1.0"?>
<VCC>
  <Trackpoint dateTime="2024-03-15T12:30:00Z" latitude="34.000000" longitude="-77.500000"/>
  <Trackpoint dateTime="2024-03-15T12:00:00Z" latitude="33.948889" longitude="-78.011667"/>
  <Trackpoint dateTime="2024-03-15T13:00:00Z" latitude="34.518056" longitude="-77.448056"/>
  <Trackpoint dateTime="2024-03-15T12:15:00Z" latitude="33.980000" longitude="-77.800000"/>
</VCC>`;

      const result = parseVccXml(vccContent);

      expect(result.points).toHaveLength(4);

      // Check that points are sorted by time
      const times = result.points.map(p => p.time!.getTime());
      expect(times).toEqual([...times].sort((a, b) => a - b));

      // Check start/end times match sorted order
      expect(result.startTime).toEqual(result.points[0].time);
      expect(result.endTime).toEqual(result.points[3].time);
    });
  });
});