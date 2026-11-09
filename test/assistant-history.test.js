const { after, describe, test } = require('node:test');
const assert = require('node:assert/strict');

process.env.OPENROUTER_MODELS = '["google/gemini-3.5-flash-lite","fixture/fallback-model"]';
process.env.OPENROUTER_API_KEY = 'sk-test-fixture';
process.env.OPENROUTER_BASE_URL = 'https://openrouter.example/api/v1';
process.env.NODE_ENV = 'test';
delete process.env.MONGODB_CONNECTION;

const { processChat } = require('../controllers/assistant');
const logger = require('../config/logger');

describe('processChat completion request', () => {
  after(() => {
    logger.close();
  });

  test('sends prior multi-turn history to the completion request unchanged', async () => {
    const history = [
      { role: 'system', content: 'You are Rio, the concierge for a fictional candidate.' },
      { role: 'user', content: 'What did Northwater ship?' },
      { role: 'assistant', content: 'Northwater shipped Harbor Notes, a fictional notes app.' }
    ];
    const thread = {
      messages: history.map((message) => ({ ...message })),
      async save() {}
    };
    const requests = [];
    const client = {
      chat: {
        completions: {
          async create(body) {
            requests.push(body);
            return {
              choices: [{ message: { role: 'assistant', content: 'Alex Morgan led the fixture.' } }]
            };
          }
        }
      }
    };

    await processChat('thread-northwater', 'Who led it?', {
      ThreadModel: {
        async findOne(query) {
          assert.deepEqual(query, { threadId: 'thread-northwater' });
          return thread;
        }
      },
      client
    });

    assert.equal(requests.length, 1);
    assert.deepEqual(requests[0].messages, [
      ...history,
      { role: 'user', content: 'Who led it?' }
    ]);
    assert.equal(requests[0].model, 'google/gemini-3.5-flash-lite');
    assert.deepEqual(requests[0].models, ['google/gemini-3.5-flash-lite', 'fixture/fallback-model']);
  });
});
