const { validateConfig, config } = require('./config/config');
const logger = require('./utils/logger');

// Test configuration and connectivity
async function testBackup() {
    try {
        logger.info('=== Testing Backup Configuration ===');

        // Test 1: Validate configuration
        logger.info('Test 1: Validating configuration...');
        validateConfig();
        logger.info('✓ Configuration is valid');

        // Test 2: Display configuration (without password)
        logger.info('\nTest 2: Configuration details:');
        logger.info(`  Database Host: ${config.database.host}:${config.database.port}`);
        logger.info(`  Database Name: ${config.database.name}`);
        logger.info(`  Database User: ${config.database.user}`);
        logger.info(`  S3 Bucket: ${config.s3.bucket}`);
        logger.info(`  S3 Prefix: ${config.s3.prefix}`);
        logger.info(`  AWS Region: ${config.s3.region}`);
        logger.info(`  Retention Days: ${config.backup.retentionDays}`);
        logger.info(`  Cron Schedule: ${config.cron.schedule}`);

        // Test 3: Test S3 connectivity
        logger.info('\nTest 3: Testing S3 connectivity...');
        const { S3Client, ListObjectsV2Command } = require('@aws-sdk/client-s3');
        const s3Client = new S3Client({
            region: config.s3.region,
            credentials: {
                accessKeyId: config.s3.accessKeyId,
                secretAccessKey: config.s3.secretAccessKey
            }
        });
        try {
            await s3Client.send(new ListObjectsV2Command({
                Bucket: config.s3.bucket,
                MaxKeys: 1
            }));
            logger.info(`✓ S3 bucket accessible: ${config.s3.bucket}`);
        } catch (err) {
            logger.error('✗ S3 connection failed:', err.message);
            throw err;
        }

        // Test 4: Test MySQL connection
        logger.info('\nTest 4: Testing MySQL connection...');
        const { exec } = require('child_process');
        const testCommand = `mysql -h ${config.database.host} -P ${config.database.port} -u ${config.database.user} -p'${config.database.password}' -e "SELECT 1" ${config.database.name}`;

        await new Promise((resolve, reject) => {
            exec(testCommand, (error, stdout, stderr) => {
                if (error) {
                    logger.error('✗ MySQL connection failed:', error.message);
                    reject(error);
                } else {
                    logger.info('✓ MySQL connection successful');
                    resolve();
                }
            });
        });

        logger.info('\n=== All Tests Passed ===');
        logger.info('You can now run the backup service with: npm start');
        logger.info('Or run a manual backup with: npm run backup');

    } catch (error) {
        logger.error('\n=== Test Failed ===');
        logger.error(error.message);
        process.exit(1);
    }
}

// Run tests
testBackup();
