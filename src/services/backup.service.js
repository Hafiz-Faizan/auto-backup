const { exec } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const { S3Client, PutObjectCommand, ListObjectsV2Command, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { config } = require('../config/config');
const logger = require('../utils/logger');

class BackupService {
    constructor() {
        this.dbConfig = config.database;
        this.s3Config = config.s3;
        this.s3Client = new S3Client({
            region: this.s3Config.region,
            credentials: {
                accessKeyId: this.s3Config.accessKeyId,
                secretAccessKey: this.s3Config.secretAccessKey
            }
        });
        this.tempDir = os.tmpdir();
    }

    /**
     * Get S3 key for a backup file
     */
    getS3Key(filename) {
        const prefix = this.s3Config.prefix.replace(/\/$/, '');
        return prefix ? `${prefix}/${filename}` : filename;
    }

    /**
     * Generate backup filename with timestamp for a database
     */
    generateBackupFilename(dbName) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
        const time = new Date().toTimeString().split(' ')[0].replace(/:/g, '-');
        return `${dbName}_${timestamp}_${time}.sql.gz`;
    }

    /**
     * Create MySQL dump to temp file for a single database
     */
    async createBackup(dbName) {
        const filename = this.generateBackupFilename(dbName);
        const filepath = path.join(this.tempDir, filename);

        logger.info(`Starting backup for database: ${dbName}`);

        return new Promise((resolve, reject) => {
            const command = `mysqldump -h ${this.dbConfig.host} -P ${this.dbConfig.port} -u ${this.dbConfig.user} -p'${this.dbConfig.password}' --skip-lock-tables --no-tablespaces --single-transaction ${dbName} | gzip > ${filepath}`;

            exec(command, (error, stdout, stderr) => {
                if (error) {
                    logger.error(`Backup failed for ${dbName}: ${error.message}`);
                    reject(error);
                    return;
                }

                if (stderr && !stderr.includes('Warning')) {
                    logger.warn(`Backup warning: ${stderr}`);
                }

                logger.info(`Backup created successfully: ${filename}`);
                resolve({ filename, filepath, dbName });
            });
        });
    }

    /**
     * Upload backup file to S3
     */
    async uploadToS3(filepath, filename) {
        const fileContent = await fs.readFile(filepath);
        const s3Key = this.getS3Key(filename);

        await this.s3Client.send(new PutObjectCommand({
            Bucket: this.s3Config.bucket,
            Key: s3Key,
            Body: fileContent,
            ContentType: 'application/gzip'
        }));

        logger.info(`Backup uploaded to S3: s3://${this.s3Config.bucket}/${s3Key}`);
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
     * Clean up old backups from S3 based on retention policy
     */
    async cleanupOldBackups() {
        try {
            const prefix = this.s3Config.prefix.replace(/\/$/, '');
            const listParams = {
                Bucket: this.s3Config.bucket,
                Prefix: prefix ? `${prefix}/` : undefined
            };

            const listResponse = await this.s3Client.send(new ListObjectsV2Command(listParams));
            const objects = listResponse.Contents || [];
            const now = Date.now();
            const retentionMs = config.backup.retentionDays * 24 * 60 * 60 * 1000;

            let deletedCount = 0;

            for (const obj of objects) {
                if (!obj.Key || !obj.Key.endsWith('.sql.gz')) continue;

                const fileAge = now - (obj.LastModified?.getTime() || 0);

                if (fileAge > retentionMs) {
                    await this.s3Client.send(new DeleteObjectCommand({
                        Bucket: this.s3Config.bucket,
                        Key: obj.Key
                    }));
                    deletedCount++;
                    logger.info(`Deleted old backup from S3: ${obj.Key}`);
                }
            }

            if (deletedCount > 0) {
                logger.info(`Cleanup completed: ${deletedCount} old backup(s) deleted from S3`);
            } else {
                logger.info('No old backups to delete from S3');
            }

            return deletedCount;
        } catch (error) {
            logger.error(`S3 cleanup failed: ${error.message}`);
            throw error;
        }
    }

    /**
     * List all backups in S3
     */
    async listBackups() {
        try {
            const prefix = this.s3Config.prefix.replace(/\/$/, '');
            const listParams = {
                Bucket: this.s3Config.bucket,
                Prefix: prefix ? `${prefix}/` : undefined
            };

            const listResponse = await this.s3Client.send(new ListObjectsV2Command(listParams));
            const objects = listResponse.Contents || [];

            const backups = objects
                .filter(obj => obj.Key && obj.Key.endsWith('.sql.gz'))
                .map(obj => {
                    const filename = obj.Key.split('/').pop();
                    const sizeInMB = obj.Size ? (obj.Size / (1024 * 1024)).toFixed(2) : '0';
                    return {
                        filename,
                        size: `${sizeInMB} MB`,
                        created: obj.LastModified || new Date()
                    };
                });

            return backups.sort((a, b) => b.created - a.created);
        } catch (error) {
            logger.error(`Failed to list S3 backups: ${error.message}`);
            return [];
        }
    }

    /**
     * Execute full backup workflow for all configured databases
     */
    async executeBackup() {
        const dbNames = this.dbConfig.names || (this.dbConfig.name ? [this.dbConfig.name] : []);
        const results = [];
        const tempFilepaths = [];

        try {
            logger.info('=== Starting Backup Workflow ===');
            logger.info(`Databases to backup: ${dbNames.join(', ')}`);

            for (const dbName of dbNames) {
                let tempFilepath = null;

                try {
                    // Create backup to temp file
                    const { filename, filepath } = await this.createBackup(dbName);
                    tempFilepath = filepath;
                    tempFilepaths.push(filepath);

                    // Get backup size
                    const size = await this.getBackupSize(filepath);
                    logger.info(`Backup size for ${dbName}: ${size} MB`);

                    // Upload to S3
                    await this.uploadToS3(filepath, filename);

                    // Delete temp file
                    await fs.unlink(filepath);
                    tempFilepaths.splice(tempFilepaths.indexOf(filepath), 1);
                    tempFilepath = null;

                    results.push({
                        dbName,
                        success: true,
                        filename,
                        size,
                        s3Location: `s3://${this.s3Config.bucket}/${this.getS3Key(filename)}`
                    });
                } catch (dbError) {
                    logger.error(`Backup failed for ${dbName}:`, dbError.message);
                    results.push({
                        dbName,
                        success: false,
                        error: dbError.message
                    });
                    if (tempFilepath) {
                        try {
                            await fs.unlink(tempFilepath);
                        } catch (unlinkError) {
                            logger.warn(`Failed to remove temp file: ${unlinkError.message}`);
                        }
                    }
                }
            }

            // Cleanup old backups from S3 (once after all backups)
            await this.cleanupOldBackups();

            // List current backups in S3
            const backups = await this.listBackups();
            logger.info(`Total backups in S3: ${backups.length}`);

            const allSucceeded = results.every(r => r.success);
            logger.info('=== Backup Workflow Completed ===');

            return {
                success: allSucceeded,
                results,
                totalBackups: backups.length
            };
        } catch (error) {
            logger.error('=== Backup Workflow Failed ===');
            logger.error(error);

            // Clean up any remaining temp files on failure
            for (const filepath of tempFilepaths) {
                try {
                    await fs.unlink(filepath);
                } catch (unlinkError) {
                    logger.warn(`Failed to remove temp file: ${unlinkError.message}`);
                }
            }

            return {
                success: false,
                results,
                error: error.message
            };
        }
    }
}

module.exports = BackupService;
