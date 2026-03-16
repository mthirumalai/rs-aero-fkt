# Railway Production Deployment Guide

This guide covers deploying the RS Aero FKT application on Railway with SendGrid for email.

## Overview

**Recommended Architecture:**
- **Railway**: App hosting, PostgreSQL database, deployment
- **AWS S3**: File storage (GPX files and photos)
- **SendGrid**: Email service (free tier: 100 emails/day)
- **Railway**: HTTPS/SSL certificates, monitoring, logs

**Benefits:**
- ✅ Simple deployment on Railway
- ✅ Reliable S3 storage (pennies per month cost)
- ✅ Free email tier covers typical usage
- ✅ No code changes needed (app already designed for S3)

## Pre-Deployment Setup

### 1. Railway Account Setup

1. **Create Railway Account**:
   - Visit [railway.app](https://railway.app)
   - Sign up with GitHub (recommended for Git integration)
   - Verify your account

2. **Install Railway CLI** (optional but useful):
   ```bash
   npm install -g @railway/cli
   railway login
   ```

### 2. AWS S3 Storage Setup

1. **Create S3 Buckets**:
   - Go to AWS Console → S3 → Create bucket

   **GPX Bucket (Private):**
   - Bucket name: `rs-aero-fkt-gpx-production` (must be globally unique)
   - Region: Choose same region as your users (e.g., `us-east-1`)
   - **Block all public access** ✅ (keep enabled - GPX files should be private)
   - Create bucket

   **Photos Bucket (Public):**
   - Bucket name: `rs-aero-fkt-photos-production` (must be globally unique)
   - Same region as GPX bucket
   - **Unblock public access** ❌ (photos need to be publicly readable)
   - Create bucket

2. **Configure Photos Bucket for Public Read**:
   - Go to photos bucket → Permissions → Bucket Policy
   - Add this policy (replace `rs-aero-fkt-photos-production` with your bucket name):
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Sid": "PublicReadGetObject",
         "Effect": "Allow",
         "Principal": "*",
         "Action": "s3:GetObject",
         "Resource": "arn:aws:s3:::rs-aero-fkt-photos-production/*"
       }
     ]
   }
   ```

3. **Create IAM User for Railway**:
   - Go to IAM → Users → Create user
   - Name: `rs-aero-fkt-railway`
   - Attach policy directly → Create policy:
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Effect": "Allow",
         "Action": [
           "s3:GetObject",
           "s3:PutObject",
           "s3:DeleteObject"
         ],
         "Resource": [
           "arn:aws:s3:::rs-aero-fkt-gpx-production/*",
           "arn:aws:s3:::rs-aero-fkt-photos-production/*"
         ]
       }
     ]
   }
   ```

