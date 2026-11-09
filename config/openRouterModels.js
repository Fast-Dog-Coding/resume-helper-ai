const DEFAULT_OPENROUTER_MODELS = ['google/gemini-3.5-flash-lite'];

const OPENROUTER_MODELS_FORMAT =
  'OPENROUTER_MODELS must be a non-empty JSON array of model id strings, for example ["google/gemini-3.5-flash-lite"].';

/**
 * Resolve the OpenRouter model list.
 * An unset or empty value uses the default model. A set value must be valid
 * JSON and a non-empty array of non-blank strings.
 *
 * @param {string | null | undefined} [raw] Value to parse. Omit to read OPENROUTER_MODELS.
 * @returns {string[]}
 */
function parseOpenRouterModels(raw) {
  const value = arguments.length === 0 ? process.env.OPENROUTER_MODELS : raw;

  if (value == null || value === '') {
    return DEFAULT_OPENROUTER_MODELS.slice();
  }

  let parsed;
  try {
    parsed = JSON.parse(value);
  } catch (cause) {
    throw new Error(`${OPENROUTER_MODELS_FORMAT} The value is not valid JSON.`, { cause });
  }

  if (!isNonEmptyStringArray(parsed)) {
    throw new Error(`${OPENROUTER_MODELS_FORMAT} The value is not a non-empty array of strings.`);
  }

  return parsed.slice();
}

/**
 * @param {unknown} value
 * @returns {boolean}
 */
function isNonEmptyStringArray(value) {
  return Array.isArray(value)
    && value.length > 0
    && value.every((item) => typeof item === 'string' && item.trim() !== '');
}

module.exports = {
  DEFAULT_OPENROUTER_MODELS,
  OPENROUTER_MODELS_FORMAT,
  parseOpenRouterModels
};
