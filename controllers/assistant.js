const openai = require('../config/openai');
const logger = require('../config/logger');
const Thread = require('../models/thread');
const Run = require('../models/run');
const { OPEN_AI_ASSISTANT_ID, OPEN_AI_MAX_PROMPT_TOKENS } = process.env;

let assistant = null;

async function retrieveAssistant() {
  if (!assistant) {
    assistant = await openai.beta.assistants.retrieve(OPEN_AI_ASSISTANT_ID);

    if (!assistant) {
      throw `Could not find Assistant: ${OPEN_AI_ASSISTANT_ID}`;
    }
  }

  return assistant;
}

/**
 * Retrieves messages for a thread and returns them in chronological order as an array.
 *
 * @param {string} threadId
 * @return {Promise<Message[]>}
 */
async function retrieveThreadMessages(threadId) {
  if (!threadId) {
    return [];
  }

  try {
    const messagesPage = await openai.beta.threads.messages.list(threadId);

    if (!messagesPage) {
      logger.error(`Could not find MessagesPage from Thread: ${threadId}`);
      return [];
    }

    return messagesPage.data.reverse();

  } catch (error) {
    logger.error(`Error retrieving MessagesPage for Thread: ${threadId}. Error: ${error.message}`);
    return [];
  }
}

async function createThread() {
  try {
    return await openai.beta.threads.create();

  } catch (error) {
    logger.error(`Error creating Thread. Error: ${error.message}`);
    return null;
  }
}

async function retrieveThread(threadId, includeMessages = false) {
  let thread;

  try {
    if (threadId) {
      thread = await openai.beta.threads.retrieve(threadId);

      if (!thread) {
        logger.error(`Could not find Thread: ${threadId}`);
        return null;
      }
    } else {
      thread = await createThread();
    }

    if (includeMessages) {
      thread.messages = await retrieveThreadMessages(threadId);
    }

    return thread;

  } catch (error) {
    logger.error(`Error retrieving Thread: ${threadId}. Error: ${error.message}`);
    return null;
  }
}

async function deleteThread(threadId) {
  try {
    const result = await openai.beta.threads.del(threadId);

    return result.deleted;

  } catch (error) {
    logger.error(`Error deleting Thread: ${threadId}. Error: ${error.message}`);
    return false;
  }
}

async function addThreadMessage(threadId, content) {
  try {
    const thread = await retrieveThread(threadId);
    const body = { role: 'user', content };

    // update if we created a thread.
    threadId = thread.id;

    await openai.beta.threads.messages.create(threadId, body);

  } catch (error) {
    logger.error(`Error adding message to Thread: ${threadId}. Error: ${error.message}`);
  }

  return threadId;
}

async function creteRunDoc(run) {
  const thread = await retrieveThread(run.thread_id);
  logger.info(`Thread: ${thread}`);

  const runDoc = {
    runId: run.id,
    run: { ...run, thread }
  };

  await Run.create(runDoc);
}

/**
 *
 * @param threadId
 * @return {Promise<ChatCompletionSnapshot.Choice.Message[]>}
 */
async function runThreadPoll(threadId) {
  const run = await openai.beta.threads.runs.createAndPoll(
    threadId,
    {
      assistant_id: OPEN_AI_ASSISTANT_ID,
      // max_prompt_tokens: parseInt(OPEN_AI_MAX_PROMPT_TOKENS, 10)
    }
  );

  logger.info(`run status: ${run.status}`);
  // TODO: Fix/rethink logging await creteRunDoc(run);

  /*
    queued, in_progress, requires_action, cancelling, cancelled, failed, completed, or expired
  */
  if (run.status === 'completed') {
    return retrieveThreadMessages(run.thread_id);

  } else if (run.last_error) {
    const error = new Error(`${run.last_error.code}: ${run.last_error.message}`);
    logger.error(JSON.stringify(error));

    throw error;

  } else {
    return [];
  }
}

module.exports = { addThreadMessage, retrieveThreadMessages, runThreadPoll };
