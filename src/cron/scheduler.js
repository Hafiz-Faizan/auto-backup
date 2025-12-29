const cron = require('node-cron');
const { config } = require('../config/config');
const BackupService = require('../services/backup.service');
const logger = require('../utils/logger');

class BackupScheduler {
    constructor() {
        this.backupService = new BackupService();
        this.cronJob = null;
    }

    /**
     * Start the cron job
     */
    start() {
        const schedule = config.cron.schedule;

        // Validate cron expression
        if (!cron.validate(schedule)) {
            throw new Error(`Invalid cron schedule: ${schedule}`);
        }

        logger.info(`Initializing backup scheduler with schedule: ${schedule}`);
        logger.info(this.getScheduleDescription(schedule));

        this.cronJob = cron.schedule(schedule, async () => {
            logger.info('Cron job triggered - Starting scheduled backup');
            await this.backupService.executeBackup();
        }, {
            scheduled: true,
            timezone: "Asia/Kolkata" // Adjust to your timezone
        });

        logger.info('Backup scheduler started successfully');
    }

    /**
     * Stop the cron job
     */
    stop() {
        if (this.cronJob) {
            this.cronJob.stop();
            logger.info('Backup scheduler stopped');
        }
    }

    /**
     * Get human-readable schedule description
     */
    getScheduleDescription(schedule) {
        const scheduleMap = {
            '0 2 * * *': 'Daily at 2:00 AM',
            '0 0 * * *': 'Daily at midnight',
            '0 */6 * * *': 'Every 6 hours',
            '0 */12 * * *': 'Every 12 hours',
            '0 0 * * 0': 'Weekly on Sunday at midnight',
            '*/5 * * * *': 'Every 5 minutes (testing)'
        };

        return scheduleMap[schedule] || `Custom schedule: ${schedule}`;
    }

    /**
     * Run backup immediately (for testing)
     */
    async runNow() {
        logger.info('Running immediate backup (manual trigger)');
        return await this.backupService.executeBackup();
    }
}

module.exports = BackupScheduler;
