// Simple test script to check GPX parsing behavior
const fs = require('fs');
const path = require('path');

// Copy of the parseGpxXml function from the app
function parseGpxXml(xmlString) {
  const points = [];

  // Match trkpt elements
  const trkptRegex = /<trkpt\s+lat="([^"]+)"\s+lon="([^"]+)"[^>]*>([\s\S]*?)<\/trkpt>/g;
  let match;

  while ((match = trkptRegex.exec(xmlString)) !== null) {
    const lat = parseFloat(match[1]);
    const lon = parseFloat(match[2]);
    const inner = match[3];

    const timeMatch = /<time>([^<]+)<\/time>/.exec(inner);
    const eleMatch = /<ele>([^<]+)<\/ele>/.exec(inner);

    points.push({
      lat,
      lon,
      time: timeMatch ? new Date(timeMatch[1].trim()) : null,
      ele: eleMatch ? parseFloat(eleMatch[1]) : undefined,
    });
  }

  const timedPoints = points.filter((p) => p.time !== null);
  const startTime = timedPoints.length > 0 ? timedPoints[0].time : null;
  const endTime = timedPoints.length > 0 ? timedPoints[timedPoints.length - 1].time : null;

  let durationSec = null;
  if (startTime && endTime) {
    durationSec = Math.round((endTime.getTime() - startTime.getTime()) / 1000);
  }

  return { points, startTime, endTime, durationSec };
}

// Test each malformed file
const testFiles = [
  '01_invalid_xml.gpx',
  '02_missing_coordinates.gpx',
  '03_invalid_coordinates.gpx',
  '04_invalid_timestamps.gpx',
  '05_empty_file.gpx',
  '06_wrong_structure.gpx',
  '07_no_trackpoints.gpx',
  '08_binary_data.gpx'
];

console.log('Testing malformed GPX files...\n');

testFiles.forEach(filename => {
  console.log(`\n--- Testing: ${filename} ---`);

  try {
    const filePath = path.join(__dirname, 'malformed', filename);
    const content = fs.readFileSync(filePath, 'utf8');

    console.log(`File size: ${content.length} characters`);

    const result = parseGpxXml(content);

    console.log(`Points found: ${result.points.length}`);
    console.log(`Valid times: ${result.points.filter(p => p.time !== null).length}`);

    if (result.points.length > 0) {
      console.log('Sample point:', result.points[0]);

      // Check for NaN values
      const invalidCoords = result.points.filter(p => isNaN(p.lat) || isNaN(p.lon));
      if (invalidCoords.length > 0) {
        console.log(`⚠️  ${invalidCoords.length} points with invalid coordinates (NaN)`);
      }

      // Check for invalid dates
      const invalidTimes = result.points.filter(p => p.time && p.time.toString() === 'Invalid Date');
      if (invalidTimes.length > 0) {
        console.log(`⚠️  ${invalidTimes.length} points with invalid timestamps`);
      }
    }

    console.log('Result: Parser completed without throwing error');

  } catch (error) {
    console.log(`❌ Parser threw error: ${error.message}`);
  }
});

console.log('\n--- Summary ---');
console.log('Current error handling will only show:');
console.log('- "GPX file contains no track points" if points.length === 0');
console.log('- "Failed to parse GPX file..." if an exception is thrown');
console.log('- No warnings about NaN coordinates or invalid timestamps');