# MySQL Backup Automation System

Automated MySQL database backup system with local storage, rotation, and PM2 deployment support.

## Features

✅ **Automated Daily Backups** - Scheduled backups using cron  
✅ **Compressed Storage** - Gzip compression to save disk space  
✅ **Automatic Rotation** - Keeps only the last N days of backups  
✅ **Comprehensive Logging** - Daily rotating logs with error tracking  
✅ **PM2 Ready** - Production-ready with PM2 process manager  
✅ **Manual Backup** - Run backups on-demand  

## Prerequisites

- Node.js (v14 or higher)
- MySQL client tools (`mysql`, `mysqldump`)
- PM2 (for production deployment)

## Installation

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd db-cron-job-for-secure
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Copy the example environment file and update with your settings:

```bash
cp .env.example .env
nano .env
```

Update the following variables:

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

### 4. Test Configuration

```bash
npm run test
```

This will verify:
- Configuration is valid
- MySQL connection works
- Backup directory is accessible

## Usage

### Manual Backup

Run a backup immediately:

```bash
npm run backup
```

### Start Backup Service

Start the cron service (keeps running):

```bash
npm start
```

### Production Deployment with PM2

#### Install PM2 (if not already installed)

```bash
npm install -g pm2
```

#### Start the Service

```bash
pm2 start ecosystem.config.js
```

#### Manage the Service

```bash
# View status
pm2 status

# View logs
pm2 logs mysql-backup-cron

# Stop the service
pm2 stop mysql-backup-cron

# Restart the service
pm2 restart mysql-backup-cron

# Remove from PM2
pm2 delete mysql-backup-cron
```

#### Auto-start on System Reboot

```bash
# Generate startup script
pm2 startup

# Save current PM2 process list
pm2 save
```

## Cron Schedule Examples

The `CRON_SCHEDULE` variable uses standard cron syntax:

```
# Daily at 2 AM
0 2 * * *

# Daily at midnight
0 0 * * *

# Every 6 hours
0 */6 * * *

# Every 12 hours
0 */12 * * *

# Weekly on Sunday at midnight
0 0 * * 0

# Every 5 minutes (for testing)
*/5 * * * *
```

## Backup File Format

Backups are stored with the following naming convention:

```
<database_name>_<date>_<time>.sql.gz
```

Example:
```
mydb_2025-12-29_02-00-00.sql.gz
```

## Restore from Backup

To restore a backup:

```bash
# Decompress and restore
gunzip < /path/to/backup.sql.gz | mysql -u username -p database_name

# Or in one command
zcat /path/to/backup.sql.gz | mysql -u username -p database_name
```

## Directory Structure

```
db-cron-job-for-secure/
├── package.json              # Project dependencies
├── .env                      # Environment configuration (not in git)
├── .env.example              # Environment template
├── ecosystem.config.js       # PM2 configuration
├── README.md                 # This file
├── src/
│   ├── index.js              # Main entry point
│   ├── manual-backup.js      # Manual backup script
│   ├── test-backup.js        # Configuration test script
│   ├── config/
│   │   └── config.js         # Configuration management
│   ├── services/
│   │   └── backup.service.js # Backup logic
│   ├── utils/
│   │   └── logger.js         # Logging utility
│   └── cron/
│       └── scheduler.js      # Cron job scheduler
└── logs/                     # Log files (auto-generated)
```

## Logs

Logs are stored in the `logs/` directory:

- `backup-<date>.log` - Daily rotating backup logs
- `error.log` - Error-only logs
- `pm2-error.log` - PM2 error logs
- `pm2-out.log` - PM2 output logs

## Troubleshooting

### MySQL Connection Failed

1. Verify MySQL is running: `sudo systemctl status mysql`
2. Check credentials in `.env` file
3. Ensure user has proper permissions:
   ```sql
   GRANT SELECT, LOCK TABLES ON database_name.* TO 'user'@'localhost';
   FLUSH PRIVILEGES;
   ```

### Backup Directory Permission Denied

```bash
# Create directory with proper permissions
sudo mkdir -p /home/ubuntu/mysql-backups
sudo chown ubuntu:ubuntu /home/ubuntu/mysql-backups
```

### Disk Space Issues

Check available disk space:
```bash
df -h
```

Reduce retention days in `.env`:
```env
RETENTION_DAYS=3
```

### mysqldump Command Not Found

Install MySQL client:
```bash
# Ubuntu/Debian
sudo apt-get install mysql-client

# CentOS/RHEL
sudo yum install mysql
```

## Storage Calculation

For a 130MB database:

| Retention Days | Total Storage |
|----------------|---------------|
| 7 days         | ~910 MB       |
| 14 days        | ~1.8 GB       |
| 30 days        | ~3.9 GB       |

## Security Best Practices

1. **Never commit `.env` file** - Contains sensitive credentials
2. **Restrict backup directory permissions**:
   ```bash
   chmod 700 /home/ubuntu/mysql-backups
   ```
3. **Use strong MySQL passwords**
4. **Regularly test backup restoration**
5. **Monitor disk space usage**

## License

ISC

## Support

For issues or questions, please create an issue in the repository.
