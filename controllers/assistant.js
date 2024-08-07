const openai = require('../config/openai');
const logger = require('../config/logger');
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
 * @return {Promise<Thread>} - The Thread with messages if applicable
 */
async function addMessagesToThread(thread) {
  if (thread?.id) {
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
  logger.debug('inside retrieveThread()');
  let thread;

  try {
    if (threadId) {
      thread = await openai.beta.threads.retrieve(threadId);

      if (!thread) {
        throw new Error(`Could not find Thread: ${threadId}`);
      }
    } else {
      thread = await createThread();
    }

    if (includeMessages) {
      return await addMessagesToThread(thread);
    }

    return thread;

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
  logger.debug('inside addThreadMessage()');
  try {
    const thread = await retrieveThread(threadId);
    logger.debug(`thread: ${JSON.stringify(thread)}`);

    // update if we created a thread.
    if (thread) {
      threadId = thread.id;
      const body = { role: 'user', content };
      await openai.beta.threads.messages.create(threadId, body);
    }
  } catch (error) {
    logger.error(`Error adding message to Thread: ${threadId}. Error: ${error.message}`);
  }

  return threadId;
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
