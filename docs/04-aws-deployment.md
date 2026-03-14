# AWS Production Deployment Guide

> **⚠️ DEPRECATED - NOT CURRENTLY USED**
>
> This guide was created when the hypothesis was to deploy using AWS EC2 with self-hosted PostgreSQL.
> The project has since moved to Railway for deployment (see `05-railway-deployment.md`).
> This documentation is preserved for reference but has not been tested in production.

This guide covers deploying and running the RS Aero FKT application on AWS EC2 with supporting services.

## Pre-Deployment Checklist

### 1. AWS Services Setup

#### S3 Buckets
Create two S3 buckets:
```bash
# Replace 'yourapp' with your actual app name
aws s3 mb s3://rs-aero-fkt-gpx-prod
aws s3 mb s3://rs-aero-fkt-photos-prod
```

Configure bucket policies:

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

#### SES (Email Service)
```bash
# Verify sender email domain
aws ses verify-domain-identity --domain yourdomain.com

# Move out of sandbox (production email sending)
# Submit request in SES console to increase sending limits
```

#### IAM Role for EC2
Create IAM role with these policies:
- `AmazonS3FullAccess` (or custom policy for your buckets only)
- `AmazonSESFullAccess` (or custom policy for sending only)

Attach role to your EC2 instance.

### 2. Environment Variables
Create production `.env` file on server:

```bash
sudo nano /home/ubuntu/rs-aero-fkt/.env
```

Production environment:
```env
# Database
DATABASE_URL="postgresql://rsaero:your_secure_password@localhost:5432/rsaerofkt"

# NextAuth
NEXTAUTH_URL="https://yourdomain.com"
NEXTAUTH_SECRET="your_production_secret_here"

# OAuth
GOOGLE_CLIENT_ID="your_prod_google_client_id"
GOOGLE_CLIENT_SECRET="your_prod_google_client_secret"
APPLE_CLIENT_ID="your_apple_client_id"
APPLE_CLIENT_SECRET="your_apple_client_secret"

# AWS
AWS_REGION="us-east-1"
S3_BUCKET_GPX="rs-aero-fkt-gpx-prod"
S3_BUCKET_PHOTOS="rs-aero-fkt-photos-prod"

# SES
SES_FROM_EMAIL="noreply@yourdomain.com"
ADMIN_EMAIL="admin@yourdomain.com"

# Production mode
NODE_ENV="production"
```

## Application Deployment

### 1. Deploy Code to Server
```bash
# On your local machine, push latest code
git push origin main

# On server, clone/update repository
cd /home/ubuntu
git clone https://github.com/mthirumalai/rs-aero-fkt.git
cd rs-aero-fkt

# Or update existing:
git pull origin main
```

### 2. Install Dependencies
```bash
# Ensure Node 20 is active
nvm use 20

# Install production dependencies
npm ci --production --legacy-peer-deps

# Install PM2 globally if not already installed
npm install -g pm2
```

### 3. Build Application
```bash
# Build for production
npm run build

# Verify build succeeded
ls .next/
```

### 4. Database Migration
```bash
# Generate Prisma client
npx prisma generate

# Apply migrations to production database
npx prisma migrate deploy

# Verify database connection
npx prisma db execute --stdin < /dev/null
```

### 5. Configure PM2
Create PM2 ecosystem file:
```bash
nano ecosystem.config.js
```

Configuration:
```javascript
module.exports = {
  apps: [{
    name: 'rs-aero-fkt',
    script: 'npm',
    args: 'start',
    cwd: '/home/ubuntu/rs-aero-fkt',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: '/home/ubuntu/logs/rs-aero-fkt-error.log',
    out_file: '/home/ubuntu/logs/rs-aero-fkt-out.log',
    log_file: '/home/ubuntu/logs/rs-aero-fkt-combined.log',
    time: true
  }]
};
```

### 6. Start Application
```bash
# Create log directory
mkdir -p /home/ubuntu/logs

# Start application with PM2
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Check status
pm2 status
pm2 logs
```

## Database Management

### 1. Production Database Setup
```bash
# Connect to PostgreSQL as postgres user
sudo -u postgres psql

# Create production user with limited privileges
CREATE USER rsaero WITH PASSWORD 'your_secure_password_here';

# Create database
CREATE DATABASE rsaerofkt OWNER rsaero;

# Grant only necessary privileges
GRANT CONNECT ON DATABASE rsaerofkt TO rsaero;
GRANT USAGE ON SCHEMA public TO rsaero;
GRANT CREATE ON SCHEMA public TO rsaero;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO rsaero;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO rsaero;

# Exit
\q
```

### 2. Database Backups
Create automated backup script:
```bash
nano /home/ubuntu/scripts/backup-database.sh
```

