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
        logger.info(`  Backup Path: ${config.backup.path}`);
        logger.info(`  Retention Days: ${config.backup.retentionDays}`);
        logger.info(`  Cron Schedule: ${config.cron.schedule}`);

        // Test 3: Check backup directory
        logger.info('\nTest 3: Checking backup directory...');
        const fs = require('fs').promises;
        try {
            await fs.access(config.backup.path);
            logger.info(`✓ Backup directory exists: ${config.backup.path}`);
        } catch {
            logger.info(`  Backup directory will be created: ${config.backup.path}`);
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
