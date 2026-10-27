const { after, before, describe, test } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const express = require('express');
const cookieParser = require('cookie-parser');

process.env.COOKIE_ENCRYPTION_KEY = '0123456789abcdef'.repeat(4);
process.env.OPENROUTER_MODELS = '["fixture/model"]';
process.env.OPENROUTER_API_KEY = 'sk-test-northwater-fixture';
process.env.OPENROUTER_BASE_URL = 'https://openrouter.example/api/v1';
process.env.NODE_ENV = 'test';
delete process.env.MONGODB_CONNECTION;

const api = require('../routes/api');
const logger = require('../config/logger');

function postJson(baseUrl, body) {
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
        resolve({ status: res.statusCode, json: JSON.parse(raw) });
      });
    });
    req.on('error', reject);
    req.end(payload);
  });
}

describe('POST /api/ask-assistant input validation', () => {
  /** @type {http.Server} */
  let server;
  let baseUrl;

  before(async () => {
    const app = express();
    app.use(express.json());
    app.use(cookieParser());
    app.use('/api', api);
    server = http.createServer(app);
    await new Promise((resolve) => {
      server.listen(0, '127.0.0.1', resolve);
    });
    const address = server.address();
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  after(async () => {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
    logger.close();
  });

  test('rejects missing, non-string, and whitespace-only content', async () => {
    const cases = [
      {},
      { content: null },
      { content: 42 },
      { content: { text: 'hello' } },
      { content: '   \n\t  ' },
      { content: ' '.repeat(8001) }
    ];

    for (const body of cases) {
      const response = await postJson(baseUrl, body);
      assert.equal(response.status, 400);
      assert.deepEqual(response.json, { error: 'Message content is required.' });
    }
  });

  test('rejects content longer than 8000 characters', async () => {
    const response = await postJson(baseUrl, { content: `a${'b'.repeat(8000)}` });
    assert.equal(response.status, 400);
    assert.deepEqual(response.json, { error: 'Message exceeds maximum length of 8000 characters.' });
  });
});
