# EC2 Deployment Guide

Complete step-by-step guide to deploy the MySQL backup system on your EC2 instance.

## Prerequisites on EC2

Your EC2 instance should have:
- Ubuntu/Linux OS
- MySQL installed and running
- Node.js installed (v14+)
- Git installed
- Sufficient disk space for backups

## Deployment Steps

### 1. Connect to Your EC2 Instance

```bash
ssh -i your-key.pem ubuntu@your-ec2-ip
```

### 2. Install Node.js (if not installed)

```bash
# Update package list
sudo apt update

# Install Node.js and npm
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version
npm --version
```

### 3. Install PM2 Globally

```bash
sudo npm install -g pm2
```

### 4. Install MySQL Client Tools (if not installed)

```bash
sudo apt-get install -y mysql-client
```

### 5. Create Backup Directory

```bash
# Create backup directory
sudo mkdir -p /home/ubuntu/mysql-backups

# Set proper permissions
sudo chown ubuntu:ubuntu /home/ubuntu/mysql-backups
chmod 700 /home/ubuntu/mysql-backups
```

### 6. Clone Your Repository

```bash
# Navigate to home directory
cd ~

# Clone the repository
git clone <your-github-repo-url>

# Navigate to project directory
cd db-cron-job-for-secure
```

### 7. Install Dependencies

```bash
npm install
```

### 8. Configure Environment Variables

```bash
# Copy example env file
cp .env.example .env

# Edit the .env file
nano .env
```

Update with your MySQL credentials:

```env
# MySQL Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_USER=your_mysql_user
DB_PASSWORD=your_mysql_password
DB_NAME=your_database_name

# Backup Configuration
BACKUP_PATH=/home/ubuntu/mysql-backups
RETENTION_DAYS=7

# Cron Schedule (Daily at 2 AM)
CRON_SCHEDULE=0 2 * * *

# Logging
LOG_LEVEL=info
```

Save and exit (Ctrl+X, then Y, then Enter)

### 9. Test MySQL Connection

```bash
# Test if you can connect to MySQL
mysql -u your_mysql_user -p your_database_name

# If successful, exit
exit
```

### 10. Test the Backup System

```bash
# Run configuration test
npm run test

# If test passes, run a manual backup
npm run backup
```

### 11. Verify Backup Created

```bash
# Check backup directory
ls -lh /home/ubuntu/mysql-backups/

# You should see a .sql.gz file
```

### 12. Start with PM2

```bash
# Start the backup service
pm2 start ecosystem.config.js

# Check status
pm2 status

# View logs
pm2 logs mysql-backup-cron
```

### 13. Configure PM2 Auto-Start on Reboot

```bash
# Generate startup script
pm2 startup

# Copy and run the command that PM2 outputs
# It will look something like:
# sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u ubuntu --hp /home/ubuntu

# Save current PM2 process list
pm2 save
```

### 14. Test Auto-Restart

```bash
# Reboot the server
sudo reboot

# After reboot, reconnect and check PM2
ssh -i your-key.pem ubuntu@your-ec2-ip
pm2 status

# The mysql-backup-cron should be running
```

## Monitoring and Maintenance

### Check Backup Status

```bash
# View PM2 logs
pm2 logs mysql-backup-cron

# View backup logs
tail -f ~/db-cron-job-for-secure/logs/backup-*.log

# List all backups
ls -lh /home/ubuntu/mysql-backups/
```

### Monitor Disk Space

```bash
# Check available disk space
df -h

# Check backup directory size
du -sh /home/ubuntu/mysql-backups/
```

### Manual Backup

```bash
cd ~/db-cron-job-for-secure
npm run backup
```

### Update the Code

```bash
# Pull latest changes
cd ~/db-cron-job-for-secure
git pull

# Restart PM2 service
pm2 restart mysql-backup-cron
```

## Troubleshooting

### PM2 Service Not Starting

```bash
# Check PM2 logs
pm2 logs mysql-backup-cron --lines 50

# Check error logs
cat ~/db-cron-job-for-secure/logs/error.log
```

### MySQL Permission Issues

Grant proper permissions to your MySQL user:

```bash
# Connect to MySQL as root
sudo mysql

# Grant permissions
GRANT SELECT, LOCK TABLES, SHOW VIEW, EVENT, TRIGGER ON your_database.* TO 'your_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### Backup Files Too Large

Reduce retention days:

```bash
nano ~/db-cron-job-for-secure/.env

# Change RETENTION_DAYS to a lower value
RETENTION_DAYS=3

# Restart PM2
pm2 restart mysql-backup-cron
```

### Manually Clean Old Backups

```bash
# Remove backups older than 7 days
find /home/ubuntu/mysql-backups/ -name "*.sql.gz" -mtime +7 -delete
```

## Security Checklist

- ✅ Backup directory has restricted permissions (700)
- ✅ `.env` file is not committed to git
- ✅ MySQL user has minimal required permissions
- ✅ EC2 security group allows only necessary ports
- ✅ Regular backup restoration tests performed

## Backup Restoration Example

To restore a backup:

```bash
# List available backups
ls -lh /home/ubuntu/mysql-backups/

# Restore a specific backup
zcat /home/ubuntu/mysql-backups/your_backup.sql.gz | mysql -u your_user -p your_database
```

## Useful PM2 Commands

```bash
# View all processes
pm2 list

# View detailed info
pm2 show mysql-backup-cron

# View logs (live)
pm2 logs mysql-backup-cron

# View logs (last 100 lines)
pm2 logs mysql-backup-cron --lines 100

# Restart service
pm2 restart mysql-backup-cron

# Stop service
pm2 stop mysql-backup-cron

# Delete from PM2
pm2 delete mysql-backup-cron

# Monitor CPU/Memory
pm2 monit
```

## Cron Schedule Testing

To test the cron job more frequently, temporarily change the schedule:

```bash
nano .env

# Change to run every 5 minutes
CRON_SCHEDULE=*/5 * * * *

# Restart PM2
pm2 restart mysql-backup-cron

# Watch logs
pm2 logs mysql-backup-cron

# After testing, change back to daily schedule
CRON_SCHEDULE=0 2 * * *
pm2 restart mysql-backup-cron
```

## Next Steps

1. ✅ Monitor the first few automated backups
2. ✅ Test backup restoration process
3. ✅ Set up monitoring alerts (optional)
4. ✅ Document your specific MySQL credentials securely
5. ✅ Schedule regular backup restoration tests

## Support

If you encounter issues:
1. Check PM2 logs: `pm2 logs mysql-backup-cron`
2. Check application logs: `cat logs/error.log`
3. Verify MySQL connection: `npm run test`
4. Check disk space: `df -h`
