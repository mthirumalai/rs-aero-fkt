# FKT Validation Test Data

This directory contains GPX test files for validating the FKT attempt submission logic.

## Test Cases

### Test 0: Happy Path - Exact Points (`test-exact-points.gpx`)
- **Purpose**: Track starting exactly at start point and ending exactly at end point
- **Expected**: ✅ Valid, 1 hour duration
- **Tests**: Basic validation with perfect start/end alignment

### Test 1: Happy Path - Within Tolerance (`test-fkt-attempt.gpx`)
- **Purpose**: Track with start/end points within 10m tolerance circles
- **Expected**: ✅ Valid
- **Tests**: Tolerance circle validation

### Test 2: Invalid - No Start Circle Entry (`test-no-start-circle.gpx`)
- **Purpose**: Track that never enters start point 10m circle
- **Expected**: ❌ Invalid
- **Tests**: Start circle entry requirement

### Test 3: Invalid - No End Circle Entry
- **Purpose**: Track that never enters end point 10m circle
- **Expected**: ❌ Invalid
- **Tests**: End circle entry requirement

### Test 4: False Start (`test-false-start.gpx`)
- **Purpose**: Track enters start circle, leaves, then re-enters
- **Expected**: ✅ Valid, timing from second exit
- **Key Requirements**:
  - Time starts when leaving start circle (not entering)
  - Use timing from final start circle exit
  - Duration: 52 minutes (12:08 to 13:00)

### Test 5: Re-finish (`test-re-finish.gpx`)
- **Purpose**: Track enters end circle, leaves, then re-enters
- **Expected**: ✅ Valid, timing from first entry
- **Key Requirements**:
  - Time stops when first entering end circle
  - Ignore subsequent end circle entries
  - Duration: 50 minutes (12:00 to 12:50)

## Validation Rules

### Circle Entry/Exit Logic
- **Start Circle**: 10m radius around route start point
- **End Circle**: 10m radius around route end point
- **Timing Start**: When track LEAVES start circle (after final entry)
- **Timing End**: When track first ENTERS end circle

### SOG (Speed Over Ground) Requirements
- Calculate for all track segments between timing points
- Apply 5-point rolling average smoothing
- Report average and maximum SOG in knots

## Running Tests

### Manual Test Runner
```bash
npx ts-node src/lib/gpx/__tests__/test-runner.ts
```

### Jest Unit Tests
```bash
npm test -- validator.test.ts
```

### Using Test Files in App
1. Upload any GPX file from this directory to test FKT submission
2. Use the TEST route (Southport to Sneads Ferry)
3. Verify validation results match expected behavior

## File Format
All test files use standard GPX 1.1 format with:
- `<trkpt>` elements with lat/lon coordinates
- `<time>` elements for each track point
- Descriptive `<name>` elements for key points
- Metadata describing the test scenario

## Coordinate Reference
- **Route Start**: Southport (33.948889°, -78.011667°)
- **Route End**: Sneads Ferry (34.518056°, -77.448056°)
- **Distance**: ~40 nautical miles
- **Tolerance**: 10 meters for start/end validation