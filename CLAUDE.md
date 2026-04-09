# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a web application for RS Aero sailors to publish and track Fastest Known Times (FKTs) for sailing routes. Think fastestknowntime.com but for sailing, with support for 4 RS Aero rig sizes.

The full product specification is in `initial_spec.md`.

## Key Domain Concepts

- **FKT**: Fastest Known Time — a record for completing a route as fast as possible
- **Rig sizes**: RS Aeros come in 4 sizes; FKT records are maintained separately per rig size
- **Route**: A start point + end point (lat/long coordinates), no intermediate waypoints
- **FKT Attempt**: A submitted GPX track validated against route endpoints (within 10m proximity)
- **Admin approval workflow**: Routes must be admin-approved before going live

## Core Features (V1 Scope)

- Google/Apple OAuth authentication (no custom auth)
- GPX or VCC track upload and validation against route lat/long (10m tolerance)
- Interactive coordinate editing with draggable map markers
- Public pages: landing, routes list, route details, FKT attempt details, athlete profile, guidelines
- FKT attempt details: wind/current conditions, GPX track playback (1x/2x/5x/10x), SOG chart, photos, write-up
- Admin email notification for route approval
- Routes have a country field and approval date

## Out of Scope (Future Versions)

- Government dataset integration for coordinate auto-complete
- Non-GPX track formats (fit, tcx, kml, etc.)
- Strava/RideWithGPS URL import
- Timeline feature linking write-up timestamps to track positions

## Development Commands

### Prerequisites
Node.js 20+ is required (Prisma 5 dependency):
```bash
nvm use 20
```

### Setup
```bash
npm install --legacy-peer-deps  # Required for react-leaflet@4 + React 18 compatibility
```

### Development Server
```bash
npm run dev                    # Standard Next.js dev server
npm run dev:local             # Use local PostgreSQL database
```

### Database Operations
```bash
npx prisma generate                           # Generate Prisma client
npx prisma migrate dev --name <description>   # Create and apply migration
npx prisma migrate deploy                     # Apply migrations (production)
npx prisma studio                            # Database admin UI
```

### Testing
```bash
npm test                      # Run all Jest unit tests
npm run test:watch           # Jest watch mode
npm run test:coverage        # Generate coverage report
npm run test:fast            # Run only critical tests (validator, ranking)

# End-to-end tests (Playwright)
npm run test:e2e             # Run all E2E tests
npm run test:e2e:headed      # Run with browser visible
npm run test:e2e:ui          # Open Playwright UI
npm run test:e2e:debug       # Debug mode
npm run test:e2e:mobile      # Mobile browser tests
```

### Build and Lint
```bash
npm run build                # Production build
npm run lint                 # ESLint check
npm run start                # Start production server
npm run start:production     # Apply migrations + start (Railway/prod)
```

## Key Technical Decisions

### Node/Tooling
- Node 20 required (`nvm use 20`) — Prisma 5 needs it
- Prisma 5 (not 7) — v7 requires adapter/accelerateUrl, incompatible with standard URL setup
- `--legacy-peer-deps` needed for react-leaflet@4 (needs React 18, project has React 18)

### UI
- shadcn/ui uses `@base-ui/react` in new versions — rewrote Button, Avatar, DropdownMenu to use Radix UI primitives instead
- Tailwind CSS v3 (not v4) — globals.css uses `@tailwind` directives with HSL CSS variables

