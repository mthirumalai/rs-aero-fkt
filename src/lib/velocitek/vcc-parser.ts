import type { GpxPoint } from '@/lib/gpx/parser';
import { DOMParser } from '@xmldom/xmldom';

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
  startTime?: Date;
  endTime?: Date;
}

function parseDateTime(dateTimeStr: string): Date | null {
  if (!dateTimeStr?.trim()) {
    console.log('🚫 Empty dateTime string');
    return null;
  }

  try {
    // VCC format: "2020-09-07T16:00:23-07:00"
    const date = new Date(dateTimeStr);
    if (!isNaN(date.getTime())) {
      console.log('✅ Parsed dateTime:', dateTimeStr, '->', date.toISOString());
      return date;
    } else {
      console.log('❌ Invalid date created from:', dateTimeStr);
    }
  } catch (error) {
    console.log('💥 Error parsing dateTime:', dateTimeStr, error);
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

    // Check for XML parsing errors (Node.js xmldom doesn't have querySelector)
    const parseErrors = doc.getElementsByTagName('parsererror');
    if (parseErrors.length > 0) {
      result.errors.push('Invalid XML format');
      return result;
    }

    // Extract metadata (Node.js compatible)
    const capturedTracks = doc.getElementsByTagName('CapturedTrack');
    if (capturedTracks.length > 0) {
      const capturedTrack = capturedTracks[0];
      result.metadata.trackName = capturedTrack.getAttribute('name') || undefined;
      result.metadata.downloadedOn = capturedTrack.getAttribute('downloadedOn') || undefined;
    }

    const deviceInfos = doc.getElementsByTagName('DeviceInfo');
    if (deviceInfos.length > 0) {
      const deviceInfo = deviceInfos[0];
      result.metadata.deviceSerial = deviceInfo.getAttribute('ftdiSerialNumber') || undefined;
    }

    // Find all trackpoints (Node.js compatible)
    const trackpointElements = doc.getElementsByTagName('Trackpoint');
    result.metadata.totalRows = trackpointElements.length;

    // Convert HTMLCollection to Array for iteration
    const trackpointsArray = Array.from(trackpointElements);
    trackpointsArray.forEach((trackpoint, index) => {
      try {
        // Extract attributes
        const dateTime = trackpoint.getAttribute('dateTime');
        const latStr = trackpoint.getAttribute('latitude');
        const lngStr = trackpoint.getAttribute('longitude');

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

    // Set start and end times
    if (result.points.length > 0) {
      console.log('📊 VCC parsing complete:', {
        totalPoints: result.points.length,
        pointsWithTime: result.points.filter(p => p.time !== null).length,
        firstFewPoints: result.points.slice(0, 3).map(p => ({ lat: p.lat, lon: p.lon, time: p.time?.toISOString() }))
      });

      const firstPoint = result.points.find(p => p.time !== null);
      const lastPoint = result.points.reverse().find(p => p.time !== null);
      result.points.reverse(); // restore order

      result.startTime = firstPoint?.time || undefined;
      result.endTime = lastPoint?.time || undefined;

      console.log('🕐 VCC startTime/endTime:', {
        startTime: result.startTime?.toISOString(),
        endTime: result.endTime?.toISOString()
      });
    }

  } catch (error) {
    result.errors.push(`Failed to parse VCC XML: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  return result;
}