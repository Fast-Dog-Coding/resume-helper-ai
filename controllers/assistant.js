const { OpenAI } = require('openai');
const logger = require('../config/logger');
const Thread = require('../models/Thread');
const { buildContext } = require('../config/context');
const { parseOpenRouterModels } = require('../config/openRouterModels');

const models = parseOpenRouterModels();

/**
 * OpenRouter Chat Completions parameters.
 * `models` is the OpenRouter fallback list. It is not on the OpenAI type, and
 * SDK 7 still JSON-encodes it on the request body.
 *
 * @typedef {import('openai').OpenAI.ChatCompletionCreateParamsNonStreaming & { models?: string[] }} OpenRouterChatParams
 */

/**
 * Build the OpenAI SDK 7 client used for OpenRouter Chat Completions.
 * The SDK calls the runtime fetch implementation. Pass `fetch` in tests so
 * the real client runs against a mocked HTTP response.
 * Undefined header values are omitted by the SDK.
 *
 * @param {import('openai').ClientOptions} [options]
 * @returns {OpenAI}
 */
function createClient(options = {}) {
  const { defaultHeaders, ...rest } = options;

  return new OpenAI({
    baseURL: process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1',
    apiKey: process.env.OPENROUTER_API_KEY,
    ...rest,
    defaultHeaders: {
      'HTTP-Referer': process.env.APP_HTTP_REFERER,
      'X-Title': process.env.APP_TITLE,
      ...defaultHeaders
    }
  });
}

/** @type {OpenAI} */
const openai = createClient();

/**
 * @param {string} threadId
 * @param {string} newContent
 * @param {{ ThreadModel?: { findOne: Function }, client?: OpenAI }} [deps]
 *        Optional stand-ins for the thread model and completion client.
 * @returns {Promise<Array<{ role: string, content: string }>>}
 * @throws {import('openai').APIError}
 *         HTTP failures from OpenRouter. Subclasses such as AuthenticationError,
 *         BadRequestError, RateLimitError, and InternalServerError keep
 *         `error.status`, which the Express error handler uses for 4xx vs 5xx.
 *         The chat path is not streamed.
 */
async function processChat(threadId, newContent, deps = {}) {
  const ThreadModel = deps.ThreadModel || Thread;
  const client = deps.client || openai;

  try {
    // 1. Fetch from Mongo or Create new Thread
    let thread = await ThreadModel.findOne({ threadId });
    if (!thread) {
      const resumeContext = await buildContext();
      thread = new Thread({
        threadId,
        messages: [{ role: 'system', content: resumeContext }]
      });
    }

    // 2. Append the new User message
    thread.messages.push({ role: 'user', content: newContent });

    // 3. Fire stateless Completion to OpenRouter (with Cached System Prompt)
    /** @type {OpenRouterChatParams} */
    const request = {
      model: models[0],
      models,
      messages: thread.messages.map(m => ({ role: m.role, content: m.content }))
    };
    const completion = await client.chat.completions.create(request);

    // 4. Capture the AI Response and append it
    const aiResponse = completion.choices[0].message.content;
    thread.messages.push({ role: 'assistant', content: aiResponse });

    // 5. Save the history to Mongo and return
    await thread.save();

    // Return the array to the frontend, but hide the massive System prompt block
    return thread.messages.filter(m => m.role !== 'system');

  } catch (error) {
    // OpenAI SDK APIError subclasses are rethrown unchanged. Express reads
    // error.status to choose 4xx vs 5xx and only publishes 4xx messages.
    logger.error(`Error in processChat: ${error.message}`);
    throw error;
  }
}

module.exports = { processChat, createClient };
