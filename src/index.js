const { validateConfig } = require('./config/config');
const BackupScheduler = require('./cron/scheduler');
const logger = require('./utils/logger');

// Main application
async function main() {
    try {
        // Validate configuration
        logger.info('Validating configuration...');
        validateConfig();
        logger.info('Configuration validated successfully');

        // Create scheduler instance
        const scheduler = new BackupScheduler();

        // Start the cron job
        scheduler.start();

        logger.info('MySQL Backup Service is running...');
        logger.info('Press Ctrl+C to stop');

        // Graceful shutdown
        process.on('SIGINT', () => {
            logger.info('Received SIGINT signal');
            scheduler.stop();
            logger.info('Backup service stopped gracefully');
            process.exit(0);
        });

        process.on('SIGTERM', () => {
            logger.info('Received SIGTERM signal');
            scheduler.stop();
            logger.info('Backup service stopped gracefully');
            process.exit(0);
        });

    } catch (error) {
        logger.error('Failed to start backup service:', error);
        process.exit(1);
    }
}

// Start the application
main();
