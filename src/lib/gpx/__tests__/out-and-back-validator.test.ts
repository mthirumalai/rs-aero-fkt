import { describe, test, expect } from '@jest/globals';
import { parseGpxXml } from '../parser';
import { validateOutAndBackGpxTrack } from '../validator';
import { readFileSync } from 'fs';
import { join } from 'path';

// Test course coordinates
const START_FINISH_LAT = 50.5000;
const START_FINISH_LNG = -2.0000;
const TURNING_MARK_LAT = 50.5100;
const TURNING_MARK_LNG = -2.0000;

function loadTestGpx(filename: string) {
  const gpxPath = join(__dirname, '../../../../test_data/out_and_back_gpx', filename);
  const gpxContent = readFileSync(gpxPath, 'utf-8');
  return parseGpxXml(gpxContent);
}

describe('Out-and-Back Route Validation', () => {
  describe('Valid routes', () => {
    test('should validate correct starboard rounding', () => {
      const gpx = loadTestGpx('01_correct_starboard_rounding.gpx');
      const result = validateOutAndBackGpxTrack(
        gpx,
        START_FINISH_LAT,
        START_FINISH_LNG,
        TURNING_MARK_LAT,
        TURNING_MARK_LNG
      );

      expect(result.valid).toBe(true);
      expect(result.durationSec).toBe(11 * 60 + 30); // 11:30 total
      expect(result.startPoint).toBeDefined();
      expect(result.finishPoint).toBeDefined();
      expect(result.turningPoint).toBeDefined();
      expect(result.racePoints).toBeDefined();
      expect(result.nearestStartDistanceM).toBeLessThanOrEqual(10);
      expect(result.nearestTurningMarkDistanceM).toBeLessThanOrEqual(10);
    });

    test('should validate correct port rounding', () => {
      const gpx = loadTestGpx('02_correct_port_rounding.gpx');
      const result = validateOutAndBackGpxTrack(
        gpx,
        START_FINISH_LAT,
        START_FINISH_LNG,
        TURNING_MARK_LAT,
        TURNING_MARK_LNG
      );

      expect(result.valid).toBe(true);
      expect(result.durationSec).toBe(11 * 60 + 30); // 11:30 total
      expect(result.startPoint).toBeDefined();
      expect(result.finishPoint).toBeDefined();
      expect(result.turningPoint).toBeDefined();
      expect(result.racePoints).toBeDefined();
      expect(result.nearestStartDistanceM).toBeLessThanOrEqual(10);
      expect(result.nearestTurningMarkDistanceM).toBeLessThanOrEqual(10);
    });
  });

  describe('Invalid rounding', () => {
    test('should reject incorrect port approach same exit rounding', () => {
      const gpx = loadTestGpx('03_incorrect_port_approach_same_exit.gpx');
      const result = validateOutAndBackGpxTrack(
        gpx,
        START_FINISH_LAT,
        START_FINISH_LNG,
        TURNING_MARK_LAT,
        TURNING_MARK_LNG
      );

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid turning mark rounding');
      expect(result.error).toContain('approached from port side but also exited on port side');
    });

    test('should reject incorrect starboard approach same exit rounding', () => {
      const gpx = loadTestGpx('04_incorrect_starboard_approach_same_exit.gpx');
      const result = validateOutAndBackGpxTrack(
        gpx,
        START_FINISH_LAT,
        START_FINISH_LNG,
        TURNING_MARK_LAT,
        TURNING_MARK_LNG
      );

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid turning mark rounding');
      expect(result.error).toContain('approached from starboard side but also exited on starboard side');
    });
  });

  describe('Incomplete routes', () => {
    test('should reject route that doesnt reach turning mark', () => {
      const gpx = loadTestGpx('05_doesnt_reach_turning_mark.gpx');
      const result = validateOutAndBackGpxTrack(
        gpx,
        START_FINISH_LAT,
        START_FINISH_LNG,
        TURNING_MARK_LAT,
        TURNING_MARK_LNG
      );

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Track does not pass within 10m of turning mark');
      expect(result.nearestTurningMarkDistanceM).toBeGreaterThan(10);
    });

    test('should reject route that misses start point', () => {
      const gpx = loadTestGpx('06_misses_start_point.gpx');
      const result = validateOutAndBackGpxTrack(
        gpx,
        START_FINISH_LAT,
        START_FINISH_LNG,
        TURNING_MARK_LAT,
        TURNING_MARK_LNG
      );

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Track must cross start/finish point at least twice');
      expect(result.nearestStartDistanceM).toBeGreaterThan(10);
    });
  });

  describe('Complex timing scenarios', () => {
    test('should handle multiple start crossings correctly', () => {
      const gpx = loadTestGpx('08_multiple_start_crossings.gpx');
      const result = validateOutAndBackGpxTrack(
        gpx,
        START_FINISH_LAT,
        START_FINISH_LNG,
        TURNING_MARK_LAT,
        TURNING_MARK_LNG
      );

      expect(result.valid).toBe(true);

      // Algorithm uses last start crossing before turning mark (10:02:00)
      // and first return after turning mark (10:13:30)
      // Duration should be 11 minutes 30 seconds
      expect(result.durationSec).toBe(11 * 60 + 30);

      // Verify timing uses correct start/finish points
      expect(result.startPoint?.time).toEqual(new Date('2024-04-01T10:02:00Z'));
      expect(result.finishPoint?.time).toEqual(new Date('2024-04-01T10:13:30Z'));
    });

    test('should handle multiple finish crossings correctly', () => {
      const gpx = loadTestGpx('09_multiple_finish_crossings.gpx');
      const result = validateOutAndBackGpxTrack(
        gpx,
        START_FINISH_LAT,
        START_FINISH_LNG,
        TURNING_MARK_LAT,
        TURNING_MARK_LNG
      );

      expect(result.valid).toBe(true);

      // Should use the first departure (10:00:00)
      // and first return after turning mark (10:11:30)
      // Duration should be 11 minutes 30 seconds
      expect(result.durationSec).toBe(11 * 60 + 30);

      // Verify timing uses correct finish point (first arrival)
      expect(result.startPoint?.time).toEqual(new Date('2024-04-01T10:00:00Z'));
      expect(result.finishPoint?.time).toEqual(new Date('2024-04-01T10:11:30Z'));
    });
  });

  describe('Edge cases', () => {
    test('should reject tracks with insufficient points', () => {
      const shortGpx = {
        points: [
          { lat: 50.5000, lon: -2.0000, time: new Date('2024-04-01T10:00:00Z') },
          { lat: 50.5050, lon: -2.0000, time: new Date('2024-04-01T10:05:00Z') }
        ],
        startTime: new Date('2024-04-01T10:00:00Z'),
        endTime: new Date('2024-04-01T10:05:00Z'),
        durationSec: 300
      };

      const result = validateOutAndBackGpxTrack(
        shortGpx,
        START_FINISH_LAT,
        START_FINISH_LNG,
        TURNING_MARK_LAT,
        TURNING_MARK_LNG
      );

      expect(result.valid).toBe(false);
      expect(result.error).toContain('GPX track has fewer than 3 points');
    });

    test('should reject tracks without timestamps', () => {
      const noTimeGpx = {
        points: [
          { lat: 50.5000, lon: -2.0000, time: null },
          { lat: 50.5050, lon: -2.0000, time: null },
          { lat: 50.5100, lon: -2.0000, time: null },
          { lat: 50.5050, lon: -2.0000, time: null },
          { lat: 50.5000, lon: -2.0000, time: null }
        ],
        startTime: null,
        endTime: null,
        durationSec: null
      };

      const result = validateOutAndBackGpxTrack(
        noTimeGpx,
        START_FINISH_LAT,
        START_FINISH_LNG,
        TURNING_MARK_LAT,
        TURNING_MARK_LNG
      );

      expect(result.valid).toBe(false);
      expect(result.error).toContain('GPX track must contain timestamps');
    });
  });

  describe('Tolerance tests', () => {
    test('should work with custom tolerance', () => {
      const gpx = loadTestGpx('01_correct_starboard_rounding.gpx');

      // Test with strict tolerance (should pass as our test data is within ~7m)
      const strictResult = validateOutAndBackGpxTrack(
        gpx,
        START_FINISH_LAT,
        START_FINISH_LNG,
        TURNING_MARK_LAT,
        TURNING_MARK_LNG,
        8 // 8 meter tolerance
      );

      expect(strictResult.valid).toBe(true);

      // Test with default tolerance should also work
      const defaultResult = validateOutAndBackGpxTrack(
        gpx,
        START_FINISH_LAT,
        START_FINISH_LNG,
        TURNING_MARK_LAT,
        TURNING_MARK_LNG
        // Using default 10m tolerance
      );

      expect(defaultResult.valid).toBe(true);
    });
  });
});