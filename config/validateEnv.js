const logger = require('./logger');

/**
 * Validates that all required environment variables are set.
 *
 * @throws {Error} Throws an error and exits the process if any required
 *                 environment variables are missing.
 */
function validateEnvVariables() {
  const requiredEnv = [
    'APP_HTTP_REFERER',
    'APP_TITLE',
    'MONGODB_CONNECTION',
    'MONGODB_DB_NAME',
    'COOKIE_ENCRYPTION_KEY',
    'OPENROUTER_API_KEY',
    'OPENROUTER_BASE_URL',
    'OPENROUTER_MODELS',
    'RATE_LIMIT_AMOUNT',
    'RATE_LIMIT_WINDOW_MS',
    'RATE_LIMIT_PROXY'
  ];
  const missingEnvVars = requiredEnv.filter(envVar => !process.env[envVar]);

  if (missingEnvVars.length > 0) {
    logger.error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
    process.exit(1);
  }
}

module.exports = validateEnvVariables;
