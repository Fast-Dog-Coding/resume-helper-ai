require('dotenv').config();
const { constants } = require('node:http2');
const createError = require('http-errors');
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const logger = require('./config/logger');
const validateEnvVariables = require('./config/validateEnv');

validateEnvVariables();

// Connect to the database using async/await
(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_CONNECTION, {
      dbName: process.env.MONGODB_DB_NAME
    });
    logger.info('MongoDB Connected!');

  } catch (error) {
    logger.error('MongoDB connection error:', error);
    process.exit(1);
  }
})();

// Set rate limiter config
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10),
  max: parseInt(process.env.RATE_LIMIT_AMOUNT, 10),
  standardHeaders: 'draft-7',
  legacyHeaders: false
});

// Create app and get routes
const app = express();
const home = require('./routes/home');
const api = require('./routes/api');

// View engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Setup Morgan to use Winston for HTTP logging
app.use(morgan('combined', { stream: { write: (message) => logger.info(message.trim()) } }));

// Security enhancements
app.use(helmet.contentSecurityPolicy({
  directives: {
    defaultSrc: [ "'self'" ],
    scriptSrc: [ "'self'", 'https://cdn.jsdelivr.net/npm/marked/marked.min.js' ]
  }
}));

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', home);

// Enable rate limiter for API routes
app.use('/api', limiter, api);

// Catch 404 and forward to error handler
app.use((req, res, next) => {
  next(createError(constants.HTTP_STATUS_NOT_FOUND));
});

// Error handler
app.use((err, req, res, next) => {
  // Set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'production' ? {} : err;

  // Render the error page
  res.status(err.status || constants.HTTP_STATUS_INTERNAL_SERVER_ERROR);
  res.render('error');
});

module.exports = app;
