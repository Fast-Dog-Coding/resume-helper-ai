const { after, beforeEach, describe, test } = require('node:test');
const assert = require('node:assert/strict');
const logger = require('../config/logger');
const {
  STAR_QUERY,
  STAR_TITLE,
  buildContext,
  clearResumeCache,
  getCachedResume
} = require('../config/context');

const INSTRUCTIONS = 'You are Rio, the concierge for a fictional candidate. Answer only from the knowledge base.';

const PROJECTED = {
  meta: {
    clientId: 'northwater-internal',
    cutOffDate: '1991-04-01',
    projected: true
  },
  basics: {
    name: 'Alex Morgan',
    label: 'Systems Consultant',
    email: 'alex@northwater.example',
    url: 'https://northwater.example',
    workAuthorization: ['US']
  },
  work: [
    {
      id: 'northwater',
      name: 'Northwater Labs',
      kind: 'employer',
      startDate: '2019',
      summary: 'Fictional consultancy used only in unit tests.'
    }
  ],
  projects: [
    { id: 'harbor', name: 'Harbor Notes' }
  ]
};

const STAR_CONTENT = [
  'Situation: Northwater Labs needed a fictional launch story for tests.',
  'Task: Describe the work without using any real biography.',
  'Action: Shipped a fixture.',
  'Result: The unit test can see this STAR block.'
].join('\n');

function configModel(value, { rejectWith } = {}) {
  const calls = [];
  return {
    calls,
    findOne(query) {
      calls.push(query);
      return {
        exec: async () => {
          if (rejectWith) {
            throw rejectWith;
          }
          if (value === null) {
            return null;
          }
          return { key: 'concierge_instructions', value };
        }
      };
    }
  };
}

function knowledgeModel(starDoc) {
  const findOneCalls = [];
  return {
    findOneCalls,
    find() {
      throw new Error('Knowledge.find() must not be called');
    },
    findOne(query) {
      findOneCalls.push(query);
      return {
        exec: async () => starDoc
      };
    }
  };
}

describe('buildContext', () => {
  test('embeds the projected resume without meta and loads only the STAR document', async () => {
    const ConfigModel = configModel(INSTRUCTIONS);
    const KnowledgeModel = knowledgeModel({
      title: STAR_TITLE,
      keywords: ['star'],
      content: STAR_CONTENT
    });
    let resumeCalls = 0;

    const prompt = await buildContext({
      ConfigModel,
      KnowledgeModel,
      loadResume: async () => {
        resumeCalls += 1;
        return PROJECTED;
      }
    });

    assert.equal(resumeCalls, 1);
    assert.deepEqual(ConfigModel.calls, [{ key: 'concierge_instructions' }]);
    assert.equal(KnowledgeModel.findOneCalls.length, 1);
    assert.deepEqual(KnowledgeModel.findOneCalls[0], STAR_QUERY);

    assert.ok(prompt.startsWith(`${INSTRUCTIONS}\n\n[STATIC KNOWLEDGE BASE BOUNDARY START]\n`));
    assert.match(prompt, /RESUME PROJECTION \(JSON\)/);
    assert.match(prompt, new RegExp(`FILE NAME: ${STAR_TITLE.replace(/[.]/g, '\\.')}`));
    assert.match(prompt, /Northwater Labs needed a fictional launch story/);
    assert.match(prompt, /\[STATIC KNOWLEDGE BASE BOUNDARY END\]/);
    assert.match(prompt, /"name": "Alex Morgan"/);
    assert.match(prompt, /"name": "Northwater Labs"/);
    assert.equal(prompt.includes('northwater-internal'), false);
    assert.equal(prompt.includes('1991-04-01'), false);
    assert.equal(prompt.includes('"meta"'), false);
    assert.equal(prompt.includes('01_AI_Asst'), false);
    assert.equal(prompt.includes('06_AI_Asst'), false);
    assert.equal(prompt.includes('You are a helpful assistant.'), false);

    const jsonBlock = prompt.split('RESUME PROJECTION (JSON)\n---\n')[1].split('\n\n---\n')[0];
    assert.deepEqual(JSON.parse(jsonBlock), {
      basics: PROJECTED.basics,
      work: PROJECTED.work,
      projects: PROJECTED.projects
    });
  });

  test('continues with the projection when the STAR document is missing', async () => {
    const KnowledgeModel = knowledgeModel(null);
    const prompt = await buildContext({
      ConfigModel: configModel(INSTRUCTIONS),
      KnowledgeModel,
      loadResume: async () => PROJECTED
    });

    assert.equal(KnowledgeModel.findOneCalls.length, 1);
    assert.match(prompt, /RESUME PROJECTION \(JSON\)/);
    assert.equal(prompt.includes('FILE NAME:'), false);
    assert.equal(prompt.includes('01_AI_Asst'), false);
    assert.match(prompt, /\[STATIC KNOWLEDGE BASE BOUNDARY END\]/);
  });

  test('fails closed when concierge instructions are missing or empty', async () => {
    for (const value of [null, '', '   \n']) {
      let resumeCalled = false;
      await assert.rejects(
        () => buildContext({
          ConfigModel: configModel(value),
          KnowledgeModel: {
            find() {
              throw new Error('Knowledge.find() must not be called');
            },
            findOne() {
              throw new Error('Knowledge.findOne() must not be called');
            }
          },
          loadResume: async () => {
            resumeCalled = true;
            return PROJECTED;
          }
        }),
        (error) => {
          assert.match(error.message, /concierge_instructions/);
          assert.notEqual(error.message, 'You are a helpful assistant.');
          return true;
        }
      );
      assert.equal(resumeCalled, false);
    }
  });

  test('fails closed when Config.findOne rejects', async () => {
    const dbError = new Error('config collection unavailable');
    await assert.rejects(
      () => buildContext({
        ConfigModel: configModel(INSTRUCTIONS, { rejectWith: dbError }),
        KnowledgeModel: {
          find() {
            throw new Error('Knowledge.find() must not be called');
          },
          findOne() {
            throw new Error('Knowledge.findOne() must not be called');
          }
        },
        loadResume: async () => {
          throw new Error('resume should not be loaded');
        }
      }),
      (error) => {
        assert.equal(error, dbError);
        assert.notEqual(error.message, 'You are a helpful assistant.');
        return true;
      }
    );
  });

  test('fails closed when the resume projection rejects', async () => {
    const projectionError = new Error('projection unavailable');
    let starCalled = false;
    await assert.rejects(
      () => buildContext({
        ConfigModel: configModel(INSTRUCTIONS),
        KnowledgeModel: {
          find() {
            throw new Error('Knowledge.find() must not be called');
          },
          findOne() {
            starCalled = true;
            throw new Error('STAR should not be queried');
          }
        },
        loadResume: async () => {
          throw projectionError;
        }
      }),
      (error) => {
        assert.equal(error, projectionError);
        assert.notEqual(error.message, 'You are a helpful assistant.');
        return true;
      }
    );
    assert.equal(starCalled, false);
  });
});