Script content:
```bash
#!/bin/bash

# Configuration
DB_NAME="rsaerofkt"
DB_USER="rsaero"
BACKUP_DIR="/home/ubuntu/backups/database"
S3_BUCKET="rs-aero-fkt-backups"
RETENTION_DAYS=30

# Create backup directory
mkdir -p $BACKUP_DIR

# Create backup filename with timestamp
BACKUP_FILE="rsaerofkt_$(date +%Y%m%d_%H%M%S).sql"
BACKUP_PATH="$BACKUP_DIR/$BACKUP_FILE"

# Create database backup
pg_dump -U $DB_USER -h localhost $DB_NAME > $BACKUP_PATH

# Compress backup
gzip $BACKUP_PATH

# Upload to S3
aws s3 cp "$BACKUP_PATH.gz" "s3://$S3_BUCKET/database/" --storage-class STANDARD_IA

# Clean up local files older than retention period
find $BACKUP_DIR -name "rsaerofkt_*.sql.gz" -mtime +$RETENTION_DAYS -delete

# Log backup completion
echo "$(date): Database backup completed: $BACKUP_FILE.gz" >> /var/log/backup.log
```

Make executable and schedule:
```bash
chmod +x /home/ubuntu/scripts/backup-database.sh

# Schedule daily backups at 2 AM
crontab -e
# Add: 0 2 * * * /home/ubuntu/scripts/backup-database.sh
```

### 3. Database Monitoring
Create monitoring script:
```bash
nano /home/ubuntu/scripts/monitor-database.sh
```

Script content:
```bash
#!/bin/bash

# Check database connectivity
DB_STATUS=$(pg_isready -h localhost -U rsaero -d rsaerofkt)

if [ $? -eq 0 ]; then
    echo "$(date): Database is healthy" >> /var/log/db-monitor.log
else
    echo "$(date): Database connection failed: $DB_STATUS" >> /var/log/db-monitor.log
    # Send alert email (configure SES)
    aws ses send-email \
        --from "alerts@yourdomain.com" \
        --to "admin@yourdomain.com" \
        --message "Subject={Data=Database Alert},Body={Text={Data=Database connection failed on $(hostname)}}"
fi

# Check disk space
DISK_USAGE=$(df /var/lib/postgresql | tail -1 | awk '{print $5}' | sed 's/%//')
if [ $DISK_USAGE -gt 85 ]; then
    echo "$(date): High disk usage: $DISK_USAGE%" >> /var/log/db-monitor.log
fi
```

Schedule monitoring:
```bash
chmod +x /home/ubuntu/scripts/monitor-database.sh
crontab -e
# Add: */5 * * * * /home/ubuntu/scripts/monitor-database.sh
```

## File Upload Management

### 1. S3 Configuration
The application automatically uses S3 when AWS credentials are available. Ensure:

- EC2 instance has IAM role with S3 permissions
- Bucket names match environment variables
- Buckets are in same region as EC2 for lower latency

### 2. CDN Setup (Optional)
Configure CloudFront for photo delivery:

1. Create CloudFront distribution
2. Set origin to your photos S3 bucket
3. Update application to use CloudFront URLs for photos
4. Configure caching headers

## SSL and Security

### 1. SSL Certificate Renewal
Certbot auto-renewal should be configured, but verify:
```bash
# Test renewal
sudo certbot renew --dry-run

# Check certificate expiry
sudo certbot certificates

# Manual renewal if needed
sudo certbot renew
```

### 2. Security Headers
Update Nginx configuration for security headers:
```bash
sudo nano /etc/nginx/sites-available/rsaerofkt
```

Add security headers:
```nginx
server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    # SSL configuration
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 10240;
    gzip_proxied expired no-cache no-store private must-revalidate auth;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/javascript;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400;
    }
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    return 301 https://$host$request_uri;
}
```

Reload Nginx:
```bash
sudo nginx -t
sudo systemctl reload nginx
```

## Monitoring and Alerts

### 1. Application Monitoring
Create monitoring dashboard:
```bash
nano /home/ubuntu/scripts/app-monitor.sh
```

Script content:
```bash
#!/bin/bash

# Check if application is running
if ! pm2 list | grep -q "rs-aero-fkt.*online"; then
    echo "$(date): Application is down, attempting restart" >> /var/log/app-monitor.log
    pm2 restart rs-aero-fkt

    # Send alert
    aws ses send-email \
        --from "alerts@yourdomain.com" \
        --to "admin@yourdomain.com" \
        --message "Subject={Data=Application Alert},Body={Text={Data=RS Aero FKT application was restarted on $(hostname)}}"
fi

# Check memory usage
MEMORY_USAGE=$(pm2 jlist | jq '.[0].monit.memory // 0')
MEMORY_MB=$((MEMORY_USAGE / 1024 / 1024))

if [ $MEMORY_MB -gt 800 ]; then
    echo "$(date): High memory usage: ${MEMORY_MB}MB" >> /var/log/app-monitor.log
fi

# Check response time
RESPONSE_TIME=$(curl -o /dev/null -s -w '%{time_total}' https://yourdomain.com)
RESPONSE_MS=$(echo "$RESPONSE_TIME * 1000" | bc -l | cut -d'.' -f1)

if [ $RESPONSE_MS -gt 5000 ]; then
    echo "$(date): Slow response time: ${RESPONSE_MS}ms" >> /var/log/app-monitor.log
fi
```

