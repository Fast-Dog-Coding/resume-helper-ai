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

// Classify API requests the way this app routes them. Express matches the
// `/api` mount with the app's own case and strict-routing settings, so `/API`
// and `/Api` are included and `/apiv2` is not. This sits ahead of middleware
// that can fail (database, JSON parsing) so those errors are classified too.
app.use('/api', function markApiRoute(req, res, next) {
  req.routedToApi = true;
  next();
});

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
  const status = err.status || constants.HTTP_STATUS_INTERNAL_SERVER_ERROR;
  const serverError = status >= constants.HTTP_STATUS_INTERNAL_SERVER_ERROR;
  // 4xx text is part of the client contract (bad JSON, 404, moderation).
  // 5xx and errors with no status can carry a slice of an upstream body.
  const publicMessage = serverError ? 'Internal server error' : err.message;

  if (serverError) {
    console.error(err.message);
    if (err.stack) {
      console.error(err.stack);
    }
  }

  // Stack traces are a development aid. Other environments get the status only.
  const showErrorStack = req.app.get('env') === 'development';
  res.locals.message = publicMessage;
  res.locals.showErrorStack = showErrorStack;
  res.locals.error = showErrorStack ? err : { status };

  if (req.routedToApi) {
    return res.status(status).json({ error: publicMessage });
  }

  res.status(status);
  res.render('error');
});

module.exports = app;
