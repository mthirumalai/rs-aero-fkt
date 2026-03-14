# Railway Production Deployment Guide

This guide covers deploying the RS Aero FKT application on Railway with supporting AWS services.

## Overview

Railway provides a Platform-as-a-Service that handles:
- Automatic deployments from Git
- Managed PostgreSQL database
- HTTPS/SSL certificates
- Environment variable management
- Built-in monitoring and logs
- Automatic scaling

We'll still use AWS for:
- S3 file storage (GPX tracks and photos)
- SES email service
- Route 53 DNS (if using custom domain)

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

### 2. AWS Services Setup

You'll still need AWS for file storage and email:

#### S3 Buckets
```bash
# Create S3 buckets
aws s3 mb s3://rs-aero-fkt-gpx-prod
aws s3 mb s3://rs-aero-fkt-photos-prod
```

**GPX Bucket (Private)** - Apply this bucket policy:
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

**Photos Bucket (Public Read)** - Apply this bucket policy:
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

#### SES Email Service
```bash
# Verify your domain in SES
aws ses verify-domain-identity --domain yourdomain.com

# Request production access (exit sandbox)
# Submit request in AWS SES console to increase sending limits
```

#### IAM User for Railway
Create an IAM user with programmatic access and these policies:
- `AmazonS3FullAccess` (or custom policy for your buckets only)
- `AmazonSESFullAccess` (or custom policy for sending only)

Save the Access Key ID and Secret Access Key for Railway environment variables.

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

### 2. Configure Environment Variables

In your Railway project dashboard, go to your app service and add these variables:

#### Database (Auto-configured)
```env
# Railway automatically provides DATABASE_URL
# No manual configuration needed for PostgreSQL connection
```

#### NextAuth Configuration
```env
NEXTAUTH_URL=https://your-app-name.railway.app
NEXTAUTH_SECRET=your_secure_nextauth_secret_here
```

#### OAuth Providers
```env
# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Apple OAuth (optional)
APPLE_CLIENT_ID=your_apple_client_id
APPLE_CLIENT_SECRET=your_apple_client_secret
```

#### AWS Services
```env
# AWS Credentials (from IAM user created above)
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=us-east-1

# S3 Buckets
S3_BUCKET_GPX=rs-aero-fkt-gpx-prod
S3_BUCKET_PHOTOS=rs-aero-fkt-photos-prod

# SES Email
SES_FROM_EMAIL=noreply@yourdomain.com
ADMIN_EMAIL=admin@yourdomain.com
```

#### Production Settings
```env
NODE_ENV=production
```

### 3. Configure OAuth Providers

Update your OAuth applications with Railway URLs:

#### Google OAuth Console
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to "APIs & Services" → "Credentials"
3. Edit your OAuth 2.0 Client ID
4. Add to "Authorized redirect URIs":
   ```
   https://your-app-name.railway.app/api/auth/callback/google
   ```

#### Apple Developer (if using)
1. Go to [Apple Developer](https://developer.apple.com/account/)
2. Update your Services ID configuration
3. Add Railway domain to allowed domains

### 4. Database Migration

Railway will automatically build and deploy your app. After the first deployment:

1. **Access Railway Console**:
   ```bash
   # Using Railway CLI
   railway shell

   # Or use the web console in Railway dashboard
   ```

2. **Run Database Migrations**:
   ```bash
   # In Railway console
   npx prisma generate
   npx prisma migrate deploy

   # Verify connection
   npx prisma db execute --stdin < /dev/null
   ```

### 5. Deploy Application

Railway automatically deploys when you push to your connected Git branch:

```bash
# Deploy latest changes
git add .
git commit -m "Configure production environment"
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

If using Route 53:
```bash
# Create hosted zone (if not exists)
aws route53 create-hosted-zone --name yourdomain.com --caller-reference $(date +%s)

# Add CNAME record (replace with Railway's instructions)
aws route53 change-resource-record-sets --hosted-zone-id YOUR_ZONE_ID --change-batch '{
  "Changes": [{
    "Action": "CREATE",
    "ResourceRecordSet": {
      "Name": "rsaerofkt.com",
      "Type": "CNAME",
      "TTL": 300,
      "ResourceRecords": [{"Value": "your-app-name.railway.app"}]
    }
  }]
}'
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

Access via Railway dashboard → your service → "Observability"

### 2. Application Logs

View logs in Railway dashboard or via CLI:
```bash
# View recent logs
railway logs

# Follow logs in real-time
railway logs --tail
```

### 3. Database Management

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
# Create manual backup script for additional safety
#!/bin/bash

# Get Railway database URL from environment
DATABASE_URL=$(railway variables get DATABASE_URL)

# Create backup
pg_dump "$DATABASE_URL" | gzip > "backup_$(date +%Y%m%d_%H%M%S).sql.gz"

# Upload to S3 for additional safety
aws s3 cp "backup_$(date +%Y%m%d_%H%M%S).sql.gz" s3://rs-aero-fkt-backups/database/
```

### 4. Environment Management

Railway supports multiple environments:
- **Production**: Connected to `main` branch
- **Staging**: Connected to `staging` branch (optional)
- **Development**: Local development

Create staging environment:
1. Create `staging` branch in Git
2. Create new Railway service connected to `staging` branch
3. Use separate database for staging

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
- **Storage**: Up to 100GB per database

### 3. Performance Optimization

Monitor and optimize:
```bash
# Check app performance
railway logs | grep "slow query"

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
- Small app: $20-30/month
- Medium traffic: $40-60/month
- High traffic: $80+ /month

### 2. AWS Services Cost

Additional AWS services:
- **S3 Storage**: ~$1-5/month (depends on usage)
- **SES Email**: ~$1-10/month (depends on volume)
- **Route 53**: $0.50/month per hosted zone

### 3. Cost Optimization Tips

- **Use Railway's free tier** for development
- **Monitor usage** in Railway dashboard
- **Optimize database queries** to reduce CPU usage
- **Use S3 lifecycle policies** for old files
- **Monitor S3 usage** to avoid unexpected charges

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

```javascript
// pages/api/health.js
export default function handler(req, res) {
  // Check database connection
  // Check external services

  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString()
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

### 3. Application Security

Implement standard security practices:
```javascript
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

### 3. File Upload Issues

```bash
# Check AWS credentials
railway shell
aws sts get-caller-identity

# Test S3 access
aws s3 ls s3://rs-aero-fkt-photos-prod
```

### 4. OAuth Issues

Common fixes:
- Verify redirect URIs match exactly (including https://)
- Check environment variables are set correctly
- Ensure OAuth apps are in production mode

### 5. Performance Issues

```bash
# Check resource usage
railway status

# Monitor in Railway dashboard
# Consider upgrading plan if consistently hitting limits
```

## Migration from Other Platforms

### From Vercel/Netlify
- Export environment variables
- Update OAuth redirect URIs
- Point domain DNS to Railway

### From Heroku
- Export Heroku config vars: `heroku config -a your-app`
- Import to Railway environment variables
- Update any Heroku-specific configurations

### From EC2/VPS
- Ensure all environment variables are configured
- Migrate database data if needed:
  ```bash
  # Export from old database
  pg_dump old_database_url > backup.sql

  # Import to Railway
  railway connect postgres < backup.sql
  ```

This completes the Railway deployment guide for RS Aero FKT. Railway significantly simplifies deployment while maintaining production-grade capabilities for security, scaling, and monitoring.