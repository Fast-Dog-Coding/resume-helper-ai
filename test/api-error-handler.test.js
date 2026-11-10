const { after, afterEach, before, beforeEach, describe, mock, test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');

// Winston adds a console transport outside production, which would also print
// upstream errors. Production here keeps console.error reserved for the handler.
process.env.NODE_ENV = 'production';
process.env.LOG_LEVEL = 'error';
process.env.LOG_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'concierge-logs-'));
process.env.APP_HTTP_REFERER = 'https://concierge.example.test';
process.env.APP_TITLE = 'Candidate Concierge Test';
process.env.MONGODB_DB_NAME = 'candidate-concierge-test';
process.env.RESUME_API_KEY = 'resume-test-key';
process.env.RESUME_SERVICE_URL = 'https://resume.example.test';
process.env.COOKIE_ENCRYPTION_KEY = '0123456789abcdef'.repeat(4);
process.env.OPENROUTER_API_KEY = 'sk-test-northwater-fixture';
process.env.OPENROUTER_BASE_URL = 'https://openrouter.example/api/v1';
process.env.OPENROUTER_MODELS = '["fixture/model"]';
process.env.RATE_LIMIT_AMOUNT = '100';
process.env.RATE_LIMIT_WINDOW_MS = '60000';
process.env.RATE_LIMIT_PROXY = '1';
delete process.env.MONGODB_CONNECTION;

const logger = require('../config/logger');
process.env.MONGODB_CONNECTION = 'mongodb://127.0.0.1:9/candidate-concierge-test';

const mongoose = require('mongoose');
const connectOk = async () => mongoose;
mongoose.connect = connectOk;

const app = require('../app');
const Thread = require('../models/Thread');
const Config = require('../models/Config');
const { clearResumeCache } = require('../config/context');

const UPSTREAM_BODY = '<html>UPSTREAM-SECRET-BODY';
const GENERIC_ERROR = 'Internal server error';

function request(baseUrl, { method = 'POST', path: requestPath = '/api/ask-assistant', body, headers = {} }) {
  const payload = body === undefined ? null : Buffer.from(body);
  const url = new URL(requestPath, baseUrl);

  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: url.hostname,
      port: url.port,
      path: `${url.pathname}${url.search}`,
      method,
      headers: {
        ...headers,
        ...(payload ? { 'content-length': payload.length } : {})
      }
    }, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        const raw = Buffer.concat(chunks).toString('utf8');
        let json;
        try {
          json = JSON.parse(raw);
        } catch {
          json = undefined;
        }
        resolve({ status: res.statusCode, headers: res.headers, raw, json });
      });
    });
    req.on('error', reject);
    req.end(payload || undefined);
  });
}

function installMalformedUpstream() {
  const fetchCalls = [];
  global.fetch = async (url) => {
    fetchCalls.push(String(url));
    return new Response(UPSTREAM_BODY, {
      status: 200,
      headers: { 'content-type': 'text/html' }
    });
  };
  Config.findOne = () => ({
    exec: async () => ({
      key: 'concierge_instructions',
      value: 'You are Rio, the concierge for a fictional candidate.'
    })
  });
  Thread.findOne = async () => null;
  return fetchCalls;
}

function loggedText(errorLog) {
  return errorLog.mock.calls
    .map((call) => call.arguments.map((arg) => String(arg)).join(' '))
    .join('\n');
}

function assertNoUpstreamFragment(raw) {
  assert.equal(raw.includes('<html>'), false);
  assert.equal(raw.includes('&lt;html&gt;'), false);
  assert.equal(raw.includes('UPSTREAM'), false);
  assert.equal(raw.includes('UPST'), false);
  assert.equal(raw.includes('Unexpected token'), false);
  assert.equal(raw.includes('not valid JSON'), false);
  assert.equal(raw.includes('SyntaxError'), false);
}

