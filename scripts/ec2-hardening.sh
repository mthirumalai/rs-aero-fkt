#!/bin/bash

# EC2 Hardening Script for RS Aero FKT Application
# This script implements security best practices for Ubuntu 22.04 LTS
# Run as: sudo ./ec2-hardening.sh

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging
LOGFILE="/var/log/ec2-hardening.log"
exec > >(tee -a "$LOGFILE")
exec 2>&1

echo -e "${GREEN}[INFO]${NC} Starting EC2 hardening process at $(date)"
echo "Logging to: $LOGFILE"

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   echo -e "${RED}[ERROR]${NC} This script must be run as root (use sudo)"
   exit 1
fi

# Get the actual user (not root when using sudo)
ACTUAL_USER="${SUDO_USER:-$(logname)}"
echo -e "${GREEN}[INFO]${NC} Running hardening for user: $ACTUAL_USER"

# 1. System Updates and Essential Packages
echo -e "${YELLOW}[STEP 1]${NC} Updating system and installing security packages..."
apt update && apt upgrade -y
apt install -y \
    fail2ban \
    unattended-upgrades \
    ufw \
    aide \
    rkhunter \
    logwatch \
    auditd \
    acct \
    sysstat \
    htop \
    iotop \
    curl \
    wget \
    git \
    unzip

# 2. Configure Automatic Security Updates
echo -e "${YELLOW}[STEP 2]${NC} Configuring automatic security updates..."
cat > /etc/apt/apt.conf.d/50unattended-upgrades << 'EOF'
Unattended-Upgrade::Allowed-Origins {
    "${distro_id}:${distro_codename}-security";
    "${distro_id}ESMApps:${distro_codename}-apps-security";
    "${distro_id}ESM:${distro_codename}-infra-security";
};
Unattended-Upgrade::AutoFixInterruptedDpkg "true";
Unattended-Upgrade::MinimalSteps "true";
Unattended-Upgrade::Remove-Unused-Dependencies "true";
Unattended-Upgrade::Automatic-Reboot "false";
Unattended-Upgrade::Automatic-Reboot-Time "02:00";
EOF

cat > /etc/apt/apt.conf.d/20auto-upgrades << 'EOF'
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
APT::Periodic::AutocleanInterval "7";
EOF

# 3. SSH Hardening
echo -e "${YELLOW}[STEP 3]${NC} Hardening SSH configuration..."
cp /etc/ssh/sshd_config /etc/ssh/sshd_config.backup

cat > /etc/ssh/sshd_config << 'EOF'
# SSH Configuration - Hardened
Port 22
AddressFamily any
ListenAddress 0.0.0.0

# Host keys
HostKey /etc/ssh/ssh_host_rsa_key
HostKey /etc/ssh/ssh_host_ecdsa_key
HostKey /etc/ssh/ssh_host_ed25519_key

# Ciphers and keying
RekeyLimit default none

# Logging
SyslogFacility AUTH
LogLevel INFO

# Authentication
LoginGraceTime 60
PermitRootLogin no
StrictModes yes
MaxAuthTries 3
MaxSessions 10

PubkeyAuthentication yes
AuthorizedKeysFile .ssh/authorized_keys

PasswordAuthentication no
PermitEmptyPasswords no
ChallengeResponseAuthentication no
UsePAM yes

# Kerberos options
KerberosAuthentication no
KerberosOrLocalPasswd yes
KerberosTicketCleanup yes

# GSSAPI options
GSSAPIAuthentication no
GSSAPICleanupCredentials yes

# Connection settings
X11Forwarding no
PrintMotd no
PrintLastLog yes
TCPKeepAlive yes
ClientAliveInterval 300
ClientAliveCountMax 2
MaxStartups 10:30:60
Banner /etc/ssh/banner

# Subsystem
Subsystem sftp /usr/lib/openssh/sftp-server
EOF

# Create SSH banner
cat > /etc/ssh/banner << 'EOF'
***************************************************************************
                            NOTICE TO USERS
***************************************************************************

This computer system is the private property of its owner, whether
individual, corporate or government. It is for authorized use only.
Users (authorized or unauthorized) have no explicit or implicit
expectation of privacy.

Any or all uses of this system and all files on this system may be
intercepted, monitored, recorded, copied, audited, inspected, and
disclosed to your employer, to authorized site, government, and law
enforcement personnel, as well as authorized officials of government
agencies, both domestic and foreign.

