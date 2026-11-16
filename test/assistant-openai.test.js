const { after, before, beforeEach, describe, test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');

// Production keeps Winston off the console. The chat client is constructed
// when the app loads, so the mock fetch has to be installed first.
// The app does not stream tokens. These tests cover the JSON completion and
// HTTP errors, and they assert the request does not set stream.
process.env.NODE_ENV = 'production';
process.env.LOG_LEVEL = 'error';
process.env.LOG_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'concierge-openai-'));
process.env.APP_HTTP_REFERER = 'https://concierge.example.test';
process.env.APP_TITLE = 'Candidate Concierge Test';
process.env.MONGODB_DB_NAME = 'candidate-concierge-test';
process.env.RESUME_API_KEY = 'resume-test-key';
process.env.RESUME_SERVICE_URL = 'https://resume.example.test';
process.env.COOKIE_ENCRYPTION_KEY = '0123456789abcdef'.repeat(4);
process.env.OPENROUTER_API_KEY = 'sk-test-openai-v7-fixture';
process.env.OPENROUTER_BASE_URL = 'https://openrouter.example/api/v1';
process.env.OPENROUTER_MODELS = '["google/gemini-3.5-flash-lite","fixture/fallback-model"]';
process.env.RATE_LIMIT_AMOUNT = '100';
process.env.RATE_LIMIT_WINDOW_MS = '60000';
process.env.RATE_LIMIT_PROXY = '1';
delete process.env.MONGODB_CONNECTION;

const FIXTURE_KEY = 'sk-test-openai-v7-fixture';
const CHAT_URL = 'https://openrouter.example/api/v1/chat/completions';
const ASSISTANT_TEXT = 'Northwater shipped Harbor Notes.';
const SYSTEM_PROMPT = 'You are Rio, the concierge for a fictional candidate.';

const requests = [];

/**
 * @type {(url: string, init: RequestInit) => Promise<Response>}
 */
let respond = async () => {
  throw new Error('chat fetch responder was not set');
};

global.fetch = async (url, init) => {
  requests.push({ url: String(url), init });
  return respond(String(url), init);
};

const logger = require('../config/logger');
process.env.MONGODB_CONNECTION = 'mongodb://127.0.0.1:9/candidate-concierge-test';

const mongoose = require('mongoose');
mongoose.connect = async () => mongoose;

const app = require('../app');
const Thread = require('../models/Thread');
const { APIError, AuthenticationError, InternalServerError } = require('openai');
const { createClient, processChat } = require('../controllers/assistant');

function completionResponse(content) {
  return new Response(JSON.stringify({
    id: 'chatcmpl-fixture',
    object: 'chat.completion',
    created: 1700000000,
    model: 'google/gemini-3.5-flash-lite',
    choices: [
      {
        index: 0,
        message: { role: 'assistant', content },
        finish_reason: 'stop'
      }
    ]
  }), {
    status: 200,
    headers: { 'content-type': 'application/json' }
  });
}

function errorResponse(status, message, type) {
  return new Response(JSON.stringify({
    error: { message, type, code: type }
  }), {
    status,
    headers: { 'content-type': 'application/json' }
  });
}

function requestJson(baseUrl, body) {
  const payload = JSON.stringify(body);
  const url = new URL('/api/ask-assistant', baseUrl);

  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'content-length': Buffer.byteLength(payload)
      }
    }, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        const raw = Buffer.concat(chunks).toString('utf8');
        resolve({
          status: res.statusCode,
          headers: res.headers,
          raw,
          json: JSON.parse(raw)
        });
      });
    });
    req.on('error', reject);
    req.end(payload);
  });
}

function bodyText(body) {
  if (typeof body === 'string') {
    return body;
  }
  if (Buffer.isBuffer(body)) {
    return body.toString('utf8');
  }
  if (body instanceof Uint8Array) {
    return Buffer.from(body).toString('utf8');
  }
  throw new Error('Chat request body was not text');
}

