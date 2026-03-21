---
name: visual-verify
description: >
  Use this skill whenever you need to visually inspect a web page for layout issues,
  CSS breakage, rendering problems, or UI correctness. Trigger this skill when the user
  asks to: verify a page looks right, check for visual/CSS bugs, inspect layout across
  screen sizes, or confirm that a UI change didn't break anything. Also trigger when
  asked to "check the page", "see if it looks broken", "test the UI", or any variant
  of visual QA. Even if the user just says "does it look OK?" about a URL — use this skill.
---

# Visual Verification Skill

You are performing a visual and functional check of a web page using Claude in Chrome.
Your goal is to catch CSS breakage, layout problems, missing assets, and JS errors — and
report them clearly so the developer can act on findings immediately.

---

## Known pages for this project (RS Aero FKT)

When asked to do a full site check with no specific URL, verify all of these:

| Page | URL |
|------|-----|
| Landing | http://localhost:3000/ |
| All FKTs | http://localhost:3000/fkts |
| All Routes | http://localhost:3000/routes |
| Stats | http://localhost:3000/stats |
| Guidelines | http://localhost:3000/guidelines |
| Contact | http://localhost:3000/contact |
| Admin – Pending Routes | http://localhost:3000/admin/pending-routes |

For the admin page, note whether it redirects to a login/auth wall — that's expected behaviour,
not a bug. Report what you land on.

---

## Step 1: Navigate to the page

Use `navigate` to load the URL. If the user hasn't given you a URL, use the full page list above.

After navigating, wait a moment for the page to settle (JS frameworks may need a render cycle).
Use `read_console_messages` right away to capture any early errors.

---

## Step 2: Check for asset and JS errors

Use `read_network_requests` to scan for failed requests (status 4xx/5xx). Pay particular
attention to:
- Failed CSS files (broken styles)
- Failed JS files (broken interactivity)
- Failed fonts or images (visual gaps)
- Failed API calls that might prevent content from rendering

Use `read_console_messages` to catch:
- JS exceptions and stack traces
- Console errors and warnings
- Deprecation notices that indicate fragile code

Flag anything that looks like it would affect appearance or functionality.

---

## Step 3: Desktop screenshot and visual inspection

Use `resize_window` to set a standard desktop viewport (e.g. 1440 × 900).
Take a screenshot with `computer` and carefully inspect:

**Layout**
- Are elements positioned correctly (no overlapping, no unexpected gaps)?
- Is the page overflowing horizontally (horizontal scrollbar where there shouldn't be one)?
- Are columns or grids collapsing or misaligned?
- Are z-index issues causing elements to cover each other?

**Typography**
- Is text readable and not clipped or overflowing its container?
- Are fonts loading (or falling back to defaults in an ugly way)?
- Are headings, body text, and labels visually distinct as intended?

**Spacing and alignment**
- Are margins and padding consistent?
- Are buttons/inputs/labels lined up properly?

**Colour and contrast**
- Are there invisible elements (e.g. white text on white background)?
- Are interactive elements (buttons, links) visually distinguishable?

**Images and media**
- Are images loading and rendering at the right size?
- Are there broken image placeholders?

---

## Step 4: Tablet and mobile screenshots

Use `resize_window` to simulate a tablet (768 × 1024) and mobile (390 × 844) viewport.
Take a screenshot at each size. Focus on:

- Does the responsive layout kick in correctly?
- Is the navigation usable (hamburger menu, etc.)?
- Is text readable without zooming?
- Are touch targets (buttons, links) large enough?
- Is anything clipped or hidden that shouldn't be?

---

## Step 5: Targeted content check (optional)

If the user specified particular elements, flows, or components to check:
- Use `find` to locate the element
- Use `get_page_text` to confirm expected text is present
- Use `javascript_tool` to inspect computed styles or dimensions if needed (e.g.
  `window.getComputedStyle(document.querySelector('.my-class'))`)

---

## Step 6: Report your findings

Write a clear, structured report. Use this format:

---

### Visual Verification Report: [URL]
**Checked at:** [timestamp]
**Viewports:** Desktop (1440×900), Tablet (768×1024), Mobile (390×844)

#### ✅ Passed
- [List things that look correct]

#### ⚠️ Warnings
- [Non-breaking issues — things that look off but don't prevent usage]

#### ❌ Issues Found
- [Breaking issues — layout broken, assets failing, JS errors, invisible content]

#### Console Errors
- [Any JS errors, with the message and source location if available]

#### Failed Network Requests
- [Any 4xx/5xx requests, with URL and status code]

#### Recommendations
- [Concise, actionable suggestions to fix each issue]

---

Keep findings specific and actionable. Instead of "layout looks wrong", say
"The nav bar overlaps the hero image at mobile widths — likely a missing `z-index`
or `position: relative` on `.hero`." Developers should be able to act on each finding
directly.

If everything looks good, say so clearly — a clean bill of health is useful information too.

---

## Tips for tricky situations

- **Single-page apps (React, Vue, etc.):** After navigating, use `javascript_tool` to
  check `document.readyState` or wait for a known element to appear before screenshotting.
- **Auth-gated pages:** If you land on a login screen, note this and ask the user if
  they want to proceed with login or provide a direct URL to a logged-in state.
- **Dark mode:** If the user wants dark mode checked, use `javascript_tool` to toggle
  it: `document.documentElement.classList.add('dark')` (or whatever the app uses).
- **Animations:** If elements animate in, capture after settling. You can use
  `javascript_tool` to disable animations:
  `document.body.style.cssText += '*, *::before, *::after { animation-duration: 0s !important; transition-duration: 0s !important; }'`