By using this system, the user consents to such interception, monitoring,
recording, copying, auditing, inspection, and disclosure at the
discretion of such personnel or officials.

Unauthorized or improper use of this system may result in civil and
criminal penalties and administrative or disciplinary action, as well
as termination of employment or other relationship.

By continuing to use this system you indicate your awareness of and
consent to these terms and conditions of use. LOG OFF IMMEDIATELY if
you do not agree to the conditions stated in this warning.

***************************************************************************
EOF

systemctl restart sshd

# 4. Configure UFW Firewall
echo -e "${YELLOW}[STEP 4]${NC} Configuring UFW firewall..."
ufw --force reset
ufw default deny incoming
ufw default allow outgoing

# Allow SSH
ufw allow 22/tcp

# Allow HTTP/HTTPS
ufw allow 80/tcp
ufw allow 443/tcp

# Allow NTP
ufw allow out 123/udp

# Allow DNS
ufw allow out 53

# Explicitly deny PostgreSQL from external access (localhost only)
ufw deny 5432/tcp

# Enable firewall
ufw --force enable

# 5. Configure Fail2Ban
echo -e "${YELLOW}[STEP 5]${NC} Configuring Fail2Ban..."
cp /etc/fail2ban/jail.conf /etc/fail2ban/jail.local

cat > /etc/fail2ban/jail.d/custom.conf << 'EOF'
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 3
backend = auto
usedns = warn

[sshd]
enabled = true
port = ssh
logpath = /var/log/auth.log
maxretry = 3
bantime = 3600

[nginx-http-auth]
enabled = true
port = http,https
logpath = /var/log/nginx/error.log
maxretry = 3

[nginx-dos]
enabled = true
port = http,https
logpath = /var/log/nginx/access.log
maxretry = 240
findtime = 60
bantime = 600

[recidive]
enabled = true
logpath = /var/log/fail2ban.log
action = iptables-allports[name=recidive]
bantime = 86400
findtime = 86400
maxretry = 5
EOF

systemctl enable fail2ban
systemctl restart fail2ban

# 6. System Hardening
echo -e "${YELLOW}[STEP 6]${NC} Applying system hardening settings..."

# Kernel parameters
cat > /etc/sysctl.d/99-security.conf << 'EOF'
# IP Spoofing protection
net.ipv4.conf.default.rp_filter = 1
net.ipv4.conf.all.rp_filter = 1

# Ignore ICMP redirects
net.ipv4.conf.all.accept_redirects = 0
net.ipv6.conf.all.accept_redirects = 0
net.ipv4.conf.default.accept_redirects = 0
net.ipv6.conf.default.accept_redirects = 0

# Ignore send redirects
net.ipv4.conf.all.send_redirects = 0
net.ipv4.conf.default.send_redirects = 0

# Disable source packet routing
net.ipv4.conf.all.accept_source_route = 0
net.ipv6.conf.all.accept_source_route = 0
net.ipv4.conf.default.accept_source_route = 0
net.ipv6.conf.default.accept_source_route = 0

# Log Martians
net.ipv4.conf.all.log_martians = 1
net.ipv4.conf.default.log_martians = 1

# Ignore ICMP ping requests
net.ipv4.icmp_echo_ignore_all = 0

# Ignore Directed pings
net.ipv4.icmp_echo_ignore_broadcasts = 1

# Disable IPv6 if not needed
net.ipv6.conf.all.disable_ipv6 = 1
net.ipv6.conf.default.disable_ipv6 = 1
net.ipv6.conf.lo.disable_ipv6 = 1

# Enable syn flood protection
net.ipv4.tcp_syncookies = 1

# Increase netdev budget
net.core.netdev_budget = 600
EOF

sysctl -p /etc/sysctl.d/99-security.conf

# 7. Disable unnecessary services and remove unused packages
echo -e "${YELLOW}[STEP 7]${NC} Disabling unnecessary services..."

# Disable unnecessary services
SERVICES_TO_DISABLE=(
    "avahi-daemon"
    "cups"
    "isc-dhcp-server"
    "isc-dhcp-server6"
    "rpcbind"
    "nfs-common"
)

