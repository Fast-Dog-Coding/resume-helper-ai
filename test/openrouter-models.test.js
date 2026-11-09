const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const {
  OPENROUTER_MODELS_FORMAT,
  parseOpenRouterModels
} = require('../config/openRouterModels');

const DEFAULT_MODELS = ['google/gemini-3.5-flash-lite'];
const INVALID_JSON_MESSAGE = `${OPENROUTER_MODELS_FORMAT} The value is not valid JSON.`;
const WRONG_SHAPE_MESSAGE = `${OPENROUTER_MODELS_FORMAT} The value is not a non-empty array of strings.`;

function assertMessage(error, expected) {
  assert.equal(error.message, expected);
  assert.match(error.message, /OPENROUTER_MODELS/);
  assert.match(error.message, /\["google\/gemini-3\.5-flash-lite"\]/);
  return true;
}

describe('parseOpenRouterModels', () => {
  test('unset uses the default', () => {
    const previous = process.env.OPENROUTER_MODELS;
    delete process.env.OPENROUTER_MODELS;
    try {
      assert.deepEqual(parseOpenRouterModels(), DEFAULT_MODELS);
      assert.deepEqual(parseOpenRouterModels(undefined), DEFAULT_MODELS);
      assert.deepEqual(parseOpenRouterModels(null), DEFAULT_MODELS);
      assert.deepEqual(parseOpenRouterModels(''), DEFAULT_MODELS);
    } finally {
      if (previous === undefined) {
        delete process.env.OPENROUTER_MODELS;
      } else {
        process.env.OPENROUTER_MODELS = previous;
      }
    }
  });

  test('a valid array is used as given', () => {
    assert.deepEqual(
      parseOpenRouterModels('["google/gemini-3.5-flash-lite","openai/gpt-4.1-mini"]'),
      ['google/gemini-3.5-flash-lite', 'openai/gpt-4.1-mini']
    );
    assert.deepEqual(
      parseOpenRouterModels('["fixture/second","fixture/first"]'),
      ['fixture/second', 'fixture/first']
    );
  });

  test('invalid JSON gives a clear error', () => {
    for (const raw of ['[google/gemini-1.5-pro]', '{not json', '["unterminated"']) {
      assert.throws(
        () => parseOpenRouterModels(raw),
        (error) => assertMessage(error, INVALID_JSON_MESSAGE)
      );
    }
  });

  test('an empty or wrong-shaped value gives a clear error', () => {
    for (const raw of [
      '[]',
      '{}',
      'null',
      '"google/gemini-3.5-flash-lite"',
      '[1]',
      '["ok", ""]',
      '["ok", 1]',
      '[""]'
    ]) {
      assert.throws(
        () => parseOpenRouterModels(raw),
        (error) => assertMessage(error, WRONG_SHAPE_MESSAGE)
      );
    }
  });
});
