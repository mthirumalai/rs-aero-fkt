/**
 * Simple test runner for FKT validation tests
 * Run with: npx ts-node src/lib/gpx/__tests__/test-runner.ts
 */

import fs from 'fs';
import path from 'path';
import { validateGpxTrack } from '../validator';
import { validateGpxTrackEnhanced } from '../enhanced-validator';
import { computeSog, computeAvgMaxSog } from '../sog';
import { parseGpx } from '../parser';

// Test route coordinates
const ROUTE_START_LAT = 33.948889;
const ROUTE_START_LNG = -78.011667;
const ROUTE_END_LAT = 34.518056;
const ROUTE_END_LNG = -77.448056;
const TOLERANCE_M = 10;

interface TestCase {
  name: string;
  file: string;
  expectedValid: boolean;
  expectedDuration?: number;
  description: string;
}

const testCases: TestCase[] = [
  {
    name: "Test 0: Exact Points",
    file: "test-exact-points.gpx",
    expectedValid: true,
    expectedDuration: 3600,
    description: "Track starting exactly at start point and ending exactly at end point"
  },
  {
    name: "Test 2: No Start Circle",
    file: "test-no-start-circle.gpx",
    expectedValid: false,
    description: "Track that never enters start point 10m circle"
  },
  {
    name: "Test 4: False Start",
    file: "test-false-start.gpx",
    expectedValid: true,
    expectedDuration: 3120, // 52 minutes (from 12:08 to 13:00)
    description: "Track with false start - should use second exit timing"
  },
  {
    name: "Test 5: Re-finish",
    file: "test-re-finish.gpx",
    expectedValid: true,
    expectedDuration: 3000, // 50 minutes (from 12:00 to 12:50)
    description: "Track with re-finish - should use first entry timing"
  }
];

async function runTest(testCase: TestCase): Promise<void> {
  console.log(`\n🧪 ${testCase.name}`);
  console.log(`📄 ${testCase.description}`);

  const testDataDir = path.join(process.cwd(), 'test_data');
  const filePath = path.join(testDataDir, testCase.file);

  try {
    if (!fs.existsSync(filePath)) {
      console.log(`❌ Test file not found: ${filePath}`);
      return;
    }

    const gpxContent = fs.readFileSync(filePath, 'utf-8');
    const parsedGpx = parseGpx(gpxContent);

    console.log(`📊 Track has ${parsedGpx.points.length} points`);

    // Test original validator
    const originalResult = validateGpxTrack(
      parsedGpx,
      ROUTE_START_LAT,
      ROUTE_START_LNG,
      ROUTE_END_LAT,
      ROUTE_END_LNG,
      TOLERANCE_M
    );

    // Test enhanced validator
    const enhancedResult = validateGpxTrackEnhanced(
      parsedGpx,
      ROUTE_START_LAT,
      ROUTE_START_LNG,
      ROUTE_END_LAT,
      ROUTE_END_LNG,
      TOLERANCE_M
    );

    console.log(`\n📈 Original Validator:`);
    console.log(`   Valid: ${originalResult.valid}`);
    if (originalResult.valid) {
      console.log(`   Duration: ${originalResult.durationSec}s (${Math.round(originalResult.durationSec! / 60)} min)`);
      console.log(`   Start distance: ${originalResult.nearestStartDistanceM}m`);
      console.log(`   End distance: ${originalResult.nearestEndDistanceM}m`);
    } else {
      console.log(`   Error: ${originalResult.error}`);
    }

    console.log(`\n🚀 Enhanced Validator:`);
    console.log(`   Valid: ${enhancedResult.valid}`);
    if (enhancedResult.valid) {
      console.log(`   Duration: ${enhancedResult.durationSec}s (${Math.round(enhancedResult.durationSec! / 60)} min)`);
      console.log(`   Start distance: ${enhancedResult.nearestStartDistanceM}m`);
      console.log(`   End distance: ${enhancedResult.nearestEndDistanceM}m`);

      if (enhancedResult.timingDetails) {
        const details = enhancedResult.timingDetails;
        console.log(`   Start circle entries: ${details.startCircleEntries}`);
        console.log(`   Start circle exits: ${details.startCircleExits}`);
        console.log(`   End circle entries: ${details.endCircleEntries}`);
        console.log(`   End circle exits: ${details.endCircleExits}`);
        console.log(`   False start detected: ${details.falseStartDetected}`);
        console.log(`   Re-finish detected: ${details.reFinishDetected}`);
      }
    } else {
      console.log(`   Error: ${enhancedResult.error}`);
    }

    // Test SOG calculation
    if (originalResult.valid && originalResult.racePoints) {
      const sogPoints = computeSog(originalResult.racePoints);
      const avgMax = computeAvgMaxSog(sogPoints);
      console.log(`\n⛵ SOG Analysis:`);
      console.log(`   SOG points: ${sogPoints.length}`);
      console.log(`   Average SOG: ${avgMax.avgSogKnots} knots`);
      console.log(`   Maximum SOG: ${avgMax.maxSogKnots} knots`);
    }

    // Validation checks
    const validationPassed = originalResult.valid === testCase.expectedValid;
    const durationCheck = !testCase.expectedDuration ||
      Math.abs(originalResult.durationSec! - testCase.expectedDuration) < 60; // 1 minute tolerance

    if (validationPassed && durationCheck) {
      console.log(`\n✅ Test PASSED`);
    } else {
      console.log(`\n❌ Test FAILED`);
      if (!validationPassed) {
        console.log(`   Expected valid: ${testCase.expectedValid}, got: ${originalResult.valid}`);
      }
      if (testCase.expectedDuration && !durationCheck) {
        console.log(`   Expected duration: ${testCase.expectedDuration}s, got: ${originalResult.durationSec}s`);
      }
    }

  } catch (error) {
    console.log(`❌ Test failed with error: ${error}`);
  }
}

async function runAllTests(): Promise<void> {
  console.log("🏃‍♂️ Running FKT Validation Tests");
  console.log("=====================================");

  for (const testCase of testCases) {
    await runTest(testCase);
    await new Promise(resolve => setTimeout(resolve, 100)); // Small delay between tests
  }

  console.log("\n🏁 All tests completed!");
}

// Run tests if called directly
if (require.main === module) {
  runAllTests().catch(console.error);
}