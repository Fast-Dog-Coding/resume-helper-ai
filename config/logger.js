const winston = require('winston');
const { combine, printf, timestamp, colorize } = winston.format;
require('winston-mongodb');
require('winston-daily-rotate-file');

const LOG_DIR = process.env.LOG_DIR || 'logs/';

// Format for file logs
const fileLogFormat = combine(
  timestamp(),
  printf(({ level, message, timestamp }) => {
    return `${timestamp} [${level}]: ${message}`;
  })
);

// Format for console logs
const consoleLogFormat = combine(
  colorize(),
  timestamp(),
  printf(({ level, message, timestamp }) => {
    return `${timestamp} [${level}]: ${message}`;
  })
);

/**
 * Create a logger instance
 *
 * @type {winston.Logger}
 */
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: fileLogFormat,
  transports: [
    new winston.transports.DailyRotateFile({
      filename: LOG_DIR + 'combined-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '14d'
    }),
    new winston.transports.DailyRotateFile({
      filename: LOG_DIR + 'error-%DATE%.log',
      level: 'error',
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '30d'
    }),
    new winston.transports.MongoDB({
      db: process.env.MONGODB_CONNECTION,
      collection: 'server_logs',
      level: 'warn', // Captures 'warn' and 'error' logs
    })
  ]
});

// If we're not in production then log to the `console` as well
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: consoleLogFormat
  }));
}

// Handle uncaught exceptions and rejections
logger.exceptions.handle(
  new winston.transports.File({ filename: LOG_DIR + 'exceptions.log' })
);

logger.rejections.handle(
  new winston.transports.File({ filename: LOG_DIR + 'rejections.log' })
);

logger.log(logger.level, `Logging set to ${logger.level}`);

module.exports = logger;
