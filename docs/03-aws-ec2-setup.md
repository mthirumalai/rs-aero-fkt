# AWS EC2 Deployment Setup

This guide covers setting up a secure EC2 instance for hosting the RS Aero FKT application.

## EC2 Instance Setup

### 1. Launch EC2 Instance

#### Choose AMI
- **Recommended**: Ubuntu 22.04 LTS (ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64)
- Architecture: x86_64
- Free tier eligible: t3.micro or t2.micro

#### Instance Configuration
- **Instance Type**: t3.medium (minimum recommended for Node.js + PostgreSQL)
- **Storage**: 20-30 GB gp3 SSD (adjust based on expected data)
- **VPC**: Default VPC is fine for basic setup

#### Security Group Configuration
Create a new security group with these rules:

| Type | Protocol | Port Range | Source | Description |
|------|----------|------------|--------|-------------|
| SSH | TCP | 22 | Your IP/32 | SSH access |
| HTTP | TCP | 80 | 0.0.0.0/0 | HTTP traffic |
| HTTPS | TCP | 443 | 0.0.0.0/0 | HTTPS traffic |
| Custom TCP | TCP | 3000 | 0.0.0.0/0 | Next.js dev (temporary) |

**Security Notes**:
- Restrict SSH to your IP only
- Remove port 3000 rule after setting up reverse proxy
- Consider using AWS Session Manager instead of SSH

#### Key Pair
- Create new key pair or use existing
- Download `.pem` file and secure it: `chmod 400 your-key.pem`

### 2. Elastic IP (Recommended)
1. Allocate an Elastic IP address
2. Associate it with your EC2 instance
3. Update DNS records to point to this IP

### 3. Connect to Instance
```bash
ssh -i your-key.pem ubuntu@your-elastic-ip
```

## Server Configuration

### 1. System Updates
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl wget unzip htop
```

### 2. Install Node.js
```bash
# Install nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc

# Install Node 20
nvm install 20
nvm use 20
nvm alias default 20

# Verify installation
node --version
npm --version
```

### 3. Install PostgreSQL
```bash
# Install PostgreSQL 15
sudo apt install -y postgresql-15 postgresql-contrib-15

# Start and enable service
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Configure PostgreSQL
sudo -u postgres psql
```

In PostgreSQL shell:
```sql
-- Create database user
CREATE USER rsaero WITH PASSWORD 'your_secure_password_here';

-- Create database
CREATE DATABASE rsaerofkt OWNER rsaero;

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE rsaerofkt TO rsaero;

-- Exit
\q
```

### 4. Configure PostgreSQL Security
```bash
# Edit PostgreSQL config
sudo nano /etc/postgresql/15/main/postgresql.conf

# Set listen_addresses (uncomment and modify):
listen_addresses = 'localhost'

# Edit authentication config
sudo nano /etc/postgresql/15/main/pg_hba.conf

# Ensure these lines exist:
local   all             rsaero                                  md5
local   all             postgres                                peer
```

Restart PostgreSQL:
```bash
sudo systemctl restart postgresql
```

### 5. Install PM2 (Process Manager)
```bash
npm install -g pm2

# Configure PM2 to start on boot
pm2 startup
sudo env PATH=$PATH:/home/ubuntu/.nvm/versions/node/v20.*/bin /home/ubuntu/.nvm/versions/node/v20.*/lib/node_modules/pm2/bin/pm2 startup systemd -u ubuntu --hp /home/ubuntu
```

### 6. Install Nginx (Reverse Proxy)
```bash
sudo apt install -y nginx

# Start and enable Nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

## Security Hardening

### 1. Firewall Configuration
```bash
# Install and configure UFW
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Allow necessary ports
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS

# Enable firewall
sudo ufw enable

# Check status
sudo ufw status
```

### 2. SSH Hardening
```bash
sudo nano /etc/ssh/sshd_config
```

Modify these settings:
```
PermitRootLogin no
PasswordAuthentication no
PubkeyAuthentication yes
Port 22
MaxAuthTries 3
ClientAliveInterval 300
ClientAliveCountMax 2
```

Restart SSH:
```bash
sudo systemctl restart sshd
```

### 3. Automatic Security Updates
```bash
sudo apt install -y unattended-upgrades

# Configure automatic updates
sudo dpkg-reconfigure -plow unattended-upgrades
```

