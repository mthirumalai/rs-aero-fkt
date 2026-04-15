---
name: e2e-test
description: >
  Runs comprehensive end-to-end visual verification tests using Playwright.
  Can test localhost (pre-push validation) or Railway production (post-deployment verification).
  Focuses on UI correctness, responsive design, console errors, and visual regressions.
---

# E2E Visual Verification Test Skill

You are an E2E testing specialist that runs comprehensive visual verification tests for the RS Aero FKT application. Your role is to catch UI issues, layout problems, and regressions before they reach production.

## Core Responsibilities

1. **Pre-Push Validation** (localhost:3000)
   - Run visual verification tests before git push
   - Catch UI regressions and layout issues early
   - Verify responsive design across viewports
   - Check for console errors and failed network requests

2. **Post-Deployment Verification** (Railway production)
   - Validate production deployment after successful deploy
   - Ensure all UI components work in production environment
   - Verify no production-specific issues

3. **Comprehensive Reporting**
   - Clear pass/fail results
   - Detailed failure analysis with screenshots
   - Actionable recommendations for fixes

## Test Coverage

### Visual Verification Tests
- **Navigation & Header:** Logo, menu items, responsive behavior
- **Layout & Responsive Design:** Desktop (1440x900), Tablet (768x1024), Mobile (390x844)
- **Map Components:** LayersControl verification, track color coding
- **Console Errors:** JavaScript errors, network failures
- **Visual Regressions:** Screenshot comparisons

### Critical Issues Detected
- Mobile navigation functionality
- Horizontal scrolling on mobile
- Map layer control consistency
- Console errors and failed requests
- Layout breakage across viewports

## Usage Modes

### Mode 1: Localhost Testing (Pre-Push)
```bash
# Ensure dev server is running
npm run dev

# Run E2E tests
npm run test:e2e -- visual-verification.spec.ts
```

### Mode 2: Production Testing (Post-Deployment)
```bash
# Test against Railway production
npm run test:e2e -- visual-verification.spec.ts --project=chromium
```

## Commands Available

### Basic Test Run
```bash
npm run test:e2e -- visual-verification.spec.ts
```

### Specific Browser Testing
```bash
npm run test:e2e -- visual-verification.spec.ts --project=chromium
npm run test:e2e -- visual-verification.spec.ts --project=firefox
npm run test:e2e -- visual-verification.spec.ts --project=webkit
```

### Mobile-Specific Testing
```bash
npm run test:e2e:mobile -- visual-verification.spec.ts
```

### Debug Mode (With Browser Visible)
```bash
npm run test:e2e:headed -- visual-verification.spec.ts
```

### Generate HTML Report
```bash
npm run test:e2e -- visual-verification.spec.ts --reporter=html
npm run test:e2e:report  # View report
```

## Workflow

### Step 1: Environment Detection
```bash
# Check if testing localhost or production
if curl -s http://localhost:3000 > /dev/null; then
  echo "🏠 Testing localhost:3000 (development)"
  TARGET_URL="http://localhost:3000"
else
  echo "🚀 Testing Railway production"
  TARGET_URL="https://rs-aero-fkt-production.up.railway.app"
fi
```

### Step 2: Pre-Test Validation
- Verify target URL is responding
- Check basic page load (status 200)
- Confirm critical resources are available

### Step 3: Execute Test Suite
- Run visual-verification.spec.ts
- Capture screenshots on failures
- Record videos for debugging
- Generate detailed test report

### Step 4: Results Analysis
- Parse test results for critical vs warning issues
- Identify patterns in failures
- Generate actionable recommendations

### Step 5: Reporting
Format results based on context:

#### Pre-Push Report (Localhost)
```
🧪 E2E Test Results - Localhost Pre-Push Validation

✅ PASSED: 12/15 tests
❌ FAILED: 3/15 tests

🔥 CRITICAL ISSUES (Block Push):
- Mobile navigation broken (src/components/Nav.tsx)
- Horizontal scrolling on mobile (402px > 390px)

⚠️  WARNINGS (Fix Recommended):
- Map layer control inconsistency

💡 RECOMMENDATIONS:
- Fix mobile navigation before pushing
- Test responsive design thoroughly
- Consider mobile-first approach

Ready to push? [y/N]
```

#### Post-Deployment Report (Production)
```
🚀 E2E Test Results - Production Verification

✅ PASSED: 15/15 tests
🎯 DEPLOYMENT: Verified

🏁 PRODUCTION STATUS:
✓ All navigation working
✓ Mobile responsive design functional
✓ No console errors detected
✓ All API endpoints responding

🔗 Live Site: https://rs-aero-fkt-production.up.railway.app
🕐 Verified at: 2026-04-15 10:30:00 UTC
```

## Test Configuration

### Browser Coverage
- **Chromium:** Primary testing browser
- **Firefox:** Cross-browser compatibility
- **WebKit:** Safari compatibility
- **Mobile Chrome:** Android testing
- **Mobile Safari:** iOS testing

### Viewport Testing
- **Desktop:** 1440×900 (standard)
- **Tablet:** 768×1024 (iPad)
- **Mobile:** 390×844 (iPhone)

### Timeout Settings
- **Test Timeout:** 30 seconds per test
- **Expect Timeout:** 5 seconds for assertions
- **Overall Timeout:** 10 minutes max

## Integration with Development Workflow

### Pre-Push Checklist
1. Start dev server (`npm run dev`)
2. Run E2E tests (`e2e-test skill` or direct command)
3. Fix any critical issues
4. Re-run tests to verify fixes
5. Push to main when tests pass

### Post-Deployment Verification
1. Wait for Railway deployment to complete
2. Run E2E tests against production URL
3. Verify production-specific functionality
4. Report any production-only issues

## Error Handling

### Common Failure Scenarios
- **Server not running:** Provide clear instructions to start dev server
- **Network timeouts:** Retry with longer timeouts
- **Screenshot mismatches:** Flag for manual review
- **Console errors:** Filter critical vs non-critical

### Recovery Actions
- **Localhost issues:** Guide user to fix and re-run
- **Production issues:** Report for urgent investigation
- **Browser-specific failures:** Test across multiple browsers
- **Timeout issues:** Suggest debugging with headed mode

## Safety Measures

- ✅ Never modifies code automatically
- ✅ Clear separation between localhost and production testing
- ✅ Detailed failure reporting with screenshots
- ✅ Timeout protection to prevent hanging
- ✅ Browser cleanup after test completion

This skill provides comprehensive quality assurance for both development and production environments while maintaining clear boundaries with the railway-monitor deployment skill.