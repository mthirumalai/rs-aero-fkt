# Malformed GPX Test Files

These files are designed to test GPX validation and error handling.

## Test Cases

### 01_invalid_xml.gpx
- **Issue**: Missing closing bracket in XML tag
- **Expected**: XML parsing error
- **Line**: Line 7 (missing `>` in trkpt tag)

### 02_missing_coordinates.gpx
- **Issue**: Missing required lat/lon attributes
- **Expected**: Missing coordinate validation error
- **Lines**: Line 8 (missing lat), Line 12 (missing lon)

### 03_invalid_coordinates.gpx
- **Issue**: Invalid coordinate values
- **Expected**: Invalid number/out-of-range validation errors
- **Lines**: Line 8 (text instead of number), Line 12 (out of range), Line 16 (both invalid)

### 04_invalid_timestamps.gpx
- **Issue**: Malformed timestamp data
- **Expected**: Date parsing errors
- **Lines**: Line 8 (invalid text), Line 12 (impossible date), Line 15 (missing time)

### 05_empty_file.gpx
- **Issue**: Completely empty file
- **Expected**: No content error

### 06_wrong_structure.gpx
- **Issue**: KML format instead of GPX
- **Expected**: Wrong file format error

### 07_no_trackpoints.gpx
- **Issue**: Valid GPX but no track points
- **Expected**: No track data error

### 08_binary_data.gpx
- **Issue**: Plain text/binary data, not XML
- **Expected**: Invalid file format error

## Testing Instructions

1. Try uploading each file through the route submission form
2. Check that meaningful error messages are displayed
3. Verify that the app doesn't crash or show confusing errors
4. Ensure line numbers are reported where possible

## Current Parser Limitations

The current `parseGpxXml()` function in `/src/lib/gpx/parser.ts`:
- Uses basic regex parsing (no proper XML validation)
- Silently ignores malformed elements
- May produce `NaN` values for invalid coordinates
- Limited error reporting capabilities

Consider enhancing error handling for better user experience.