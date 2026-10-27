const { afterEach, describe, test } = require('node:test');
const assert = require('node:assert/strict');

const {
  DEFAULT_RESUME_SERVICE_URL,
  getResume
} = require('@fastdogcoding/resume-master');

const API_KEY = 'nw_test_key_alex_morgan';

describe('getResume', { concurrency: false }, () => {
  const originalFetch = global.fetch;
  const originalServiceUrl = process.env.RESUME_SERVICE_URL;

  afterEach(() => {
    global.fetch = originalFetch;
    if (originalServiceUrl === undefined) {
      delete process.env.RESUME_SERVICE_URL;
    } else {
      process.env.RESUME_SERVICE_URL = originalServiceUrl;
    }
  });

  /**
   * @param {{ status?: number, body?: unknown, throwError?: Error }} [options]
   * @returns {{ calls: Array<{ url: string, init: RequestInit }> }}
   */
  function installFetch({ status = 200, body = { ok: true }, throwError } = {}) {
    const calls = [];
    global.fetch = async (url, init) => {
      calls.push({ url: String(url), init });
      if (throwError) {
        throw throwError;
      }
      return new Response(typeof body === 'string' ? body : JSON.stringify(body), {
        status,
        headers: { 'content-type': 'application/json' }
      });
    };
    return { calls };
  }

  function assertKeyAndBodyScrubbed(error) {
    assert.equal(error.message.includes(API_KEY), false);
    assert.equal(error.message.includes('super-secret-body'), false);
    assert.equal(error.message.includes('internal-debug'), false);
    assert.equal(error.cause, undefined);
  }

  test('uses DEFAULT_RESUME_SERVICE_URL when baseUrl and RESUME_SERVICE_URL are unset', async () => {
    delete process.env.RESUME_SERVICE_URL;
    const { calls } = installFetch({ body: { basics: { name: 'Alex Morgan' } } });

    const result = await getResume(API_KEY);

    assert.equal(DEFAULT_RESUME_SERVICE_URL, 'https://resume-master-nu.vercel.app');
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, `${DEFAULT_RESUME_SERVICE_URL}/v1/resume`);
    assert.equal(calls[0].init.method, 'POST');
    assert.equal(calls[0].init.headers.Authorization, `Bearer ${API_KEY}`);
    assert.equal(calls[0].init.headers.Accept, 'application/json');
    assert.equal(calls[0].init.headers['Content-Type'], 'application/json');
    assert.deepEqual(JSON.parse(calls[0].init.body), {});
    assert.equal(Object.hasOwn(JSON.parse(calls[0].init.body), 'asOf'), false);
    assert.deepEqual(result, { basics: { name: 'Alex Morgan' } });
  });

  test('honors RESUME_SERVICE_URL and lets an explicit baseUrl win', async () => {
    process.env.RESUME_SERVICE_URL = 'https://env.northwater.example';
    const { calls } = installFetch();

    await getResume(API_KEY);
    await getResume(API_KEY, {}, 'https://explicit.northwater.example');
    await getResume(API_KEY, {}, '   ');
    await getResume(API_KEY, {}, 'https://slash.northwater.example/');

    assert.deepEqual(calls.map((call) => call.url), [
      'https://env.northwater.example/v1/resume',
      'https://explicit.northwater.example/v1/resume',
      'https://env.northwater.example/v1/resume',
      'https://slash.northwater.example/v1/resume'
    ]);
  });

  test('POSTs /v1/resume with the bearer token and omits asOf', async () => {
    delete process.env.RESUME_SERVICE_URL;
    const { calls } = installFetch();

    await getResume(API_KEY, {
      projectIds: ['harbor'],
      workIds: ['northwater'],
      keywords: ['node'],
      mode: 'strict',
      cutOffDate: '2018',
      asOf: '2026-01-01',
      extra: 'drop-me'
    }, 'https://resume.northwater.example');

    const body = JSON.parse(calls[0].init.body);
    assert.equal(calls[0].init.method, 'POST');
    assert.equal(calls[0].url, 'https://resume.northwater.example/v1/resume');
    assert.equal(calls[0].init.headers.Authorization, `Bearer ${API_KEY}`);
    assert.deepEqual(body, {
      projectIds: ['harbor'],
      workIds: ['northwater'],
      keywords: ['node'],
      mode: 'strict',
      cutOffDate: '2018'
    });
    assert.equal(Object.hasOwn(body, 'asOf'), false);
    assert.equal(Object.hasOwn(body, 'extra'), false);
  });

  test('sends cutOffDate when the property is present and drops a mode that is not strict or expand', async () => {
    const { calls } = installFetch();

    await getResume(API_KEY, { mode: 'loose', cutOffDate: null }, 'https://resume.northwater.example');

    assert.deepEqual(JSON.parse(calls[0].init.body), { cutOffDate: null });
  });

  test('rejects a missing api key before calling the network', async () => {
    const { calls } = installFetch();

    await assert.rejects(() => getResume(''), /getResume requires an apiKey/);
    await assert.rejects(() => getResume(), /getResume requires an apiKey/);
    await assert.rejects(() => getResume(42), /getResume requires an apiKey/);
    assert.equal(calls.length, 0);
  });

  test('scrubs the API key and response body from HTTP and network errors', async () => {
    const secretBody = {
      error: 'super-secret-body',
      detail: `leaked ${API_KEY}`,
      note: 'internal-debug'
    };

    installFetch({ status: 403, body: secretBody });
    await assert.rejects(() => getResume(API_KEY), (error) => {
      assert.equal(error.message, 'getResume failed with HTTP 403');
      assertKeyAndBodyScrubbed(error);
      return true;
    });

    installFetch({ status: 500, body: secretBody });
    await assert.rejects(() => getResume(API_KEY), (error) => {
      assert.equal(error.message, 'getResume failed with HTTP 500');
      assertKeyAndBodyScrubbed(error);
      return true;
    });

    installFetch({
      throwError: new Error(`connect ECONNREFUSED ${API_KEY} super-secret-body internal-debug`)
    });
    await assert.rejects(() => getResume(API_KEY), (error) => {
      assert.equal(error.message, 'getResume request failed');
      assertKeyAndBodyScrubbed(error);
      return true;
    });
  });
});
