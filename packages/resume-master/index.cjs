'use strict';

/**
 * Vendored CommonJS bridge for the private @fastdogcoding/resume-master client.
 * Vercel builds this app in an isolated container, so the projection client
 * ships inside the repo instead of being installed from the npm registry.
 */

const DEFAULT_RESUME_SERVICE_URL = 'https://resume-master-nu.vercel.app';

const ALLOWED_MODES = new Set(['strict', 'expand']);

/**
 * Resolve the projection service origin.
 * Precedence: non-empty baseUrl, then non-empty RESUME_SERVICE_URL, then the default.
 *
 * @param {string | undefined} baseUrl
 * @returns {string} Origin with a trailing slash, suitable for `new URL`.
 */
function resolveServiceRoot(baseUrl) {
  const explicit = typeof baseUrl === 'string' ? baseUrl.trim() : '';
  const fromEnv = typeof process.env.RESUME_SERVICE_URL === 'string'
    ? process.env.RESUME_SERVICE_URL.trim()
    : '';
  const root = explicit || fromEnv || DEFAULT_RESUME_SERVICE_URL;
  return root.endsWith('/') ? root : `${root}/`;
}

/**
 * Copy only the allow-listed request fields. `asOf` is never forwarded.
 *
 * @param {object | null | undefined} options
 * @returns {Record<string, unknown>}
 */
function buildRequestBody(options) {
  const opts = options && typeof options === 'object' ? options : {};
  const body = {};

  if (opts.projectIds !== undefined) {
    body.projectIds = opts.projectIds;
  }
  if (opts.workIds !== undefined) {
    body.workIds = opts.workIds;
  }
  if (opts.keywords !== undefined) {
    body.keywords = opts.keywords;
  }
  if (ALLOWED_MODES.has(opts.mode)) {
    body.mode = opts.mode;
  }
  if (Object.hasOwn(opts, 'cutOffDate')) {
    body.cutOffDate = opts.cutOffDate;
  }

  return body;
}

/**
 * Fetch the allow-listed JSON Resume projection for this API key.
 *
 * @param {string} apiKey Bearer token. Required. Never echoed in errors.
 * @param {object} [options] Optional projection filters. `asOf` is ignored.
 * @param {string} [baseUrl] Override the service origin for this call.
 * @returns {Promise<unknown>} Parsed JSON body, including any top-level `meta`.
 */
async function getResume(apiKey, options = {}, baseUrl) {
  if (typeof apiKey !== 'string' || apiKey.length === 0) {
    throw new Error('getResume requires an apiKey');
  }

  const url = new URL('/v1/resume', resolveServiceRoot(baseUrl));
  const body = buildRequestBody(options);

  let response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });
  } catch (_networkError) {
    throw new Error('getResume request failed');
  }

  if (!response.ok) {
    throw new Error(`getResume failed with HTTP ${response.status}`);
  }

  try {
    return await response.json();
  } catch (_parseError) {
    // Syntax errors from response.json() can quote the response body.
    throw new Error('getResume request failed');
  }
}

module.exports = {
  DEFAULT_RESUME_SERVICE_URL,
  getResume
};