function assertFixtureAuthorization(headers) {
  const authorization = headers.get('authorization');
  if (authorization !== `Bearer ${FIXTURE_KEY}`) {
    assert.fail('Authorization header was not the test fixture key');
  }
}

function chatRequestParts() {
  assert.equal(requests.length, 1);
  const call = requests[0];
  assert.equal(call.url, CHAT_URL);
  assert.equal(call.init.method, 'POST');
  const headers = new Headers(call.init.headers);
  assertFixtureAuthorization(headers);
  assert.equal(headers.get('http-referer'), 'https://concierge.example.test');
  assert.equal(headers.get('x-title'), 'Candidate Concierge Test');
  assert.equal(headers.get('content-type'), 'application/json');
  const body = JSON.parse(bodyText(call.init.body));
  assert.equal(body.stream, undefined);
  return body;
}

function storedThread() {
  return {
    messages: [{ role: 'system', content: SYSTEM_PROMPT }],
    saved: false,
    async save() {
      this.saved = true;
    }
  };
}

describe('OpenAI SDK 7 chat path', { concurrency: false }, () => {
  /** @type {http.Server} */
  let server;
  let baseUrl;

  before(async () => {
    server = http.createServer(app);
    await new Promise((resolve) => {
      server.listen(0, '127.0.0.1', resolve);
    });
    const address = server.address();
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  beforeEach(() => {
    requests.length = 0;
    delete Thread.findOne;
  });

  after(async () => {
    delete Thread.findOne;
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
    logger.close();
  });

  test('returns the same message list from a mocked chat completion', async () => {
    const thread = storedThread();
    Thread.findOne = async () => thread;
    respond = async () => completionResponse(ASSISTANT_TEXT);

    const response = await requestJson(baseUrl, { content: 'What did Northwater ship?' });
    const body = chatRequestParts();

    assert.equal(response.status, 200);
    assert.match(response.headers['content-type'], /^application\/json/);
    assert.deepEqual(response.json, {
      messages: [
        { role: 'user', content: 'What did Northwater ship?' },
        { role: 'assistant', content: ASSISTANT_TEXT }
      ]
    });
    assert.equal(JSON.stringify(response.json).includes(SYSTEM_PROMPT), false);
    assert.equal(body.model, 'google/gemini-3.5-flash-lite');
    assert.deepEqual(body.models, ['google/gemini-3.5-flash-lite', 'fixture/fallback-model']);
    assert.deepEqual(body.messages, [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: 'What did Northwater ship?' }
    ]);
    assert.equal(thread.saved, true);
  });

  test('passes an OpenRouter authentication error through as a 401', async () => {
    const thread = storedThread();
    Thread.findOne = async () => thread;
    respond = async () => errorResponse(401, 'Invalid API key', 'authentication_error');

    const response = await requestJson(baseUrl, { content: 'Who led Northwater?' });

    assert.equal(requests.length, 1);
    assert.equal(requests[0].url, CHAT_URL);
    assert.equal(response.status, 401);
    assert.match(response.headers['content-type'], /^application\/json/);
    assert.deepEqual(response.json, { error: '401 Invalid API key' });
    assert.equal(response.raw.includes(FIXTURE_KEY), false);
    assert.equal(response.raw.includes('<pre>'), false);
    assert.equal(thread.saved, false);
  });

  test('rethrows SDK 7 API errors without saving the thread', async () => {
    const thread = storedThread();
    const client = createClient({
      maxRetries: 0,
      fetch: async () => errorResponse(500, 'upstream secret detail', 'server_error')
    });

    await assert.rejects(
      () => processChat('thread-northwater', 'What did Northwater ship?', {
        ThreadModel: {
          async findOne() {
            return thread;
          }
        },
        client
      }),
      (error) => {
        assert.ok(error instanceof InternalServerError);
        assert.ok(error instanceof APIError);
        assert.equal(error.status, 500);
        assert.equal(error.message, '500 upstream secret detail');
        assert.equal(thread.saved, false);
        assert.equal(error instanceof AuthenticationError, false);
        return true;
      }
    );
  });
});
