const openai = require('../config/openai');
const logger = require('../config/logger');
const Run = require('../models/run');
const { OPEN_AI_ASSISTANT_ID } = process.env;

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

    if (!messagesPage || !messagesPage.data) {
      logger.error(`Could not find MessagesPage from Thread: ${threadId}`);
      return [];
    }

    return messagesPage.data.reverse();

  } catch (error) {
    logger.error(`Error retrieving MessagesPage for Thread: ${threadId}. Error: ${error.message}`);
    return [];
  }
}

/**
 * Creates a new OpenAI Thread and returns it.
 *
 * @return {Promise<Thread|null>}
 */
async function createThread() {
  try {
    return await openai.beta.threads.create();

  } catch (error) {
    logger.error(`Error creating Thread. Error: ${error.message}`);
    return null;
  }
}

/**
 * Adds messages to a thread if the includeMessages flag is true.
 *
 * @param {Thread} thread - The Thread object
 * @param {boolean} includeMessages - flag to include the Thread's Messages.
 * @return {Promise<Thread>} - The Thread with messages if applicable
 */
async function addMessagesToThread(thread, includeMessages) {
  if (includeMessages && thread.id) {
    thread.messages = await retrieveThreadMessages(thread.id);
  }
  return thread;
}

/**
 * Attempts to retrieve the OpenAI Thread (by its threadId.) If threadId is
 * undefined, creates a new Thread. Optionally attempts to add the Thread's
 * Messages to it.
 *
 * @param {string|undefined} threadId - The id of the Thread
 * @param {boolean} [includeMessages=false] - flag to include the Thread's Messages.
 * @return {Promise<Thread|null>} - The Thread (or null, if there was an error.)
 */
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

    return addMessagesToThread(thread, includeMessages);

  } catch (error) {
    logger.error(`Error retrieving Thread: ${threadId}. Error: ${error.message}`);
    return null;
  }
}

/**
 * Appends a user Message to the thread (existing or new.)

 * @param {string} threadId - The id of the Thread
 * @param {string} content - The text of the message
 * @return {Promise<string>} - The Thread's id (could be a new Thread
 */
async function addThreadMessage(threadId, content) {
  try {
    const thread = await retrieveThread(threadId);
    const body = { role: 'user', content };

    // update if we created a thread.
    if (thread) {
      threadId = thread.id;
      await openai.beta.threads.messages.create(threadId, body);
    }
  } catch (error) {
    logger.error(`Error adding message to Thread: ${threadId}. Error: ${error.message}`);
  }

  return threadId;
}

async function createRunDoc(run) {
  const thread = await retrieveThread(run.thread_id, true);

  const runDoc = {
    runId: run.id,
    run: { ...run, thread }
  };

  await Run.create(runDoc);
}

/**
 * Runs the Thread with the assistant. Returns the Messages.
 *
 * @param threadId
 * @return {Promise<import('openai').ChatCompletionSnapshot.Choice.Message[]>}
 */
async function runThreadPoll(threadId) {
  const run = await openai.beta.threads.runs.createAndPoll(
    threadId,
    {
      assistant_id: OPEN_AI_ASSISTANT_ID,
      // max_prompt_tokens: parseInt(OPEN_AI_MAX_PROMPT_TOKENS, 10)
    }
  );

  if (!run) {
    throw new Error('Run could not be created or polled.');
  }

  logger.info(`run status: ${run.status}`);
  // TODO: Fix/rethink logging await createRunDoc(run);

  /*
    status values: queued, in_progress, requires_action, cancelling, cancelled,
                   failed, completed, or expired
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
