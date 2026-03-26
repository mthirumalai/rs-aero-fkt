# End-to-End Tests for RS Aero FKT

This directory contains Playwright-based end-to-end tests for the RS Aero FKT application.

## Setup

The E2E tests are already configured and ready to run. Playwright and browser binaries have been installed during the setup process.

## Running Tests

### Prerequisites

Make sure your development server is running:
```bash
npm run dev
```

The app should be accessible at `http://localhost:3000`.

### Basic Test Commands

```bash
# Run all E2E tests (headless)
npm run test:e2e

# Run tests with browser UI visible
npm run test:e2e:headed

# Run tests with Playwright UI for debugging
npm run test:e2e:ui

# Debug specific test with breakpoints
npm run test:e2e:debug

# Run only Chrome tests
npm run test:e2e:chromium

# Run only Firefox tests
npm run test:e2e:firefox

# Run only Safari/WebKit tests
npm run test:e2e:webkit

# Run mobile device tests
npm run test:e2e:mobile

# View test report after running
npm run test:e2e:report
```

### Running Specific Tests

```bash
# Run specific test file
npx playwright test landing.spec.ts

# Run specific test by name
npx playwright test --grep "should load landing page"

# Run tests matching pattern
npx playwright test --grep "authentication"
```

## Test Structure

### Test Files

- `landing.spec.ts` - Tests for the landing page
- `routes.spec.ts` - Tests for route listing and details
- `authentication.spec.ts` - Tests for OAuth sign-in flow
- `gpx-upload.spec.ts` - Tests for GPX file upload and validation
- `fkt-details.spec.ts` - Tests for FKT attempt details (map, charts, playback)
- `athlete-profile.spec.ts` - Tests for athlete profile pages
- `admin.spec.ts` - Tests for admin functionality (route approval)
- `user-journey.spec.ts` - Complete end-to-end user flows

### Fixtures and Helpers

- `fixtures/test-helpers.ts` - Utility functions for common test operations
- `fixtures/mock-data.ts` - Mock data for testing (routes, athletes, GPX files)

## Test Configuration

The tests are configured in `playwright.config.ts` with the following features:

- **Cross-browser testing**: Chrome, Firefox, Safari
- **Mobile testing**: iPhone and Android viewports
- **Automatic retries**: 2 retries on CI
- **Screenshots**: Captured on test failure
- **Video recording**: Captured on retry/failure
- **Trace collection**: Available for debugging
- **Dev server integration**: Automatically starts/stops dev server

## Test Data

### Mock GPX Files

Tests use mock GPX data generated in `fixtures/mock-data.ts`. This includes:
- Valid track points with timestamps and speed data
- Route coordinates for the Solent area
- Multiple rig size configurations

### Authentication

Tests handle authentication by:
- Mocking authenticated state for protected routes
- Testing OAuth button visibility and interaction
- Skipping actual OAuth flows (which require production credentials)

## Browser Support

Tests run on:
- **Desktop**: Chrome, Firefox, Safari
- **Mobile**: iOS Safari, Android Chrome
- **Tablets**: iPad viewport testing

## Debugging Tests

### Visual Debugging
```bash
# Run with browser visible
npm run test:e2e:headed

# Use Playwright UI for step-by-step debugging
npm run test:e2e:ui

# Debug with breakpoints
npm run test:e2e:debug
```

### Screenshots and Videos

Failed tests automatically capture:
- Screenshots at the point of failure
- Video recordings of the entire test run
- Trace files for detailed debugging

Access these in `test-results/` directory after test runs.

### Console Logs

To see browser console logs during tests:
```javascript
// In test files
page.on('console', msg => console.log(msg.text()));
```

## CI/CD Integration

Tests are configured for CI environments:
- Single worker (no parallel tests)
- 2 automatic retries
- HTML report generation
- Test result artifacts

### GitHub Actions Example

```yaml
- name: Run E2E tests
  run: |
    npm run build
    npm run test:e2e

- name: Upload test results
  uses: actions/upload-artifact@v3
  if: always()
  with:
    name: playwright-report
    path: playwright-report/
```

## Best Practices

### Test Isolation

- Each test is independent and can run in any order
- Tests clean up after themselves
- No shared state between tests

### Selectors

- Use `data-testid` attributes for reliable element selection
- Prefer semantic selectors over CSS classes
- Use text-based selectors for user-facing elements

### Waiting Strategies

- Use `waitFor()` for dynamic content
- Use `waitForAppReady()` helper for application state
- Avoid fixed `setTimeout()` calls

### Error Handling

- Tests gracefully handle missing elements
- Auth-required tests skip appropriately
- Error states are tested explicitly

## Common Issues

### Port Conflicts

If tests fail to connect, ensure:
- Dev server is running on port 3000
- No other processes are using port 3000
- Firewall isn't blocking localhost connections

### Slow Tests

For slow-running tests:
- Check network timeouts
- Verify test data exists
- Use more specific selectors
- Reduce unnecessary waiting

### Authentication Issues

For auth-related test failures:
- Tests use mock authentication by default
- Real OAuth flows are skipped in tests
- Admin tests require proper setup

## Extending Tests

### Adding New Tests

1. Create new `.spec.ts` file in `/e2e` directory
2. Follow existing test patterns
3. Use test helpers for common operations
4. Add mock data to `fixtures/mock-data.ts` if needed

### Custom Fixtures

Add new test utilities to `fixtures/test-helpers.ts`:
```typescript
async waitForNewFeature() {
  // Custom waiting logic
}
```

### Test Data

Add new mock data to `fixtures/mock-data.ts`:
```typescript
export const mockNewFeature = {
  // Mock data structure
};
```