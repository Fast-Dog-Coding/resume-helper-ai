const express = require('express');
const api = express.Router();
const { getThreadId, setThreadId } = require('../middleware');
const { processChat } = require('../controllers/assistant');
const logger = require('../config/logger');

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
  setThreadId,
  async (req, res, next) => {
    try {
      const content = req.body ? req.body.content : undefined;

      if (typeof content !== 'string' || content.trim().length === 0) {
        return res.status(400).json({ error: 'Message content is required.' });
      }

      if (content.length > 8000) {
        return res.status(400).json({ error: 'Message exceeds maximum length of 8000 characters.' });
      }

      const threadId = req.threadId;

      // 1. Process the entire chat flow in one line
      const messages = await processChat(threadId, content);

      // 2. Format the response for the frontend
      const formattedMessages = messages.map(m => ({
        role: m.role,
        content: m.content
      }));

      res.status(200).json({ messages: formattedMessages });
    } catch (error) {
      next(error);
    }
  }
);

api.get(
  '/thread/messages',
  getThreadId,
  async (req, res, next) => {
    try {
      if (!req.threadId) {
        return res.status(200).json({ messages: [] });
      }
      const Thread = require('../models/Thread');
      const thread = await Thread.findOne({ threadId: req.threadId });
      if (!thread) {
        return res.status(200).json({ messages: [] });
      }

      const formattedMessages = thread.messages
        .filter(m => m.role !== 'system')
        .map(m => ({ role: m.role, content: m.content }));

      res.status(200).json({ messages: formattedMessages });
    } catch (e) {
      next(e);
    }
  }
);

api.delete('/thread', (req, res) => {
  res.clearCookie('threadId');
  res.status(200).json({ success: true });
});

api.get('/ip', (request, response) => response.send(request.ip))

module.exports = api;