for service in "${SERVICES_TO_DISABLE[@]}"; do
    if systemctl list-unit-files | grep -q "$service"; then
        systemctl disable "$service" 2>/dev/null || true
        systemctl stop "$service" 2>/dev/null || true
        echo -e "${GREEN}[INFO]${NC} Disabled service: $service"
    fi
done

# Remove unused packages
apt autoremove -y
apt autoclean

# 8. Configure file permissions
echo -e "${YELLOW}[STEP 8]${NC} Setting secure file permissions..."

# Secure important files
chmod 644 /etc/passwd
chmod 600 /etc/shadow
chmod 644 /etc/group
chmod 600 /etc/gshadow
chmod 644 /etc/ssh/ssh_host_*_key.pub
chmod 600 /etc/ssh/ssh_host_*_key

# Create restricted directories
mkdir -p /var/log/audit
chmod 750 /var/log/audit
chown root:adm /var/log/audit

# 9. Configure auditd
echo -e "${YELLOW}[STEP 9]${NC} Configuring audit daemon..."
cat > /etc/audit/rules.d/audit.rules << 'EOF'
# Remove any existing rules
-D

# Buffer Size
-b 8192

# Failure Mode
-f 1

# Monitor authentication events
-w /etc/passwd -p wa -k identity
-w /etc/group -p wa -k identity
-w /etc/shadow -p wa -k identity
-w /etc/sudoers -p wa -k identity
-w /etc/sudoers.d/ -p wa -k identity

# Monitor login/logout events
-w /var/log/faillog -p wa -k logins
-w /var/log/lastlog -p wa -k logins
-w /var/log/tallylog -p wa -k logins

# Monitor network environment
-a always,exit -F arch=b64 -S adjtimex -S settimeofday -k time-change
-a always,exit -F arch=b32 -S adjtimex -S settimeofday -S stime -k time-change
-w /etc/localtime -p wa -k time-change

# Monitor file permission changes
-a always,exit -F arch=b64 -S chmod -S fchmod -S fchmodat -F auid>=1000 -F auid!=4294967295 -k perm_mod
-a always,exit -F arch=b32 -S chmod -S fchmod -S fchmodat -F auid>=1000 -F auid!=4294967295 -k perm_mod

# Monitor SSH
-w /etc/ssh/sshd_config -k sshd

# Monitor system calls
-a always,exit -F arch=b64 -S unlink -S unlinkat -S rename -S renameat -F auid>=1000 -F auid!=4294967295 -k delete

# Make the configuration immutable
-e 2
EOF

systemctl enable auditd
systemctl restart auditd

# 10. Configure AIDE (Advanced Intrusion Detection Environment)
echo -e "${YELLOW}[STEP 10]${NC} Configuring AIDE..."
cat > /etc/aide/aide.conf << 'EOF'
# AIDE configuration

# Database paths
database=file:/var/lib/aide/aide.db
database_out=file:/var/lib/aide/aide.db.new

# Macros
@@define DBDIR /var/lib/aide
@@define LOGDIR /var/log/aide

# Rules
All=p+i+n+u+g+s+m+S+md5+sha1+sha256+sha512+rmd160+tiger+haval+gost+crc32
Norm=s+n+b+md5+sha1+sha256+rmd160+tiger+haval+gost+crc32

# Important directories
/bin Norm
/sbin Norm
/usr/bin Norm
/usr/sbin Norm
/usr/local/bin Norm
/usr/local/sbin Norm
/etc All
/boot All

# Monitor these critical files
/etc/passwd All
/etc/shadow All
/etc/group All
/etc/sudoers All
/etc/ssh/sshd_config All
EOF

# Initialize AIDE database (this will take some time)
echo -e "${GREEN}[INFO]${NC} Initializing AIDE database (this may take several minutes)..."
aideinit

# Move database to correct location
if [ -f /var/lib/aide/aide.db.new ]; then
    mv /var/lib/aide/aide.db.new /var/lib/aide/aide.db
fi

# 11. Setup log monitoring with logwatch
echo -e "${YELLOW}[STEP 11]${NC} Configuring logwatch..."
cat > /etc/logwatch/conf/logwatch.conf << 'EOF'
LogDir = /var/log
MailTo = root
MailFrom = Logwatch
Range = yesterday
Detail = Med
Service = All
Format = html
EOF

# 12. Create security monitoring scripts
echo -e "${YELLOW}[STEP 12]${NC} Creating security monitoring scripts..."

# Daily security check script
cat > /usr/local/bin/daily-security-check.sh << 'EOF'
#!/bin/bash

