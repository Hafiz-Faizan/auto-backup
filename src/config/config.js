require('dotenv').config();

const config = {
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    name: process.env.DB_NAME
  },
  backup: {
    path: process.env.BACKUP_PATH || '/home/ubuntu/mysql-backups',
    retentionDays: parseInt(process.env.RETENTION_DAYS) || 7
  },
  cron: {
    schedule: process.env.CRON_SCHEDULE || '0 2 * * *' // Daily at 2 AM
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info'
  }
};

// Validate required configuration
function validateConfig() {
  const required = [
    'database.user',
    'database.password',
    'database.name'
  ];

  const missing = [];
  
  required.forEach(key => {
    const keys = key.split('.');
    let value = config;
    
    for (const k of keys) {
      value = value[k];
      if (!value) {
        missing.push(key);
        break;
      }
    }
  });

  if (missing.length > 0) {
    throw new Error(`Missing required configuration: ${missing.join(', ')}`);
  }
}

module.exports = { config, validateConfig };
