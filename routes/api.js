const express = require('express');
const { constants } = require('node:http2');
const api = express.Router();
const { addThreadMessage, retrieveThreadMessages, runThreadPoll } = require('../controllers/assistant');
const {
  getThreadId,
  setThreadId,
  moderateRequest
} = require('../middleware');
const logger = require('../config/logger');
const { logEvent, LogTypes } = require('../utils');

/**
 * Transforms the content of the message for display.
 *
 * @param {import('openai').ThreadCreateAndRunParams.Thread.Message} message
 * @return {{role, content: *}}
 */
function formatMessage(message) {
  // remove annotation markers, like: "foo<strong>【10:0†source】</strong>bar"
  const content = message.content[0].text.value.replace(/【[^】]*】/g, "");

  return { content, role: message.role };
}

/**
 * Middleware to add a message to a thread.
 *
 * @param {import('express').Request} req - The request object.
 * @param {import('express').Response} res - The response object.
 * @param {import('express').NextFunction} next - The next middleware function.
 * @returns {Promise<Message>}
 */
async function addMessage(req, res, next) {
  logger.debug('inside addMessage()');
  const { body: { content } } = req;
  let { threadId } = req;

  if (!content || typeof content !== 'string') {
    return res.status(400).json({ error: 'Message content is required.' });
  }

  if (content.length > 8000) {
    return res.status(400).json({ error: 'Message content must be 8,000 characters or less.' });
  }

  try {
    threadId = await addThreadMessage(threadId, content);
    logger.info(`Added Message to Thread: ${threadId}, content: ${content}`);

    try {
      await logEvent(
        req.user ? req.user.id : req.ip,
        content,
        threadId,
        LogTypes.REQUEST
      );
    } catch (logErr) {
      logger.error(`Failed to log request event: ${logErr.message}`);
    }

    req.threadId = threadId;

    next();

  } catch (error) {
    next(error);
  }
}

/**
 * Responds to caller with an array of formatted messages.
 *
 * @param {import('express').Request} req - The request object.
 * @param {import('express').Response} res - The response object.
 * @param {import('express').NextFunction} next - The next middleware function.
 */
async function getThreadMessages(req, res, next) {
  const { threadId } = req;

  try {
    let messages = (await retrieveThreadMessages(threadId))
      .map(formatMessage);

    res
      .status(constants.HTTP_STATUS_OK)
      .json({ messages });

  } catch (error) {
    next(error);
  }
}

/**
 * Run the thread and return messages from assistant.
 *
 * @param {import('express').Request} req - The request object.
 * @param {string} req.threadId - The thread id for this run.
 * @param {import('express').Response} res - The response object.
 * @param {import('express').NextFunction} next - The next middleware function.
 * @returns {Promise<void>}
 */
async function askAssistant(req, res, next) {
  logger.debug('inside askAssistant()');
  const { threadId } = req;

  try {
    logger.debug(`calling runThreadPoll("${threadId}")`);
    const messages = (await runThreadPoll(threadId))
      .map(formatMessage);

    try {
      // Log response
      await logEvent(
        req.user ? req.user.id : req.ip,
        messages[messages.length - 1]?.content || 'Empty response',
        threadId,
        LogTypes.RESPONSE
      );
    } catch (logErr) {
      logger.error(`Failed to log response event: ${logErr.message}`);
    }

    res
      .status(constants.HTTP_STATUS_OK)
      .json({ messages });

  } catch (error) {
    next(error);
  }
}

/*
 * Handlers for path: /api/
 */

/**
 * Posts a new user prompt to the thread and runs it.
 *
 * Accepts: { content: string }
 */
api.post(
  '/ask-assistant',
  getThreadId,
  moderateRequest,
  addMessage,
  setThreadId,
  askAssistant
);

/**
 * Queries for the current thread's messages
 */
api.get(
  '/thread/messages',
  getThreadId,
  getThreadMessages
);

api.get('/ip', (request, response) => response.send(request.ip))

module.exports = api;