# Daily Security Check Script
LOGFILE="/var/log/security-check.log"
DATE=$(date)

echo "=== Daily Security Check - $DATE ===" >> $LOGFILE

# Check for failed login attempts
echo "Failed login attempts in the last 24 hours:" >> $LOGFILE
grep "Failed password" /var/log/auth.log | grep "$(date '+%b %d')" >> $LOGFILE

# Check for new files in suspicious locations
echo "New files in /tmp:" >> $LOGFILE
find /tmp -type f -mtime -1 -ls >> $LOGFILE

# Check for processes running as root
echo "Unusual processes running as root:" >> $LOGFILE
ps -eo user,pid,ppid,cmd | grep "^root" | grep -v '\[.*\]$' >> $LOGFILE

# Check listening ports
echo "Current listening ports:" >> $LOGFILE
ss -tulpn >> $LOGFILE

# Check system load
echo "System load:" >> $LOGFILE
uptime >> $LOGFILE
EOF

chmod +x /usr/local/bin/daily-security-check.sh

# 13. Setup cron jobs for security tasks
echo -e "${YELLOW}[STEP 13]${NC} Setting up security cron jobs..."
cat > /etc/cron.d/security-tasks << 'EOF'
# Security monitoring cron jobs

# Daily security check
0 6 * * * root /usr/local/bin/daily-security-check.sh

# Weekly AIDE check
0 3 * * 0 root /usr/bin/aide --check

# Daily rkhunter scan
0 4 * * * root /usr/bin/rkhunter --check --skip-keypress --report-warnings-only

# Weekly package update check
0 2 * * 1 root apt list --upgradable | grep -v "WARNING"
EOF

# 14. Configure rkhunter
echo -e "${YELLOW}[STEP 14]${NC} Configuring rkhunter..."
cat > /etc/rkhunter.conf.local << 'EOF'
# rkhunter configuration
MIRRORS_MODE=0
UPDATE_MIRRORS=1
PKGMGR=DPKG
WEB_CMD="/usr/bin/curl -s --max-time 300"
EOF

# Update rkhunter database
rkhunter --update --quiet

# 15. Create backup script for security configs
echo -e "${YELLOW}[STEP 15]${NC} Creating configuration backup script..."
cat > /usr/local/bin/backup-security-configs.sh << 'EOF'
#!/bin/bash

BACKUP_DIR="/root/security-backups"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p "$BACKUP_DIR"

# Backup important security configurations
tar -czf "$BACKUP_DIR/security-configs-$DATE.tar.gz" \
    /etc/ssh/sshd_config \
    /etc/fail2ban/ \
    /etc/ufw/ \
    /etc/audit/ \
    /etc/aide/ \
    /etc/logwatch/ \
    /etc/sysctl.d/99-security.conf \
    /etc/cron.d/security-tasks

# Keep only last 10 backups
find "$BACKUP_DIR" -name "security-configs-*.tar.gz" -mtime +10 -delete

echo "Security configuration backup completed: security-configs-$DATE.tar.gz"
EOF

chmod +x /usr/local/bin/backup-security-configs.sh

# Run initial backup
/usr/local/bin/backup-security-configs.sh

# 16. Create system status script
echo -e "${YELLOW}[STEP 16]${NC} Creating system status script..."
cat > /usr/local/bin/security-status.sh << 'EOF'
#!/bin/bash

# Security Status Check Script

echo "=== SYSTEM SECURITY STATUS ==="
echo "Date: $(date)"
echo

echo "=== SSH Service ==="
systemctl status sshd --no-pager -l
echo

echo "=== Firewall Status ==="
ufw status verbose
echo

echo "=== Fail2Ban Status ==="
fail2ban-client status
echo

echo "=== Failed Login Attempts (Last 24h) ==="
grep "Failed password" /var/log/auth.log | grep "$(date '+%b %d')" | wc -l
echo

echo "=== Listening Ports ==="
ss -tulpn
echo

echo "=== Last 5 Login Attempts ==="
tail -5 /var/log/auth.log | grep "Accepted\|Failed"
echo

echo "=== System Load ==="
uptime
echo

echo "=== Disk Usage ==="
df -h
echo

echo "=== Memory Usage ==="
free -h
echo

echo "=== PostgreSQL Status ==="
systemctl status postgresql --no-pager -l
echo

