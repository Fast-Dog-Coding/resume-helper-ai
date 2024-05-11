/*
 * TO DOs
 *
 * - [Database integration to hold logs: MongoDB Atlas.]
 * - - fix storing thread contents.
 * - [middleware to throttle requests.]
 * - expire threads.
 * - [UI to accept prompts]
 * - - [Fix "spinner"]
 * - AI Files:
 * - - Add a list of courses taken with dates completed, and content descriptions.
 * - - Fix resume to list skills as bullets
 */
require('dotenv').config();
const { constants } = require('node:http2');
const createError = require('http-errors');
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const logger = require('./config/logger');
const rateLimit = require('express-rate-limit');

// connect to database
mongoose.connect(process.env.MONGODB_CONNECTION, { dbName: process.env.MONGODB_DB_NAME })
  .then(data => logger.info('MongoDB Connected!'))
  .catch(error => logger.error(error));

// set rate limiter config
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || "300000", 10),
  limit: parseInt(process.env.RATE_LIMIT_AMOUNT || "20", 10),
  standardHeaders: 'draft-7',
  legacyHeaders: false
});

// create app and routes
const app = express();
const home = require('./routes/home');
const api = require('./routes/api');

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Setup Morgan to use Winston for HTTP logging
app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) }}));

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', home);

// enable rate limiter for following routes
app.use(limiter);
app.use('/api', api);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(constants.HTTP_STATUS_NOT_FOUND));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') !== 'production' ? err : {};

  // render the error page
  res.status(err.status || constants.HTTP_STATUS_INTERNAL_SERVER_ERROR);
  res.render('error');
});

module.exports = app;
