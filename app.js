require('dotenv').config();
const { constants } = require('node:http2');
const crypto = require('crypto');
const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const logger = require('./config/logger');
const validateEnvVariables = require('./config/validateEnv');
const { connectDB } = require('./config/database');

validateEnvVariables();

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

// Tweak trust proxy for rate limiter
app.set('trust proxy', parseInt(process.env.RATE_LIMIT_PROXY, 10));

// View engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Reuse cached MongoDB connection across serverless invocations
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (error) {
    logger.error('MongoDB connection error:', error);
    next(error);
  }
});

// Setup Morgan to use Winston for HTTP logging
app.use(morgan('combined', { stream: { write: (message) => logger.info(message.trim()) } }));

// Generate a per-request nonce and attach it to res.locals for EJS templates
app.use((req, res, next) => {
  res.locals.cspNonce = crypto.randomBytes(16).toString('base64');
  next();
});

// Security enhancements
app.use((req, res, next) => {
  helmet.contentSecurityPolicy({
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", `'nonce-${res.locals.cspNonce}'`, 'https://cdn.jsdelivr.net/npm/marked/marked.min.js'],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      imgSrc: ["'self'", "data:"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      connectSrc: ["'self'"]
    }
  })(req, res, next);
});

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

  const status = err.status || constants.HTTP_STATUS_INTERNAL_SERVER_ERROR;
  if (req.originalUrl.startsWith('/api')) {
    return res.status(status).json({ error: err.message });
  }

  // Render the error page
  res.status(status);
  res.render('error');
});

module.exports = app;