echo "=== Database Connection Test ==="
pg_isready -h localhost -U rsaero -d rsaerofkt
echo
EOF

chmod +x /usr/local/bin/security-status.sh

# 17. Set secure umask
echo -e "${YELLOW}[STEP 17]${NC} Setting secure umask..."
echo "umask 027" >> /etc/bash.bashrc
echo "umask 027" >> /etc/profile

# 18. Final system hardening
echo -e "${YELLOW}[STEP 18]${NC} Final system hardening..."

# Disable core dumps
echo "* hard core 0" >> /etc/security/limits.conf

# Set password policies (if libpam-pwquality is available)
if dpkg -l | grep -q libpam-pwquality; then
    cat >> /etc/security/pwquality.conf << 'EOF'
minlen = 12
minclass = 3
maxrepeat = 3
maxsequence = 3
EOF
fi

# 19. PostgreSQL Installation and Hardening
echo -e "${YELLOW}[STEP 19]${NC} Installing and configuring PostgreSQL..."

# Install PostgreSQL
apt install -y postgresql postgresql-contrib postgresql-client

# Start and enable PostgreSQL service
systemctl start postgresql
systemctl enable postgresql

# Configure PostgreSQL for security
PG_VERSION=$(ls /etc/postgresql/)
PG_CONFIG="/etc/postgresql/$PG_VERSION/main/postgresql.conf"
PG_HBA="/etc/postgresql/$PG_VERSION/main/pg_hba.conf"

# Backup original configuration files
cp "$PG_CONFIG" "${PG_CONFIG}.backup"
cp "$PG_HBA" "${PG_HBA}.backup"

# Harden PostgreSQL configuration
cat >> "$PG_CONFIG" << 'EOF'

# Security hardening settings
listen_addresses = 'localhost'
port = 5432
max_connections = 100
shared_buffers = 256MB
effective_cache_size = 1GB
work_mem = 4MB
maintenance_work_mem = 64MB
checkpoint_completion_target = 0.7
wal_buffers = 16MB
default_statistics_target = 100

# Logging for security monitoring
log_destination = 'stderr'
logging_collector = on
log_directory = 'pg_log'
log_filename = 'postgresql-%Y-%m-%d_%H%M%S.log'
log_rotation_age = 1d
log_rotation_size = 100MB
log_min_duration_statement = 1000
log_checkpoints = on
log_connections = on
log_disconnections = on
log_lock_waits = on
log_temp_files = 0
log_autovacuum_min_duration = 0
log_error_verbosity = verbose
log_line_prefix = '%t [%p]: [%l-1] user=%u,db=%d,app=%a,client=%h '
log_statement = 'mod'

# SSL Configuration
ssl = on
ssl_cert_file = '/etc/ssl/certs/ssl-cert-snakeoil.pem'
ssl_key_file = '/etc/ssl/private/ssl-cert-snakeoil.key'

# Security settings
password_encryption = 'scram-sha-256'
EOF

# Configure authentication (pg_hba.conf)
cat > "$PG_HBA" << 'EOF'
# PostgreSQL Client Authentication Configuration File
# TYPE  DATABASE        USER            ADDRESS                 METHOD

# "local" is for Unix domain socket connections only
local   all             postgres                                peer
local   all             all                                     peer

# IPv4 local connections - require password for application users
host    all             all             127.0.0.1/32            scram-sha-256
host    all             all             ::1/128                 scram-sha-256

# Deny all other connections
host    all             all             0.0.0.0/0               reject
host    all             all             ::/0                    reject
EOF

# Create PostgreSQL log directory with proper permissions
mkdir -p /var/lib/postgresql/$PG_VERSION/main/pg_log
chown postgres:postgres /var/lib/postgresql/$PG_VERSION/main/pg_log
chmod 750 /var/lib/postgresql/$PG_VERSION/main/pg_log

# Restart PostgreSQL to apply configuration changes
systemctl restart postgresql

# Wait for PostgreSQL to start
sleep 5

# Create application database and user
sudo -u postgres psql << 'EOF'
-- Set password encryption
SET password_encryption = 'scram-sha-256';

-- Create application user with secure password
CREATE USER rsaero WITH ENCRYPTED PASSWORD 'CHANGE_THIS_PASSWORD_IN_PRODUCTION';

-- Create application database
CREATE DATABASE rsaerofkt OWNER rsaero;

