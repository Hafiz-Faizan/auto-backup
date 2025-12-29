const { validateConfig } = require('./config/config');
const BackupService = require('./services/backup.service');
const logger = require('./utils/logger');

// Manual backup script
async function runManualBackup() {
    try {
        logger.info('=== Manual Backup Started ===');

        // Validate configuration
        validateConfig();

        // Create backup service instance
        const backupService = new BackupService();

        // Execute backup
        const result = await backupService.executeBackup();

        if (result.success) {
            logger.info('Manual backup completed successfully');
            logger.info(`Backup file: ${result.filename}`);
            logger.info(`Size: ${result.size} MB`);
            logger.info(`Total backups: ${result.totalBackups}`);
        } else {
            logger.error('Manual backup failed:', result.error);
            process.exit(1);
        }

    } catch (error) {
        logger.error('Manual backup error:', error);
        process.exit(1);
    }
}

// Run the backup
runManualBackup();
