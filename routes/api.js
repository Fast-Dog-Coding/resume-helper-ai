const express = require('express');
const { constants } = require('node:http2');
const api = express.Router();
const { addThreadMessage, retrieveThreadMessages, runThreadPoll } = require('../controllers/assistant');
const { getThreadId, setThreadId } = require('../middleware');
const logger = require('../config/logger');
const INTRODUCTION_MESSAGES = [
  { role: 'assistant', content: 'Welcome to **Grant\'s Resume Assistant** chatbot! You can ask me questions about a Grant Lindsay\'s resume or work experience, and I\'ll do my best to provide relevant information.'},
  { role: 'assistant', content: 'Feel free to start by asking a question. For example:\n\n**What does Grant do for work?** or\n\n**Please summarize Grant\'s skills.**'},
  { role: 'assistant', content: 'Also, you can list the skills you are in need of and then ask, "Would Grant be a good fit for this position?"'},
  { role: 'assistant', content: '**Please note** that this application uses beta services from OpenAI and can make mistakes, even giving wrong answers. Do not make decisions based on these responses without first confirming they are correct.'}
];

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
  const { body: { content } } = req;
  let { threadId } = req;

  try {
    threadId = await addThreadMessage(threadId, content);
    logger.info(`Added Message to Thread: ${threadId}, content: ${content}`);
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

    // if there are no messages (no such thread), send the introduction messages.
    if (messages.length < 1) {
      messages = INTRODUCTION_MESSAGES;
    }

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
  const { threadId } = req;

  try {
    const messages = (await runThreadPoll(threadId))
      .map(formatMessage);

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

module.exports = api;