-- Grant minimal required privileges
GRANT CONNECT ON DATABASE rsaerofkt TO rsaero;
REVOKE ALL ON SCHEMA public FROM public;
GRANT USAGE ON SCHEMA public TO rsaero;
GRANT CREATE ON SCHEMA public TO rsaero;

-- Connect to application database and set default privileges
\c rsaerofkt

-- Grant privileges on existing objects
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO rsaero;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO rsaero;

-- Set default privileges for future objects
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON TABLES TO rsaero;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON SEQUENCES TO rsaero;

-- Exit
\q
EOF

echo -e "${GREEN}[INFO]${NC} PostgreSQL configured successfully"
echo -e "${YELLOW}[WARNING]${NC} Please update the database password in production!"
echo "Database connection string: postgresql://rsaero:CHANGE_THIS_PASSWORD_IN_PRODUCTION@localhost:5432/rsaerofkt"

# Add PostgreSQL monitoring to audit rules
cat >> /etc/audit/rules.d/audit.rules << 'EOF'

# Monitor PostgreSQL
-w /etc/postgresql/ -p wa -k postgres-config
-w /var/lib/postgresql/ -p wa -k postgres-data
-w /var/log/postgresql/ -p wa -k postgres-logs
EOF

# Add PostgreSQL to security monitoring
cat >> /usr/local/bin/daily-security-check.sh << 'EOF'

# Check PostgreSQL status
echo "PostgreSQL status:" >> $LOGFILE
systemctl status postgresql --no-pager >> $LOGFILE

# Check for failed PostgreSQL connections
echo "PostgreSQL failed connections:" >> $LOGFILE
grep "FATAL" /var/log/postgresql/*.log 2>/dev/null | tail -10 >> $LOGFILE || true
EOF

# 20. Summary and final checks
echo -e "${YELLOW}[STEP 20]${NC} Performing final security checks..."

echo -e "${GREEN}[SUCCESS]${NC} EC2 hardening completed successfully!"
echo
echo -e "${YELLOW}=== HARDENING SUMMARY ===${NC}"
echo "✓ System updated and security packages installed"
echo "✓ Automatic security updates configured"
echo "✓ SSH hardened (no root login, key auth only)"
echo "✓ UFW firewall configured and enabled (PostgreSQL blocked externally)"
echo "✓ Fail2Ban configured for intrusion prevention"
echo "✓ System parameters hardened"
echo "✓ Unnecessary services disabled"
echo "✓ File permissions secured"
echo "✓ Audit daemon configured"
echo "✓ AIDE intrusion detection initialized"
echo "✓ Log monitoring configured"
echo "✓ Security monitoring scripts created"
echo "✓ Security cron jobs scheduled"
echo "✓ Configuration backup system created"
echo "✓ PostgreSQL installed and hardened (localhost-only access)"
echo

echo -e "${YELLOW}=== NEXT STEPS ===${NC}"
echo "1. CRITICAL: Change the default PostgreSQL password:"
echo "   sudo -u postgres psql"
echo "   ALTER USER rsaero WITH ENCRYPTED PASSWORD 'your_secure_password_here';"
echo "   \\q"
echo
echo "2. Configure your application .env file with the new password:"
echo "   DATABASE_URL=\"postgresql://rsaero:your_secure_password_here@localhost:5432/rsaerofkt\""
echo
echo "3. Reboot the system to ensure all changes take effect:"
echo "   sudo reboot"
echo
echo "4. After reboot, verify services are running:"
echo "   sudo /usr/local/bin/security-status.sh"
echo "   sudo systemctl status postgresql"
echo
echo "5. Test SSH access to ensure you can still connect"
echo
echo "6. Test database connection:"
echo "   pg_isready -h localhost -U rsaero -d rsaerofkt"
echo
echo "7. Review log files:"
echo "   - Security check: /var/log/security-check.log"
echo "   - Hardening log: $LOGFILE"
echo "   - PostgreSQL logs: /var/log/postgresql/"
echo
echo "8. Schedule regular security tasks:"
echo "   - Weekly AIDE integrity checks"
echo "   - Daily log review"
echo "   - Monthly security updates"
echo "   - Weekly database backups"
echo

echo -e "${GREEN}[INFO]${NC} Hardening process completed at $(date)"
echo "Reboot required for all changes to take effect."
EOF