const OpenAI = require('openai');
const logger = require('../config/logger');
const Thread = require('../models/Thread');
const { buildContext } = require('../config/context');

const models = JSON.parse(process.env.OPENROUTER_MODELS || '[google/gemini-1.5-pro]');

const openai = new OpenAI({
  baseURL: process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
  defaultHeaders: {
    "HTTP-Referer": process.env.APP_HTTP_REFERER,
    "X-Title": process.env.APP_TITLE,
  }
});

async function processChat(threadId, newContent) {
  try {
    // 1. Fetch from Mongo or Create new Thread
    let thread = await Thread.findOne({ threadId });
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
    const completion = await openai.chat.completions.create({
      model: models[0],
      models: models,
      messages: thread.messages.map(m => ({ role: m.role, content: m.content }))
    });

    // 4. Capture the AI Response and append it
    const aiResponse = completion.choices[0].message.content;
    thread.messages.push({ role: 'assistant', content: aiResponse });

    // 5. Save the history to Mongo and return
    await thread.save();

    // Return the array to the frontend, but hide the massive System prompt block
    return thread.messages.filter(m => m.role !== 'system');

  } catch (error) {
    logger.error(`Error in processChat: ${error.message}`);
    throw error; // Let the Express error handler catch it
  }
}

module.exports = { processChat };
