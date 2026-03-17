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
            for (const r of result.results || []) {
                if (r.success) {
                    logger.info(`  ${r.dbName}: ${r.filename} (${r.size} MB) -> ${r.s3Location}`);
                }
            }
            logger.info(`Total backups in S3: ${result.totalBackups}`);
        } else {
            for (const r of result.results || []) {
                if (!r.success) {
                    logger.error(`  ${r.dbName}: ${r.error}`);
                }
            }
            if (result.error) logger.error('Backup failed:', result.error);
            process.exit(1);
        }

    } catch (error) {
        logger.error('Manual backup error:', error);
        process.exit(1);
    }
}

// Run the backup
runManualBackup();