describe('getCachedResume', { concurrency: false }, () => {
  const originalTtl = process.env.RESUME_CACHE_TTL_MS;

  beforeEach(() => {
    clearResumeCache();
    if (originalTtl === undefined) {
      delete process.env.RESUME_CACHE_TTL_MS;
    } else {
      process.env.RESUME_CACHE_TTL_MS = originalTtl;
    }
  });

  after(() => {
    clearResumeCache();
    if (originalTtl === undefined) {
      delete process.env.RESUME_CACHE_TTL_MS;
    } else {
      process.env.RESUME_CACHE_TTL_MS = originalTtl;
    }
    logger.close();
  });

  test('reuses the stripped projection within the TTL and refetches after it expires', async () => {
    let now = 1_700_000_000_000;
    let calls = 0;
    const getResumeFn = async (apiKey) => {
      calls += 1;
      assert.equal(apiKey, 'cache-key');
      return {
        meta: { clientId: 'hide-me', cutOffDate: '1991-04-01', projected: true },
        basics: { name: 'Alex Morgan', employer: 'Northwater Labs' }
      };
    };

    const first = await getCachedResume({
      getResumeFn,
      apiKey: 'cache-key',
      ttlMs: 1000,
      now: () => now
    });
    const second = await getCachedResume({
      getResumeFn,
      apiKey: 'cache-key',
      ttlMs: 1000,
      now: () => now + 999
    });

    assert.equal(calls, 1);
    assert.equal(first, second);
    assert.equal(first.meta, undefined);
    assert.equal(JSON.stringify(first).includes('hide-me'), false);
    assert.equal(first.basics.name, 'Alex Morgan');

    now += 1000;
    const third = await getCachedResume({
      getResumeFn,
      apiKey: 'cache-key',
      ttlMs: 1000,
      now: () => now
    });

    assert.equal(calls, 2);
    assert.notEqual(third, first);
    assert.equal(third.basics.employer, 'Northwater Labs');
  });

  test('uses a 15 minute default TTL and honors RESUME_CACHE_TTL_MS', async () => {
    delete process.env.RESUME_CACHE_TTL_MS;
    let calls = 0;
    const getResumeFn = async () => {
      calls += 1;
      return { basics: { name: 'Alex Morgan' } };
    };
    const start = 5_000;

    await getCachedResume({ getResumeFn, apiKey: 'k', now: () => start });
    await getCachedResume({
      getResumeFn,
      apiKey: 'k',
      now: () => start + (15 * 60 * 1000) - 1
    });
    assert.equal(calls, 1);

    await getCachedResume({
      getResumeFn,
      apiKey: 'k',
      now: () => start + (15 * 60 * 1000)
    });
    assert.equal(calls, 2);

    clearResumeCache();
    process.env.RESUME_CACHE_TTL_MS = '2500';
    calls = 0;
    await getCachedResume({ getResumeFn, apiKey: 'k', now: () => start });
    await getCachedResume({ getResumeFn, apiKey: 'k', now: () => start + 2499 });
    assert.equal(calls, 1);
    await getCachedResume({ getResumeFn, apiKey: 'k', now: () => start + 2500 });
    assert.equal(calls, 2);
  });

  test('does not cache a failed projection fetch', async () => {
    let calls = 0;
    const getResumeFn = async () => {
      calls += 1;
      if (calls === 1) {
        throw new Error('projection down');
      }
      return { basics: { name: 'Alex Morgan' } };
    };

    await assert.rejects(
      () => getCachedResume({ getResumeFn, apiKey: 'k', ttlMs: 5000, now: () => 10 }),
      /projection down/
    );
    const value = await getCachedResume({ getResumeFn, apiKey: 'k', ttlMs: 5000, now: () => 10 });
    assert.equal(calls, 2);
    assert.equal(value.basics.name, 'Alex Morgan');
  });
});
