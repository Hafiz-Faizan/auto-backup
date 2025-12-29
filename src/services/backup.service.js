const { exec } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const { config } = require('../config/config');
const logger = require('../utils/logger');

class BackupService {
    constructor() {
        this.backupPath = config.backup.path;
        this.dbConfig = config.database;
    }

    /**
     * Initialize backup directory
     */
    async initialize() {
        try {
            await fs.mkdir(this.backupPath, { recursive: true });
            logger.info(`Backup directory initialized: ${this.backupPath}`);
        } catch (error) {
            logger.error(`Failed to create backup directory: ${error.message}`);
            throw error;
        }
    }

    /**
     * Generate backup filename with timestamp
     */
    generateBackupFilename() {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
        const time = new Date().toTimeString().split(' ')[0].replace(/:/g, '-');
        return `${this.dbConfig.name}_${timestamp}_${time}.sql.gz`;
    }

    /**
     * Create MySQL dump
     */
    async createBackup() {
        const filename = this.generateBackupFilename();
        const filepath = path.join(this.backupPath, filename);

        logger.info(`Starting backup for database: ${this.dbConfig.name}`);

        return new Promise((resolve, reject) => {
            // Build mysqldump command with compression
            // --skip-lock-tables: Bypass LOCK TABLES permission issues
            // --no-tablespaces: Skip tablespace information (requires PROCESS privilege)
            // --single-transaction: Consistent backup without locking tables
            const command = `mysqldump -h ${this.dbConfig.host} -P ${this.dbConfig.port} -u ${this.dbConfig.user} -p'${this.dbConfig.password}' --skip-lock-tables --no-tablespaces --single-transaction ${this.dbConfig.name} | gzip > ${filepath}`;

            exec(command, (error, stdout, stderr) => {
                if (error) {
                    logger.error(`Backup failed: ${error.message}`);
                    reject(error);
                    return;
                }

                if (stderr && !stderr.includes('Warning')) {
                    logger.warn(`Backup warning: ${stderr}`);
                }

                logger.info(`Backup created successfully: ${filename}`);
                resolve({ filename, filepath });
            });
        });
    }

    /**
     * Get backup file size
     */
    async getBackupSize(filepath) {
        try {
            const stats = await fs.stat(filepath);
            const sizeInMB = (stats.size / (1024 * 1024)).toFixed(2);
            return sizeInMB;
        } catch (error) {
            logger.error(`Failed to get backup size: ${error.message}`);
            return 'unknown';
        }
    }

    /**
     * Clean up old backups based on retention policy
     */
    async cleanupOldBackups() {
        try {
            const files = await fs.readdir(this.backupPath);
            const now = Date.now();
            const retentionMs = config.backup.retentionDays * 24 * 60 * 60 * 1000;

            let deletedCount = 0;

            for (const file of files) {
                if (!file.endsWith('.sql.gz')) continue;

                const filepath = path.join(this.backupPath, file);
                const stats = await fs.stat(filepath);
                const fileAge = now - stats.mtimeMs;

                if (fileAge > retentionMs) {
                    await fs.unlink(filepath);
                    deletedCount++;
                    logger.info(`Deleted old backup: ${file}`);
                }
            }

            if (deletedCount > 0) {
                logger.info(`Cleanup completed: ${deletedCount} old backup(s) deleted`);
            } else {
                logger.info('No old backups to delete');
            }

            return deletedCount;
        } catch (error) {
            logger.error(`Cleanup failed: ${error.message}`);
            throw error;
        }
    }

    /**
     * List all backups
     */
    async listBackups() {
        try {
            const files = await fs.readdir(this.backupPath);
            const backups = [];

            for (const file of files) {
                if (!file.endsWith('.sql.gz')) continue;

                const filepath = path.join(this.backupPath, file);
                const stats = await fs.stat(filepath);
                const sizeInMB = (stats.size / (1024 * 1024)).toFixed(2);

                backups.push({
                    filename: file,
                    size: `${sizeInMB} MB`,
                    created: stats.mtime
                });
            }

            return backups.sort((a, b) => b.created - a.created);
        } catch (error) {
            logger.error(`Failed to list backups: ${error.message}`);
            return [];
        }
    }

    /**
     * Execute full backup workflow
     */
    async executeBackup() {
        try {
            logger.info('=== Starting Backup Workflow ===');

            // Initialize backup directory
            await this.initialize();

            // Create backup
            const { filename, filepath } = await this.createBackup();

            // Get backup size
            const size = await this.getBackupSize(filepath);
            logger.info(`Backup size: ${size} MB`);

            // Cleanup old backups
            await this.cleanupOldBackups();

            // List current backups
            const backups = await this.listBackups();
            logger.info(`Total backups: ${backups.length}`);

            logger.info('=== Backup Workflow Completed Successfully ===');

            return {
                success: true,
                filename,
                size,
                totalBackups: backups.length
            };
        } catch (error) {
            logger.error('=== Backup Workflow Failed ===');
            logger.error(error);
            return {
                success: false,
                error: error.message
            };
        }
    }
}

module.exports = BackupService;