Schedule monitoring:
```bash
chmod +x /home/ubuntu/scripts/app-monitor.sh
crontab -e
# Add: */2 * * * * /home/ubuntu/scripts/app-monitor.sh
```

### 2. Log Management
Configure log rotation:
```bash
sudo nano /etc/logrotate.d/rs-aero-fkt
```

Configuration:
```
/home/ubuntu/logs/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 644 ubuntu ubuntu
    postrotate
        pm2 reloadLogs
    endscript
}
```

## Deployment Automation

### 1. Deployment Script
Create deployment script:
```bash
nano /home/ubuntu/scripts/deploy.sh
```

Script content:
```bash
#!/bin/bash

set -e

# Configuration
APP_DIR="/home/ubuntu/rs-aero-fkt"
BACKUP_DIR="/home/ubuntu/backups/deployments"

echo "Starting deployment at $(date)"

# Create backup of current deployment
mkdir -p $BACKUP_DIR
tar -czf "$BACKUP_DIR/backup_$(date +%Y%m%d_%H%M%S).tar.gz" -C $APP_DIR .

# Pull latest code
cd $APP_DIR
git pull origin main

# Install dependencies
npm ci --production --legacy-peer-deps

# Build application
npm run build

# Run database migrations
npx prisma generate
npx prisma migrate deploy

# Restart application
pm2 restart rs-aero-fkt

# Wait for application to start
sleep 10

# Health check
if curl -f -s https://yourdomain.com > /dev/null; then
    echo "Deployment successful at $(date)"
    # Clean up old backups (keep last 5)
    ls -t $BACKUP_DIR/backup_*.tar.gz | tail -n +6 | xargs -r rm
else
    echo "Health check failed, rolling back"
    # Rollback logic here
    exit 1
fi
```

Make executable:
```bash
chmod +x /home/ubuntu/scripts/deploy.sh
```

### 2. Zero-Downtime Deployment (Advanced)
For zero-downtime deployments, use PM2 cluster mode:

Update `ecosystem.config.js`:
```javascript
module.exports = {
  apps: [{
    name: 'rs-aero-fkt',
    script: 'npm',
    args: 'start',
    instances: 'max', // Use all CPU cores
    exec_mode: 'cluster',
    // ... rest of configuration
  }]
};
```

Deploy with reload:
```bash
pm2 reload rs-aero-fkt
```

## Performance Optimization

### 1. Database Performance
```sql
-- Create indexes for common queries
CREATE INDEX CONCURRENTLY idx_route_status ON "Route" (status);
CREATE INDEX CONCURRENTLY idx_route_country ON "Route" (country);
CREATE INDEX CONCURRENTLY idx_fkt_route_rig ON "FktAttempt" ("routeId", "rigSize");

-- Analyze query performance
EXPLAIN ANALYZE SELECT * FROM "Route" WHERE status = 'APPROVED';
```

### 2. Application Performance
Monitor and optimize:
```bash
# Monitor Node.js performance
pm2 monit

# Check memory leaks
pm2 logs --lines 100

# Profile application (development)
npm run build
npm run start -- --inspect
```

### 3. CDN and Caching
- Use CloudFront for static assets
- Implement Redis for session storage (optional)
- Configure Nginx caching for API responses

## Backup and Disaster Recovery

### 1. Complete Backup Strategy
- **Database**: Daily automated backups to S3
- **Application**: Code in Git repository
- **Files**: S3 with versioning enabled
- **Configuration**: Store in private Git repository

### 2. Disaster Recovery Plan
1. **Recovery Time Objective (RTO)**: 4 hours
2. **Recovery Point Objective (RPO)**: 24 hours

Recovery steps:
```bash
# Launch new EC2 instance
# Install all dependencies (use automated script)
# Restore database from latest S3 backup
# Deploy latest application code
# Update DNS to point to new instance
```

## Troubleshooting Production Issues

### 1. Application Not Starting
```bash
# Check PM2 status
pm2 status
pm2 logs rs-aero-fkt --lines 50

# Check environment variables
pm2 env 0

# Test manual start
cd /home/ubuntu/rs-aero-fkt
npm start
```

### 2. Database Connection Issues
```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Test connection
pg_isready -h localhost -U rsaero -d rsaerofkt

# Check logs
sudo tail -f /var/log/postgresql/postgresql-15-main.log
```

### 3. High Memory/CPU Usage
```bash
# Monitor resources
htop
iotop

# Check specific processes
ps aux --sort=-%cpu
ps aux --sort=-%mem

# PM2 monitoring
pm2 monit
```

### 4. SSL Certificate Issues
```bash
# Check certificate status
sudo certbot certificates

# Test SSL
openssl s_client -connect yourdomain.com:443

# Renew certificate
sudo certbot renew --force-renewal
```

### 5. File Upload Issues
```bash
# Check AWS credentials
aws sts get-caller-identity

# Test S3 access
aws s3 ls s3://rs-aero-fkt-photos-prod

# Check application logs for S3 errors
pm2 logs | grep -i s3
```

This completes the comprehensive deployment and operations guide for running RS Aero FKT on AWS EC2.