### Prisma
- Schema at `prisma/schema.prisma` with URL in schema (not prisma.config.ts)
- Delete `prisma.config.ts` if it appears (it's a Prisma v7 artifact)
- Generate with: `npx prisma generate`
- Migrate with: `npx prisma migrate dev --name <name>`

### Maps
- Leaflet must be `dynamic()` with `ssr: false` — always
- Track playback uses imperative `marker.setLatLng()` + RAF loop (not React state)
- Binary search for performance with large track arrays
- Interactive coordinate editing with draggable markers
- Bidirectional sync between text inputs and map markers

### AWS
- Two S3 buckets: private GPX, public-read photos
- SES needs verified sender email in AWS console
- Approval token flow: UUID stored as `approvalToken`, cleared after use

## Architecture Overview

### Domain Model (Prisma Schema)
The core entities are:
- **User**: Athletes with OAuth accounts (Google/Apple/Email)
- **Course**: Sailing routes with start/finish coordinates, approval workflow
- **FktAttempt**: GPX track submissions validated against course endpoints
- **Enums**: `RigSize` (AERO_5/6/7/9), `CourseStatus`, `AttemptStatus`, `CourseType`

### Authentication Flow
- NextAuth v5 with Google/Apple OAuth + magic links
- Database sessions (30-day duration)
- Account linking for multiple OAuth providers per user
- Admin access controlled via `ADMIN_EMAIL` environment variable

### GPX Validation System
Located in `src/lib/gpx/`:
- **Point-to-point routes**: Track must pass within 10m of start, then finish
- **Out-and-back routes**: Must cross start twice + round turning mark
- **Validation logic**: Haversine distance, chronological ordering, proper mark rounding
- **SOG computation**: Speed over ground with 5-point rolling average

### File Upload Architecture
- **GPX files**: Private S3 bucket, parsed server-side
- **Photos**: Public S3 bucket with presigned upload URLs
- **Parsing**: Supports GPX and Velocitek VCC formats

### Map & Track Playback
- **Leaflet maps**: Dynamic imports with SSR disabled
- **Track playback**: Imperative animation using `requestAnimationFrame`
- **SOG charts**: Recharts with cursor sync to map playback position
- **Performance**: Binary search for large track datasets

### Interactive Coordinate Editing
- **Course submission**: Draggable markers for Point-to-Point and Out-and-Back courses
- **Admin approval**: Existing maps become editable with toggle button
- **Real-time sync**: Coordinates update in text inputs as markers are dragged
- **User controls**: Escape to cancel, Undo to revert, Save to confirm changes
- **Visual feedback**: Ghost markers show original positions, different cursors for drag vs navigation
- **Change tracking**: Modified coordinates highlighted in admin approval workflow

### Region System
Routes are categorized by country code mapping to regions:
- Australia & NZ, Europe, UK & Ireland, North America, Other
- No database dependency — hardcoded mapping in `src/lib/regions.ts`

### Email System
- **Admin notifications**: AWS SES for route approval emails
- **Contact form**: SendGrid for user submissions
- **Magic links**: SES for email authentication

## File Structure Highlights
- `src/lib/regions.ts` — Region → country code mapping (no DB)
- `src/lib/gpx/validator.ts` — Haversine 10m proximity check
- `src/lib/gpx/sog.ts` — SOG computation + 5-point rolling average
- `src/components/map/TrackMapInner.tsx` — Imperative marker + RAF
- `src/components/map/EditablePointMap.tsx` — Interactive coordinate editing with drag support
- `src/components/map/PointMapInner.tsx` — Enhanced with editable mode and drag handlers
- `src/components/forms/CoordinateEditor.tsx` — Combined text inputs + interactive map
- `src/components/playback/TrackPlayback.tsx` — Play/pause/speed controls
- `src/lib/auth.ts` — NextAuth v5 configuration with account linking
- `src/app/api/` — Next.js API routes for uploads, validation, admin actions
- `src/app/admin/approve-course/ApprovalPageWithEditing.tsx` — Unified approval with coordinate editing

## Database Schema Notes
- PostgreSQL with enum types for status management
- Course approval uses single-use tokens
- FKT attempts validated against course coordinates
- Status history tracking for audit trail
- Separate photo tables for courses vs attempts

## Development Environment
- Port 3000 only for development server
- Railway deployment with pre-deploy command: `npx prisma generate && npx prisma migrate deploy`
- Local PostgreSQL recommended for development
- AWS resources required for full functionality (S3, SES)