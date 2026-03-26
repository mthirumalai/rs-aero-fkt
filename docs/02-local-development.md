# Local Development Guide

This guide covers running the RS Aero FKT application and supporting services on your local machine.

## Daily Development Workflow

### 1. Start Database
```bash
# Check if PostgreSQL is running
brew services list | grep postgresql@16

# Start if not running
brew services start postgresql@16

# Verify connection
psql rsaerofkt -c "SELECT 1;"

# If you have multiple PostgreSQL versions, ensure only v16 is running:
brew services stop postgresql@15  # stop conflicting version if present
```

### 2. Ensure Correct Node Version
```bash
# Switch to Node 20 (required every terminal session)
nvm use 20

# Verify version
node --version  # Should be v20.x.x
```

### 3. Start Development Server
```bash
cd rs-aero-fkt
npm run dev
```

The application will be available at `http://localhost:3000`

## Environment Configuration

### Local Development Mode
For local development without AWS services, set:
```env
USE_LOCAL_DEV=true
LOCAL_UPLOAD_DIR=./local-uploads
```

This will:
- Store GPX/photo uploads in `./local-uploads/` instead of S3
- Print emails to console instead of sending via SES

### Required Environment Variables
```env
# Database
DATABASE_URL="postgresql://$(whoami)@localhost:5432/rsaerofkt"

# NextAuth (required)
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="[32-char random string]"

# OAuth (at least one required for auth)
GOOGLE_CLIENT_ID="your-client-id"
GOOGLE_CLIENT_SECRET="your-client-secret"

# Admin features
ADMIN_EMAIL="your-email@example.com"
```

## Database Management

### Common Prisma Commands
```bash
# Generate client after schema changes
npx prisma generate

# Apply schema changes to database
npx prisma db push

# Create and apply migration
npx prisma migrate dev --name description_of_change

# View database in browser
npx prisma studio
```

### Database Reset (Development Only)
```bash
# Reset database and apply all migrations
npx prisma migrate reset

# Or drop and recreate database
dropdb rsaerofkt
createdb rsaerofkt
npx prisma migrate deploy
```

### Backup/Restore (Optional)
```bash
# Backup
pg_dump rsaerofkt > backup.sql

# Restore
psql rsaerofkt < backup.sql
```

## Testing Routes and Features

### 1. Test Authentication
1. Visit `http://localhost:3000`
2. Click "Sign In" in top-right
3. Choose Google OAuth
4. Complete OAuth flow

### 2. Test Route Submission
1. Sign in as a user
2. Navigate to "Submit a Route" or `/routes/submit`
3. Fill out form with test data:
   - Name: "Test Route"
   - Start: "Portland Bill Lighthouse"
   - Start coordinates: `50.515, -2.458`
   - End: "Weymouth Harbor"
   - End coordinates: `50.606, -2.436`
4. Submit form

### 3. Test Admin Features
1. Set your email as `ADMIN_EMAIL` in `.env`
2. Visit `/admin/pending-routes`
3. You should see submitted routes with "Review →" buttons
4. Click button to test approval workflow

### 4. Test FKT Submission
1. Create and approve a route (steps 2-3)
2. Visit route detail page
3. Click "Submit FKT Attempt"
4. Upload a test GPX file

## File Upload Testing

### Local File Storage
When `USE_LOCAL_DEV=true`:
- Uploads go to `./local-uploads/gpx/` and `./local-uploads/photos/`
- Files are served from `/api/files/[type]/[filename]`
- No AWS credentials needed

### GPX Test Files
Create test GPX files or download from:
- Strava exports
- Garmin Connect
- Sample GPX generators online

Minimum GPX structure:
```xml
<?xml version="1.0"?>
<gpx version="1.1">
  <trk>
    <trkseg>
      <trkpt lat="50.515" lon="-2.458"><time>2024-01-01T10:00:00Z</time></trkpt>
      <trkpt lat="50.516" lon="-2.457"><time>2024-01-01T10:01:00Z</time></trkpt>
      <!-- more points -->
    </trkseg>
  </trk>
</gpx>
```

## Git Hooks and Testing

### Pre-commit Checks
Both tests and build verification run automatically before each commit to prevent broken functionality and display issues.

**What runs:**
- Unit tests (Jest)
- Build check (Next.js compilation)

**To bypass for urgent commits:**
```bash
# Skip pre-commit hook (including tests and build check)
git commit -m "urgent fix" --no-verify

# Or set environment variable
HUSKY=0 git commit -m "urgent fix"
```

**Manual checks:**
```bash
# Run just the build check manually
npm run build

# Run smoke test (build + server start + file checks)
npm run smoke-test
```

### Manual Test Execution
```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run in watch mode
npm run test:watch
```

## Debugging

### Check Logs
```bash
# Next.js logs appear in terminal where `npm run dev` is running
# Look for:
# - Database connection errors
# - Authentication errors
# - File upload errors
```

### Database Issues
```bash
# Check database connection
npx prisma db execute --stdin < /dev/null

# View all tables
psql rsaerofkt -c "\dt"

# Check specific table
psql rsaerofkt -c "SELECT * FROM \"Route\" LIMIT 5;"
```

### Authentication Issues
1. Verify Google OAuth URLs match exactly:
   - Development: `http://localhost:3000/api/auth/callback/google`
   - No trailing slashes
2. Check `NEXTAUTH_SECRET` is set
3. Verify `NEXTAUTH_URL` matches your dev server

### File Upload Issues
```bash
# Check upload directory exists and is writable
ls -la ./local-uploads/
mkdir -p ./local-uploads/gpx ./local-uploads/photos
```

## Performance Tips

### Database
- Use `npx prisma studio` for GUI database exploration
- Enable query logging: `DEBUG=prisma:query npm run dev`

### Frontend
- Use browser dev tools Network tab to monitor API calls
- Check React Developer Tools for component performance

### Development Build
```bash
# Test production build locally
npm run build
npm start
```

## Common Issues

### Port Already in Use
```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Or use different port
npm run dev -- --port 3001
```

### Node Version Switching
Add to `~/.zshrc`:
```bash
# Auto-switch Node version in project directories
autoload -U add-zsh-hook
load-nvmrc() {
  if [[ -f .nvmrc && -r .nvmrc ]]; then
    nvm use
  fi
}
add-zsh-hook chpwd load-nvmrc
```

### Package Installation Errors
```bash
# Use legacy peer deps (required for react-leaflet)
npm install --legacy-peer-deps

# Clear npm cache if issues persist
npm cache clean --force
```