### 4. Fail2Ban (Intrusion Prevention)
```bash
sudo apt install -y fail2ban

# Configure Fail2Ban
sudo cp /etc/fail2ban/jail.conf /etc/fail2ban/jail.local
sudo nano /etc/fail2ban/jail.local
```

Add/modify in `jail.local`:
```ini
[sshd]
enabled = true
port = ssh
filter = sshd
logpath = /var/log/auth.log
maxretry = 3
bantime = 3600
```

Start Fail2Ban:
```bash
sudo systemctl start fail2ban
sudo systemctl enable fail2ban
```

### 5. SSL Certificate Setup
```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Obtain SSL certificate (after DNS is configured)
sudo certbot --nginx -d yourdomain.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

## Domain and DNS

### 1. Domain Setup
- Purchase domain from registrar (Namecheap, GoDaddy, etc.)
- Create A record pointing to your Elastic IP
- Create CNAME for www pointing to your domain

Example DNS records:
```
A     @     your-elastic-ip
CNAME www   yourdomain.com
```

### 2. Nginx Configuration
```bash
sudo nano /etc/nginx/sites-available/rsaerofkt
```

Basic configuration:
```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

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
    }
}
```

Enable site:
```bash
sudo ln -s /etc/nginx/sites-available/rsaerofkt /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## Monitoring and Logging

### 1. CloudWatch Agent (Optional)
```bash
# Install CloudWatch agent
wget https://s3.amazonaws.com/amazoncloudwatch-agent/ubuntu/amd64/latest/amazon-cloudwatch-agent.deb
sudo dpkg -i amazon-cloudwatch-agent.deb
```

### 2. System Monitoring
```bash
# Install monitoring tools
sudo apt install -y htop iotop nethogs

# Check system resources
htop              # CPU/Memory usage
df -h            # Disk usage
free -h          # Memory usage
sudo ss -tulpn   # Active connections
```

### 3. Application Logs
```bash
# PM2 logs
pm2 logs

# Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# System logs
sudo journalctl -u nginx
sudo journalctl -u postgresql
```

## Backup Strategy

### 1. Database Backups
```bash
# Create backup script
nano ~/backup-db.sh
```

Script content:
```bash
#!/bin/bash
BACKUP_DIR="/home/ubuntu/backups"
mkdir -p $BACKUP_DIR

# Backup database
pg_dump -U rsaero rsaerofkt > $BACKUP_DIR/rsaerofkt_$(date +%Y%m%d_%H%M%S).sql

# Keep only last 7 days
find $BACKUP_DIR -name "rsaerofkt_*.sql" -mtime +7 -delete
```

Make executable and schedule:
```bash
chmod +x ~/backup-db.sh
crontab -e
# Add: 0 2 * * * /home/ubuntu/backup-db.sh
```

### 2. File Backups
Set up S3 sync for uploaded files:
```bash
# Install AWS CLI
sudo apt install -y awscli

# Configure AWS credentials
aws configure

# Sync uploads to S3
aws s3 sync /path/to/uploads s3://your-backup-bucket/uploads/
```

## Cost Optimization

### Instance Sizing
- Start with t3.medium
- Monitor CPU/memory usage
- Scale down to t3.small if under-utilized
- Scale up to t3.large if needed

### Storage
- Use gp3 instead of gp2 for better price/performance
- Enable EBS optimization
- Monitor disk usage and expand as needed

### Monitoring Costs
- Set up AWS budgets and alerts
- Use AWS Cost Explorer
- Consider Reserved Instances for stable workloads

## Troubleshooting

### Instance Access Issues
```bash
# Check security groups
# Verify key pair permissions: chmod 400 key.pem
# Use EC2 Instance Connect or Session Manager as backup
```

### Service Issues
```bash
# Check service status
sudo systemctl status nginx
sudo systemctl status postgresql
pm2 status

# Check logs
sudo journalctl -f -u nginx
sudo tail -f /var/log/postgresql/postgresql-15-main.log
pm2 logs
```

### Performance Issues
```bash
# Monitor resources
htop
iostat -x 1
free -m

# Check disk space
df -h
du -sh /var/log/*

# Network connectivity
ping google.com
curl -I yourdomain.com
```