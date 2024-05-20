const logger = require('./logger');

/**
 * Validates that all required environment variables are set.
 *
 * @throws {Error} Throws an error and exits the process if any required
 *                 environment variables are missing.
 */
function validateEnvVariables() {
  const requiredEnv = [
    'MONGODB_CONNECTION',
    'MONGODB_DB_NAME',
    'MONGODB_ID',
    'MONGODB_SECRET',
    'OPEN_AI_ASSISTANT_ID',
    'OPEN_AI_ORGANIZATION_ID',
    'OPEN_AI_PROJECT_ID',
    'OPEN_AI_PROJECT_SECRET',
    'RATE_LIMIT_AMOUNT',
    'RATE_LIMIT_WINDOW_MS'
  ];
  const missingEnvVars = requiredEnv.filter(envVar => !process.env[envVar]);

  if (missingEnvVars.length > 0) {
    logger.error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
    process.exit(1);
  }
}

module.exports = validateEnvVariables;