4. **Get Access Keys**:
   - Go to the created user → Security credentials → Create access key
   - Choose "Application running outside AWS"
   - Copy the Access Key ID and Secret Access Key (you'll need these for Railway)

### 3. SendGrid Email Setup

1. **Create SendGrid Account**:
   - Visit [sendgrid.com](https://sendgrid.com)
   - Sign up for free account (100 emails/day)
   - Verify your email address

2. **Create API Key**:
   - Go to Settings → API Keys
   - Click "Create API Key"
   - Choose "Restricted Access"
   - Enable only "Mail Send" permission
   - Copy the API key (you'll need it for Railway)

3. **Verify Sender Email**:
   - Go to Marketing → Sender Authentication → Single Sender Verification
   - Add the email address you'll send from (e.g., `noreply@yourdomain.com`)
   - Verify the email address

## Railway Deployment

### 1. Create Railway Project

1. **Create New Project**:
   - Go to [railway.app/dashboard](https://railway.app/dashboard)
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Connect and select your RS Aero FKT repository

2. **Add PostgreSQL Database**:
   - In your Railway project dashboard
   - Click "New Service"
   - Select "Database" → "PostgreSQL"
   - Railway will automatically provision a PostgreSQL instance

3. **Generate Public Domain**:
   - Go to your app service → Settings → Networking/Domains
   - Click "Generate Domain" or "Add Public Domain"
   - Railway will create a URL like `https://rs-aero-fkt-production-xxxx.up.railway.app`
   - Copy this URL for your environment variables

### 2. Configure Environment Variables

In your Railway project dashboard, go to your app service and add these variables:

#### Database (Auto-configured)
```env
# Railway automatically provides DATABASE_URL
# No manual configuration needed for PostgreSQL connection
```

#### NextAuth Configuration
```env
# Use the Railway URL you generated above
NEXTAUTH_URL=https://rs-aero-fkt-production-xxxx.up.railway.app
# Generate new secret with: openssl rand -base64 32
NEXTAUTH_SECRET=your_secure_nextauth_secret_here
```

#### OAuth Providers
```env
# Google OAuth (required)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Apple OAuth (optional)
APPLE_CLIENT_ID=your_apple_client_id
APPLE_CLIENT_SECRET=your_apple_client_secret
```

#### AWS S3 Storage
```env
# AWS credentials from S3 setup
AWS_ACCESS_KEY_ID=your_aws_access_key_id
AWS_SECRET_ACCESS_KEY=your_aws_secret_access_key
AWS_REGION=us-east-1

# S3 bucket names from setup
S3_BUCKET_GPX=rs-aero-fkt-gpx-production
S3_BUCKET_PHOTOS=rs-aero-fkt-photos-production

# Disable local dev mode for production
USE_LOCAL_DEV=false
```

#### Email Service (SendGrid)
```env
# SendGrid API key from setup step
SENDGRID_API_KEY=your_sendgrid_api_key
SES_FROM_EMAIL=noreply@yourdomain.com
ADMIN_EMAIL=admin@yourdomain.com

# Use SendGrid instead of AWS SES
EMAIL_PROVIDER=sendgrid
```

#### Production Settings
```env
NODE_ENV=production

# Port configuration for Railway
PORT=8080
HOSTNAME=0.0.0.0
```

### 3. Configure OAuth Providers

Update your OAuth applications with Railway URLs:

#### Google OAuth Console
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to "APIs & Services" → "Credentials"
3. Edit your OAuth 2.0 Client ID
4. Add to "Authorized redirect URIs":
   ```
   https://rs-aero-fkt-production-xxxx.up.railway.app/api/auth/callback/google
   ```
   (Replace with your actual Railway URL)

#### Apple Developer (if using)
1. Go to [Apple Developer](https://developer.apple.com/account/)
2. Update your Services ID configuration
3. Add Railway domain to allowed domains

### 4. Update Application Code for SendGrid

Create a SendGrid email service file:

```typescript
// src/lib/email/sendgrid.ts
import sgMail from '@sendgrid/mail';

sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

export async function sendRouteApprovalEmail({
  routeId,
  routeName,
  submitterName,
  submitterEmail,
  approvalToken,
  baseUrl,
}: {
  routeId: string;
  routeName: string;
  submitterName: string;
  submitterEmail: string;
  approvalToken: string;
  baseUrl: string;
}) {
  const approvalUrl = `${baseUrl}/admin/approve-route?token=${approvalToken}`;

  const msg = {
    to: process.env.ADMIN_EMAIL!,
    from: process.env.SES_FROM_EMAIL!,
    subject: `New Route Submission: ${routeName}`,
    html: `
      <h2>New Route Submission</h2>
      <p><strong>Route:</strong> ${routeName}</p>
      <p><strong>Submitted by:</strong> ${submitterName} (${submitterEmail})</p>
      <p><strong>Route ID:</strong> ${routeId}</p>

      <p>Please review and approve/reject this route:</p>
      <a href="${approvalUrl}" style="background: #0066cc; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
        Review Route
      </a>

      <p><small>Direct link: ${approvalUrl}</small></p>
    `
  };

  await sgMail.send(msg);
}
```

Install SendGrid dependency:
```bash
npm install @sendgrid/mail
```

Update your existing email service to use SendGrid:
```typescript
// src/lib/email/ses.ts
import { sendRouteApprovalEmail as sendGridEmail } from './sendgrid';

export const sendRouteApprovalEmail = process.env.EMAIL_PROVIDER === 'sendgrid'
  ? sendGridEmail
  : /* existing SES implementation */;
```

### 5. Database Migration

Railway will automatically build and deploy your app. After the first deployment, you need to apply database migrations:

1. **Get External Database URL**:
   - Go to Railway dashboard → PostgreSQL service → "Connect" tab
   - Copy the **"Public URL"** (should look like):
     ```
     postgresql://postgres:password@nozomi.proxy.rlwy.net:14092/railway
     ```

2. **Run Database Migrations** (one-time setup):
   ```bash
   # From your project directory, run migrations using external URL
   DATABASE_URL="postgresql://postgres:your_password@your_host:port/railway" npx prisma migrate deploy
   ```
   Replace the DATABASE_URL with your actual Public URL from step 1.

3. **Verify Migration Success**:
   ```bash
   # Optional: Check migration status
   DATABASE_URL="your_public_url_here" npx prisma migrate status
   ```

4. **Optional: Seed Database** (if you have seed data):
   ```bash
   DATABASE_URL="your_public_url_here" npx prisma db seed
   ```

**Important Notes:**
- Use the **Public URL** from Railway, not the internal `postgres.railway.internal` address
- This is a **one-time setup** - don't run migrations on every app startup
- Only run migrations again when you make schema changes
- Keep your Railway start command as `npm start` (no auto-migrations)

### 6. Deploy Application

Railway automatically deploys when you push to your connected Git branch:

```bash
# Deploy latest changes
git add .
git commit -m "Configure Railway production environment"
git push origin main

# Railway will automatically build and deploy
```

## Custom Domain Setup (Optional)

### 1. Configure Custom Domain in Railway

1. **Add Custom Domain**:
   - Go to your Railway project dashboard
   - Select your app service
   - Go to "Settings" → "Domains"
   - Click "Add Domain"
   - Enter your domain (e.g., `rsaerofkt.com`)

2. **Railway provides DNS instructions**:
   - CNAME record pointing to Railway
   - Or A records if using apex domain

### 2. Configure DNS

If using Cloudflare, Route 53, or other DNS provider:
```bash
# Add CNAME record (replace with Railway's instructions)
# Name: @ (or your subdomain)
# Value: your-app-name.railway.app
# TTL: Auto or 300
```

### 3. Update Environment Variables

After custom domain is active, update:
```env
NEXTAUTH_URL=https://yourdomain.com
```

And update OAuth provider redirect URIs to use your custom domain.

## Monitoring and Maintenance

### 1. Railway Built-in Monitoring

Railway provides:
- **Deployment logs**: Real-time build and runtime logs
- **Metrics**: CPU, memory, and network usage
- **Uptime monitoring**: Automatic health checks
- **Database metrics**: Connection count, query performance
- **Volume usage**: Storage space monitoring

Access via Railway dashboard → your service → "Observability"

### 2. Application Logs

View logs in Railway dashboard or via CLI:
```bash
# View recent logs
railway logs

# Follow logs in real-time
railway logs --tail
```

### 3. File Storage Management

#### Accessing Files
```bash
# Connect to your app to manage files
railway shell
ls -la /app/uploads
```

#### Storage Usage
Monitor volume usage in Railway dashboard:
- Go to your Volume service
- Check "Usage" tab for storage statistics
- Increase volume size if needed

#### Backup Strategy
```bash
# Create backup script (run locally)
#!/bin/bash

# Download all files from Railway volume
railway shell 'tar -czf backup.tar.gz /app/uploads'
railway shell 'cat backup.tar.gz' > "backup_$(date +%Y%m%d).tar.gz"

echo "Backup completed: backup_$(date +%Y%m%d).tar.gz"
```

### 4. Database Management

#### Accessing Database
```bash
# Connect via Railway CLI
railway connect postgres

# Or get connection details from Railway dashboard
# Use any PostgreSQL client with the provided connection string
```

#### Database Backups

Railway automatically backs up your PostgreSQL database, but you can also create manual backups:

```bash
# Create manual backup script
#!/bin/bash

# Get Railway database URL from environment
DATABASE_URL=$(railway variables get DATABASE_URL)

# Create backup
pg_dump "$DATABASE_URL" | gzip > "backup_$(date +%Y%m%d_%H%M%S).sql.gz"

echo "Manual database backup completed"
```

## Scaling and Performance

### 1. Automatic Scaling

Railway automatically scales based on:
- **CPU usage**: Scales up when consistently high
- **Memory usage**: Adds resources as needed
- **Request volume**: Handles traffic spikes

### 2. Manual Resource Configuration

Adjust resources in Railway dashboard:
- **Memory**: 512MB to 8GB per service
- **CPU**: Shared to dedicated vCPUs
- **Storage**: Increase volume size as needed

### 3. Performance Optimization

Monitor and optimize:
```bash
# Check app performance
railway logs | grep -i "slow\|error"

# Monitor database performance
railway connect postgres
\x
SELECT * FROM pg_stat_activity;
```

## Cost Management

### 1. Railway Pricing (as of 2024)

**Starter Plan** (Free):
- $5/month in usage credits
- Good for development/testing

**Pro Plan** ($20/month):
- Usage-based pricing beyond credits
- Production features (custom domains, etc.)

**Estimated Monthly Costs**:
- Small app: $20-30/month (app + database + 5GB storage)
- Medium traffic: $40-60/month
- High traffic: $80+ /month

### 2. SendGrid Cost

**Free tier**: 100 emails/day (3,000/month)
- Perfect for RS Aero FKT usage
- **Cost: $0**

### 3. Cost Optimization Tips

- **Monitor usage** in Railway dashboard
- **Optimize database queries** to reduce CPU usage
- **Use appropriate volume sizes** (start small, grow as needed)
- **Review monthly bills** and adjust resources accordingly

## Deployment Automation

### 1. Automatic Deployments

Railway automatically deploys when you push to connected branch:

```bash
# Development workflow
git checkout -b feature/new-feature
# Make changes
git add .
git commit -m "Add new feature"
git push origin feature/new-feature

# Create PR, review, merge to main
# Railway automatically deploys main branch
```

### 2. Health Checks

Railway automatically monitors your app, but you can add custom health checks:

```typescript
// pages/api/health.ts
export default function handler(req, res) {
  // Check database connection
  // Check file storage access
  // Check SendGrid API

  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    database: 'connected',
    storage: 'accessible',
    email: 'configured'
  });
}
```

### 3. Rollback Strategy

If deployment fails:
```bash
# Via Railway CLI
railway rollback

# Or via dashboard:
# Go to Deployments → Select previous version → Rollback
```

## Security Considerations

### 1. Environment Variables

Railway securely manages environment variables:
- **Encrypted at rest**: All variables encrypted
- **Access control**: Team-based permissions
- **Audit logs**: Track who changed what

### 2. Database Security

Railway PostgreSQL includes:
- **Network isolation**: Database not publicly accessible
- **Automatic security updates**: Railway handles patches
- **Backup encryption**: All backups encrypted
- **SSL connections**: Enforced by default

### 3. File Storage Security

Network volumes are:
- **Private by default**: Only accessible by your application
- **Encrypted**: Files encrypted at rest
- **Access controlled**: Through your application only

### 4. Application Security

Implement standard security practices:
```typescript
// next.config.js
module.exports = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          }
        ]
      }
    ];
  }
};
```

## Troubleshooting

### 1. Deployment Issues

```bash
# Check build logs
railway logs --build

# Check runtime logs
railway logs --tail

# Check environment variables
railway variables
```

### 2. Database Connection Issues

```bash
# Test database connection
railway shell
npx prisma db execute --stdin < /dev/null

# Check database status in Railway dashboard
# Restart database service if needed
```

### 3. File Storage Issues

```bash
# Check volume mount and permissions
railway shell
ls -la /app/uploads
df -h /app/uploads

# Test file write/read
echo "test" > /app/uploads/test.txt
cat /app/uploads/test.txt
```

### 4. Email Issues

```bash
# Test SendGrid API key
railway shell
curl -X "POST" "https://api.sendgrid.com/v3/mail/send" \
     -H "Authorization: Bearer $SENDGRID_API_KEY" \
     -H "Content-Type: application/json" \
     -d '{"personalizations":[{"to":[{"email":"test@example.com"}]}],"from":{"email":"noreply@yourdomain.com"},"subject":"Test","content":[{"type":"text/plain","value":"Test email"}]}'
```

### 5. OAuth Issues

Common fixes:
- Verify redirect URIs match exactly (including https://)
- Check environment variables are set correctly
- Ensure OAuth apps are in production mode

### 6. Performance Issues

```bash
# Check resource usage
railway status

# Monitor in Railway dashboard
# Consider upgrading plan if consistently hitting limits
```

## Migration from Other Platforms

### From AWS/EC2
```bash
# Export environment variables
# Migrate database data if needed:
# Export from old database
pg_dump old_database_url > backup.sql

# Import to Railway
railway connect postgres < backup.sql

# Migrate files to Railway volume
scp -r old_server:/path/to/files/* ./local_files/
# Then upload to Railway volume through app
```

---

## Alternative: AWS Storage + Email

If you prefer using AWS services for storage and email (more complex but more scalable):

### AWS S3 + SES Setup

#### 1. S3 Buckets
```bash
# Create S3 buckets
aws s3 mb s3://rs-aero-fkt-gpx-prod
aws s3 mb s3://rs-aero-fkt-photos-prod
```

**GPX Bucket (Private)**:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "DenyPublicRead",
      "Effect": "Deny",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::rs-aero-fkt-gpx-prod/*"
    }
  ]
}
```

**Photos Bucket (Public Read)**:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::rs-aero-fkt-photos-prod/*"
    }
  ]
}
```

#### 2. SES Email Service
```bash
# Verify your domain in SES
aws ses verify-domain-identity --domain yourdomain.com

# Request production access (exit sandbox)
# Submit request in AWS SES console to increase sending limits
```

#### 3. IAM User for Railway
Create an IAM user with programmatic access and these policies:
- `AmazonS3FullAccess` (or custom policy for your buckets only)
- `AmazonSESFullAccess` (or custom policy for sending only)

#### 4. Railway Environment Variables (AWS Version)
```env
# Database (auto-configured by Railway)
# OAuth providers (same as above)
# Production settings (same as above)

# AWS Services
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=us-east-1

# S3 Buckets
S3_BUCKET_GPX=rs-aero-fkt-gpx-prod
S3_BUCKET_PHOTOS=rs-aero-fkt-photos-prod

# SES Email
SES_FROM_EMAIL=noreply@yourdomain.com
ADMIN_EMAIL=admin@yourdomain.com

# Use S3 instead of local storage
USE_LOCAL_DEV=false
```

### AWS Cost Comparison
- **S3**: ~$0.023/GB/month (much cheaper for large storage)
- **SES**: Free for 62,000 emails/month from EC2, $1/10k emails otherwise
- **Total for 5GB + 1000 emails/month**: ~$0.25/month

**Use AWS if:**
- You need unlimited storage
- You plan to have thousands of users
- You want the absolute lowest cost at scale
- You don't mind the additional complexity

**Use Railway-only if:**
- You want maximum simplicity
- You're okay paying ~$1/month extra for convenience
- You prefer single-platform management
- You want faster development iteration

This completes the comprehensive Railway deployment guide with both approaches!