describe('API error handler', { concurrency: false }, () => {
  /** @type {http.Server} */
  let server;
  let baseUrl;
  const originalFetch = global.fetch;

  before(async () => {
    server = http.createServer(app);
    await new Promise((resolve) => {
      server.listen(0, '127.0.0.1', resolve);
    });
    const address = server.address();
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  beforeEach(() => {
    delete Thread.findOne;
    delete Config.findOne;
    clearResumeCache();
    global.fetch = originalFetch;
  });

  afterEach(() => {
    delete Thread.findOne;
    delete Config.findOne;
    clearResumeCache();
    global.fetch = originalFetch;
  });

  after(async () => {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
    logger.close();
  });

  test('hides a malformed successful upstream body behind a generic 500', async () => {
    const fetchCalls = installMalformedUpstream();
    const errorLog = mock.method(console, 'error', () => {});
    try {
      const response = await request(baseUrl, {
        body: JSON.stringify({ content: 'What did Northwater ship?' }),
        headers: { 'content-type': 'application/json' }
      });
      const logged = loggedText(errorLog);

      assert.deepEqual(fetchCalls, ['https://resume.example.test/v1/resume']);
      assert.equal(response.status, 500);
      assert.match(response.headers['content-type'], /^application\/json/);
      assert.deepEqual(response.json, { error: GENERIC_ERROR });
      assertNoUpstreamFragment(response.raw);
      assert.match(logged, /Unexpected token '<'/);
      assert.match(logged, /<html>UPST/);
      assert.match(logged, /not valid JSON/);
    } finally {
      errorLog.mock.restore();
    }
  });

  test('hides the upstream body for case-variant API paths', async () => {
    const fetchCalls = installMalformedUpstream();
    const errorLog = mock.method(console, 'error', () => {});
    try {
      for (const requestPath of ['/API/ask-assistant', '/Api/ask-assistant']) {
        clearResumeCache();
        const response = await request(baseUrl, {
          path: requestPath,
          body: JSON.stringify({ content: 'What did Northwater ship?' }),
          headers: { 'content-type': 'application/json' }
        });

        assert.equal(response.status, 500);
        assert.match(response.headers['content-type'], /^application\/json/);
        assert.deepEqual(response.json, { error: GENERIC_ERROR });
        assertNoUpstreamFragment(response.raw);
      }

      assert.deepEqual(fetchCalls, [
        'https://resume.example.test/v1/resume',
        'https://resume.example.test/v1/resume'
      ]);
      const logged = loggedText(errorLog);
      assert.match(logged, /Unexpected token '<'/);
      assert.match(logged, /<html>UPST/);
      assert.match(logged, /not valid JSON/);
    } finally {
      errorLog.mock.restore();
    }
  });

  test('keeps the given 5xx status and still hides the message', async () => {
    const secret = 'upstream secret detail from the provider';
    Thread.findOne = async () => {
      const error = new Error(secret);
      error.status = 502;
      throw error;
    };

    const errorLog = mock.method(console, 'error', () => {});
    try {
      const response = await request(baseUrl, {
        body: JSON.stringify({ content: 'Hello from Northwater' }),
        headers: { 'content-type': 'application/json' }
      });
      const logged = errorLog.mock.calls
        .map((call) => call.arguments.map((arg) => String(arg)).join(' '))
        .join('\n');

      assert.equal(response.status, 502);
      assert.deepEqual(response.json, { error: GENERIC_ERROR });
      assert.equal(response.raw.includes(secret), false);
      assert.match(logged, /upstream secret detail from the provider/);
    } finally {
      errorLog.mock.restore();
    }
  });

  test('passes 4xx error messages through, including moderation text', async () => {
    const moderationMessage = 'Request violated moderation policies';
    Thread.findOne = async () => {
      const error = new Error(moderationMessage);
      error.status = 400;
      throw error;
    };

    const moderation = await request(baseUrl, {
      body: JSON.stringify({ content: 'Hello from Northwater' }),
      headers: { 'content-type': 'application/json' }
    });
    assert.equal(moderation.status, 400);
    assert.deepEqual(moderation.json, { error: moderationMessage });
    assert.equal(moderationMessage.includes('violated moderation policies'), true);

    const missing = await request(baseUrl, {
      method: 'GET',
      path: '/api/not-a-route'
    });
    assert.equal(missing.status, 404);
    assert.deepEqual(missing.json, { error: 'Not Found' });

    const missingVariant = await request(baseUrl, {
      method: 'GET',
      path: '/API/not-a-route'
    });
    assert.equal(missingVariant.status, 404);
    assert.deepEqual(missingVariant.json, { error: 'Not Found' });

    const outsideTheMount = await request(baseUrl, {
      method: 'GET',
      path: '/apiv2/ask-assistant'
    });
    assert.equal(outsideTheMount.status, 404);
    assert.match(outsideTheMount.headers['content-type'], /^text\/html/);
    assert.match(outsideTheMount.raw, /<h1>Not Found<\/h1>/);
    assert.equal(outsideTheMount.raw.includes('<pre>'), false);
  });

  test('passes express.json malformed-body errors through as 400', async () => {
    const parserError = "Expected property name or '}' in JSON at position 1 (line 1 column 2)";
    for (const requestPath of ['/api/ask-assistant', '/API/ask-assistant', '/Api/ask-assistant']) {
      const response = await request(baseUrl, {
        path: requestPath,
        body: '{',
        headers: { 'content-type': 'application/json' }
      });

      assert.equal(response.status, 400);
      assert.match(response.headers['content-type'], /^application\/json/);
      assert.deepEqual(response.json, { error: parserError });
    }
  });

  test('HTML server errors omit the raw message and the stack', async () => {
    const secret = 'raw-upstream-excerpt-<html>UPST';
    global.mongoose.conn = null;
    global.mongoose.promise = null;
    mongoose.connect = async () => {
      throw new Error(secret);
    };

    const errorLog = mock.method(console, 'error', () => {});
    try {
      const response = await request(baseUrl, { method: 'GET', path: '/privacy' });
      const logged = loggedText(errorLog);

      assert.equal(response.status, 500);
      assert.match(response.headers['content-type'], /^text\/html/);
      assert.match(response.raw, /<h1>Internal server error<\/h1>/);
      assert.match(response.raw, /<h2>500<\/h2>/);
      assert.equal(response.raw.includes(secret), false);
      assert.equal(response.raw.includes('raw-upstream-excerpt'), false);
      assert.equal(response.raw.includes('&lt;html&gt;'), false);
      assert.equal(response.raw.includes('UPST'), false);
      assert.equal(response.raw.includes('<pre>'), false);
      assert.equal(response.raw.includes('api-error-handler.test.js'), false);
      assert.match(logged, /raw-upstream-excerpt/);
    } finally {
      errorLog.mock.restore();
      mongoose.connect = connectOk;
      global.mongoose.conn = null;
      global.mongoose.promise = null;
    }
  });

  test('HTML 4xx pages keep their message and stay free of a stack', async () => {
    const response = await request(baseUrl, { method: 'GET', path: '/no-such-page' });

    assert.equal(response.status, 404);
    assert.match(response.headers['content-type'], /^text\/html/);
    assert.match(response.raw, /<h1>Not Found<\/h1>/);
    assert.match(response.raw, /<h2>404<\/h2>/);
    assert.equal(response.raw.includes('<pre>'), false);
  });

  test('development HTML errors may show the stack, and the heading stays generic', async () => {
    const secret = 'dev-stack-only-raw-upstream-excerpt';
    const previousEnv = app.get('env');
    app.set('env', 'development');
    global.mongoose.conn = null;
    global.mongoose.promise = null;
    mongoose.connect = async () => {
      throw new Error(secret);
    };

    const errorLog = mock.method(console, 'error', () => {});
    try {
      const response = await request(baseUrl, { method: 'GET', path: '/privacy' });

      assert.equal(response.status, 500);
      assert.match(response.raw, /<h1>Internal server error<\/h1>/);
      assert.match(response.raw, /<pre>[\s\S]*dev-stack-only-raw-upstream-excerpt/);
      assert.match(loggedText(errorLog), /dev-stack-only-raw-upstream-excerpt/);
    } finally {
      errorLog.mock.restore();
      app.set('env', previousEnv);
      mongoose.connect = connectOk;
      global.mongoose.conn = null;
      global.mongoose.promise = null;
    }
  });
});
