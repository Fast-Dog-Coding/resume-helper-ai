const winston = require('winston');
const { combine, printf, timestamp, colorize } = winston.format;
require('winston-mongodb');
require('winston-daily-rotate-file');

const LOG_DIR = process.env.LOG_DIR || 'logs/';
const isVercel = Boolean(process.env.VERCEL);

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

const transports = [];

if (isVercel) {
  transports.push(new winston.transports.Console({ format: consoleLogFormat }));
} else {
  transports.push(
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
    })
  );

  if (process.env.NODE_ENV !== 'production') {
    transports.push(new winston.transports.Console({ format: consoleLogFormat }));
  }
}

if (process.env.MONGODB_CONNECTION) {
  transports.push(new winston.transports.MongoDB({
    db: process.env.MONGODB_CONNECTION,
    collection: 'server_logs',
    level: 'warn'
  }));
}

/**
 * Create a logger instance
 *
 * @type {winston.Logger}
 */
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: fileLogFormat,
  transports
});

if (!isVercel) {
  logger.exceptions.handle(
    new winston.transports.File({ filename: LOG_DIR + 'exceptions.log' })
  );

  logger.rejections.handle(
    new winston.transports.File({ filename: LOG_DIR + 'rejections.log' })
  );
} else {
  logger.exceptions.handle(new winston.transports.Console({ format: consoleLogFormat }));
  logger.rejections.handle(new winston.transports.Console({ format: consoleLogFormat }));
}

logger.log(logger.level, `Logging set to ${logger.level}`);

module.exports = logger;
