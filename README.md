# RS Aero FKT

Fastest Known Times for RS Aero sailing routes — all four rig sizes (5, 6, 7, 9).

## Tech Stack

- **Framework**: Next.js 14 (App Router), TypeScript
- **Database**: AWS RDS PostgreSQL via Prisma 5
- **Auth**: NextAuth.js v5 (Google + Apple OAuth)
- **Storage**: AWS S3 (GPX files + photos)
- **Maps**: Leaflet + react-leaflet (OpenStreetMap)
- **Charts**: Recharts (SOG time-series)
- **Email**: SendGrid (contact form) + AWS SES (admin approval notifications)
- **UI**: Tailwind CSS + shadcn/ui

## Setup

### Prerequisites
- Node.js 20+ (required by Prisma)
- PostgreSQL database (AWS RDS recommended)
- AWS account (S3, SES)
- SendGrid account (for contact form emails)
- Google OAuth app (Google Cloud Console)
- Apple OAuth app (Apple Developer)

### 1. Install dependencies
```bash
nvm use 20
npm install
```

### 2. Configure environment variables
```bash
cp .env.example .env
# Fill in your actual values
```

### 3. Run database migration
```bash
npx prisma migrate dev --name init
```

### 4. Start dev server
```bash
npm run dev
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `NEXTAUTH_URL` | App URL (e.g. `http://localhost:3000`) |
| `NEXTAUTH_SECRET` | Random secret for session signing |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |
| `APPLE_CLIENT_ID` | Apple Sign In service ID |
| `APPLE_CLIENT_SECRET` | Apple private key (JWT) |
| `AWS_REGION` | e.g. `us-east-1` |
| `AWS_ACCESS_KEY_ID` | AWS IAM credentials |
| `AWS_SECRET_ACCESS_KEY` | AWS IAM credentials |
| `S3_BUCKET_GPX` | Private S3 bucket for GPX tracks |
| `S3_BUCKET_PHOTOS` | Public-read S3 bucket for photos |
| `SENDGRID_API_KEY` | SendGrid API key for contact form emails |
| `SES_FROM_EMAIL` | Sender email address (for both SendGrid and SES) |
| `ADMIN_EMAIL` | Admin email for route approval |

## AWS S3 Buckets

Create two buckets:
1. `rs-aero-fkt-gpx` — Private (no public access)
2. `rs-aero-fkt-photos` — Public-read (for displaying photos)

**IMPORTANT**: Add CORS policy to both buckets to allow direct browser uploads:

### Via AWS Console:
1. Go to S3 Console → Bucket → Permissions → Cross-origin resource sharing (CORS)
2. Add this policy:

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
    "AllowedOrigins": ["*"],
    "ExposeHeaders": [],
    "MaxAgeSeconds": 3000
  }
]
```

### Via AWS CLI:
```bash
# Save the JSON above as cors-policy.json with {"CORSRules": [...]} wrapper
aws s3api put-bucket-cors --bucket your-bucket-name --cors-configuration file://cors-policy.json
```

**Note**: Using `"*"` for origins/headers is permissive but works across all browsers including Safari. For production, consider restricting origins to your specific domains.

## Key Features

- **GPX validation**: Tracks validated against route endpoints within 10m tolerance
- **Track playback**: 1x/2x/5x/10x speed, animated map marker via RAF loop
- **SOG chart**: Speed over ground synced to playback cursor
- **Region filtering**: Routes filterable by region (AU, EU, UK/IRL, NA, Other)
- **Admin approval**: Single-use token-based route approval via email
- **4 rig sizes**: Separate FKT records per rig (Aero 5/6/7/9)

## Milestones

- **M1** ✓ Foundation: Auth, DB, Nav
- **M2** ✓ Routes: Submit, Approve, View
- **M3** ✓ FKT Submission + GPX Validation
- **M4** ✓ FKT Detail Page: Track Playback + SOG Chart
- **M5** ✓ Athlete Profiles + Landing FKT Table
- **M6** — Hardening: Admin dashboard, rate limiting, Sentry
