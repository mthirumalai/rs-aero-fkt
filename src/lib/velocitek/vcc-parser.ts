import type { GpxPoint } from '@/lib/gpx/parser';

export interface VccParseResult {
  points: GpxPoint[];
  errors: string[];
  metadata: {
    totalRows: number;
    parsedRows: number;
    skippedRows: number;
    trackName?: string;
    downloadedOn?: string;
    deviceSerial?: string;
  };
}

function parseDateTime(dateTimeStr: string): Date | null {
  if (!dateTimeStr?.trim()) return null;

  try {
    // VCC format: "2020-09-07T16:00:23-07:00"
    const date = new Date(dateTimeStr);
    if (!isNaN(date.getTime())) {
      return date;
    }
  } catch {
    // Ignore parsing errors
  }

  return null;
}

export function parseVccXml(xmlText: string): VccParseResult {
  const result: VccParseResult = {
    points: [],
    errors: [],
    metadata: {
      totalRows: 0,
      parsedRows: 0,
      skippedRows: 0,
    },
  };

  try {
    // Create a simple XML parser using DOMParser
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlText, 'text/xml');

    // Check for XML parsing errors
    const parseError = doc.querySelector('parsererror');
    if (parseError) {
      result.errors.push('Invalid XML format');
      return result;
    }

    // Extract metadata
    const capturedTrack = doc.querySelector('CapturedTrack');
    if (capturedTrack) {
      result.metadata.trackName = capturedTrack.getAttribute('name') || undefined;
      result.metadata.downloadedOn = capturedTrack.getAttribute('downloadedOn') || undefined;
    }

    const deviceInfo = doc.querySelector('DeviceInfo');
    if (deviceInfo) {
      result.metadata.deviceSerial = deviceInfo.getAttribute('ftdiSerialNumber') || undefined;
    }

    // Find all trackpoints
    const trackpoints = doc.querySelectorAll('Trackpoint');
    result.metadata.totalRows = trackpoints.length;

    trackpoints.forEach((trackpoint, index) => {
      try {
        // Extract attributes
        const dateTime = trackpoint.getAttribute('dateTime');
        const latStr = trackpoint.getAttribute('latitude');
        const lngStr = trackpoint.getAttribute('longitude');
        // Note: speed and heading are available but not used for basic track parsing
        // const speedStr = trackpoint.getAttribute('speed');
        // const headingStr = trackpoint.getAttribute('heading');

        // Validate required fields
        if (!latStr || !lngStr) {
          result.metadata.skippedRows++;
          return;
        }

        // Parse coordinates
        const lat = parseFloat(latStr);
        const lng = parseFloat(lngStr);

        if (isNaN(lat) || isNaN(lng)) {
          result.metadata.skippedRows++;
          return;
        }

        // Validate coordinate ranges
        if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
          result.metadata.skippedRows++;
          return;
        }

        // Parse timestamp
        const timestamp = dateTime ? parseDateTime(dateTime) : null;

        // Create GpxPoint (compatible with existing track handling)
        const point: GpxPoint = {
          lat,
          lon: lng,
          time: timestamp,
          ele: undefined, // Velocitek doesn't include elevation
        };

        result.points.push(point);
        result.metadata.parsedRows++;
      } catch (error) {
        result.errors.push(`Error parsing trackpoint ${index + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        result.metadata.skippedRows++;
      }
    });

    // Validate we got some points
    if (result.points.length === 0) {
      result.errors.push('No valid track points found in VCC file');
    }

    // Sort by timestamp if available
    if (result.points.some(p => p.time)) {
      result.points.sort((a, b) => {
        if (!a.time && !b.time) return 0;
        if (!a.time) return 1;
        if (!b.time) return -1;
        return a.time.getTime() - b.time.getTime();
      });
    }

  } catch (error) {
    result.errors.push(`Failed to parse VCC XML: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  return result;
}