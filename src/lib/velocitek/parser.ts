import Papa from 'papaparse';
import type { GpxPoint } from '@/lib/gpx/parser';

// Common Velocitek CSV column headers (case-insensitive matching)
const HEADER_MAPPINGS = {
  // Timestamp columns
  timestamp: ['timestamp', 'time', 'date', 'datetime', 'utc'],
  // Latitude columns
  latitude: ['latitude', 'lat', 'y'],
  // Longitude columns
  longitude: ['longitude', 'lng', 'lon', 'long', 'x'],
  // Speed columns (optional)
  speed: ['speed', 'sog', 'velocity', 'spd'],
  // Course columns (optional)
  course: ['course', 'heading', 'bearing', 'cog'],
};


function findColumnIndex(headers: string[], possibleNames: string[]): number {
  const lowerHeaders = headers.map(h => h.toLowerCase().trim());

  for (const name of possibleNames) {
    const index = lowerHeaders.findIndex(header =>
      header.includes(name) || header === name
    );
    if (index !== -1) return index;
  }
  return -1;
}

function parseTimestamp(timestampStr: string): Date | null {
  if (!timestampStr?.trim()) return null;

  // Try various timestamp formats
  const formats = [
    // ISO formats
    timestampStr,
    // Unix timestamp (if it's a number)
    isNaN(Number(timestampStr)) ? null : new Date(Number(timestampStr) * 1000),
    // Excel date format
    isNaN(Number(timestampStr)) ? null : new Date((Number(timestampStr) - 25569) * 86400 * 1000),
  ];

  for (const format of formats) {
    if (format === null) continue;

    try {
      const date = typeof format === 'string' ? new Date(format) : format;
      if (!isNaN(date.getTime())) {
        return date;
      }
    } catch {
      continue;
    }
  }

  return null;
}

function parseCoordinate(coord: string): number | null {
  if (!coord?.trim()) return null;

  const num = parseFloat(coord.trim());
  return isNaN(num) ? null : num;
}

export interface VeloctekParseResult {
  points: GpxPoint[];
  errors: string[];
  metadata: {
    totalRows: number;
    parsedRows: number;
    skippedRows: number;
    detectedFormat: {
      timestampColumn?: string;
      latitudeColumn?: string;
      longitudeColumn?: string;
      speedColumn?: string;
      courseColumn?: string;
    };
  };
}

export function parseVelocitkCsv(csvText: string): VeloctekParseResult {
  const result: VeloctekParseResult = {
    points: [],
    errors: [],
    metadata: {
      totalRows: 0,
      parsedRows: 0,
      skippedRows: 0,
      detectedFormat: {},
    },
  };

  try {
    // Parse CSV
    const parseResult = Papa.parse<string[]>(csvText, {
      header: false, // We'll handle headers manually for better control
      skipEmptyLines: true,
      transformHeader: (header: string) => header.trim(),
      transform: (value: string) => value.trim(),
    });

    if (parseResult.errors.length > 0) {
      result.errors.push(...parseResult.errors.map(e => e.message));
    }

    const rows = parseResult.data;
    if (rows.length < 2) {
      result.errors.push('CSV file must have at least a header row and one data row');
      return result;
    }

    // Detect column indices
    const headers = rows[0];
    const timestampCol = findColumnIndex(headers, HEADER_MAPPINGS.timestamp);
    const latCol = findColumnIndex(headers, HEADER_MAPPINGS.latitude);
    const lngCol = findColumnIndex(headers, HEADER_MAPPINGS.longitude);
    const speedCol = findColumnIndex(headers, HEADER_MAPPINGS.speed);
    const courseCol = findColumnIndex(headers, HEADER_MAPPINGS.course);

    // Validate required columns
    if (latCol === -1) {
      result.errors.push(`Could not find latitude column. Expected one of: ${HEADER_MAPPINGS.latitude.join(', ')}`);
      return result;
    }
    if (lngCol === -1) {
      result.errors.push(`Could not find longitude column. Expected one of: ${HEADER_MAPPINGS.longitude.join(', ')}`);
      return result;
    }

    // Store detected format
    result.metadata.detectedFormat = {
      timestampColumn: timestampCol !== -1 ? headers[timestampCol] : undefined,
      latitudeColumn: headers[latCol],
      longitudeColumn: headers[lngCol],
      speedColumn: speedCol !== -1 ? headers[speedCol] : undefined,
      courseColumn: courseCol !== -1 ? headers[courseCol] : undefined,
    };

    // Process data rows
    const dataRows = rows.slice(1);
    result.metadata.totalRows = dataRows.length;

    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];

      // Skip empty rows
      if (row.length === 0 || row.every(cell => !cell?.trim())) {
        result.metadata.skippedRows++;
        continue;
      }

      // Parse coordinates (required)
      const lat = parseCoordinate(row[latCol]);
      const lng = parseCoordinate(row[lngCol]);

      if (lat === null || lng === null) {
        result.metadata.skippedRows++;
        continue;
      }

      // Validate coordinate ranges
      if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        result.metadata.skippedRows++;
        continue;
      }

      // Parse timestamp (optional)
      let timestamp: Date | null = null;
      if (timestampCol !== -1) {
        timestamp = parseTimestamp(row[timestampCol]);
      }

      // Create GpxPoint
      const point: GpxPoint = {
        lat,
        lon: lng,
        time: timestamp,
        ele: undefined, // Velocitek doesn't typically include elevation
      };

      result.points.push(point);
      result.metadata.parsedRows++;
    }

    // Validate we got some points
    if (result.points.length === 0) {
      result.errors.push('No valid track points found in CSV file');
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
    result.errors.push(`Failed to parse CSV: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  return result;
}