const winston = require('winston');
const { combine, printf, timestamp } = winston.format;

// Format
const logFormat = combine(
  timestamp(),
  printf(({ level, message, timestamp }) => {
    return `${timestamp} [${level}]: ${message}`;
  })
);

// Create a logger instance
const logger = winston.createLogger({
  level: 'info',
  format: logFormat,
  transports: [
    new winston.transports.File({ filename: 'combined.log' }),
    new winston.transports.File({ filename: 'error.log', level: 'error' })
  ]
});

// If we're not in production then log to the `console` as well
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: logFormat
  }));
}

module.exports = logger;
