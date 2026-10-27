const logger = require('./logger');
const Knowledge = require('../models/Knowledge');
const Config = require('../models/Config');
const { getResume } = require('@fastdogcoding/resume-master');

const DEFAULT_RESUME_CACHE_TTL_MS = 15 * 60 * 1000;
const STAR_TITLE = '07_AI_Asst_STAR-Formatted_Responses.md';
const STAR_QUERY = {
    $or: [
        { title: STAR_TITLE },
        { keywords: 'star' }
    ]
};

let resumeCache = {
    value: null,
    expiresAt: 0,
    apiKey: undefined
};

/**
 * @param {number | undefined} ttlMs
 * @returns {number}
 */
function resolveTtlMs(ttlMs) {
    if (ttlMs !== undefined) {
        const parsed = Number(ttlMs);
        if (!Number.isFinite(parsed) || parsed < 0) {
            throw new Error('ttlMs must be a non-negative number');
        }
        return parsed;
    }

    const raw = process.env.RESUME_CACHE_TTL_MS;
    if (raw === undefined || String(raw).trim() === '') {
        return DEFAULT_RESUME_CACHE_TTL_MS;
    }

    const parsed = Number(raw);
    if (!Number.isFinite(parsed) || parsed < 0) {
        logger.warn(`Invalid RESUME_CACHE_TTL_MS "${raw}"; using ${DEFAULT_RESUME_CACHE_TTL_MS}ms`);
        return DEFAULT_RESUME_CACHE_TTL_MS;
    }
    return parsed;
}

/**
 * @param {(() => number) | number | undefined} now
 * @returns {number}
 */
function resolveNow(now) {
    if (typeof now === 'function') {
        return now();
    }
    if (typeof now === 'number') {
        return now;
    }
    return Date.now();
}

/**
 * Drop service metadata before the projection is embedded in a prompt.
 *
 * @param {object} projected
 * @returns {object}
 */
function stripResumeMeta(projected) {
    const { meta, ...resumeData } = projected;
    return resumeData;
}

/**
 * Return the projected resume, serving a warm in-memory copy until the TTL expires.
 * `meta` (clientId, cutOffDate, projected, and any other service fields) is removed.
 *
 * @param {{ getResumeFn?: Function, apiKey?: string, ttlMs?: number, now?: (() => number) | number }} [options]
 * @returns {Promise<object>}
 */
async function getCachedResume({ getResumeFn, apiKey, ttlMs, now } = {}) {
    const fetchResume = getResumeFn || getResume;
    const key = apiKey === undefined ? process.env.RESUME_API_KEY : apiKey;
    const ttl = resolveTtlMs(ttlMs);
    const nowMs = resolveNow(now);

    if (resumeCache.value && resumeCache.apiKey === key && nowMs < resumeCache.expiresAt) {
        return resumeCache.value;
    }

    const projected = await fetchResume(key);
    const resumeData = stripResumeMeta(projected);
    resumeCache = {
        value: resumeData,
        expiresAt: nowMs + ttl,
        apiKey: key
    };
    return resumeCache.value;
}

function clearResumeCache() {
    resumeCache = {
        value: null,
        expiresAt: 0,
        apiKey: undefined
    };
}

/**
 * @param {string} instructions
 * @param {object} resumeData
 * @param {{ content?: string } | null} starDoc
 * @returns {string}
 */
function assembleContext(instructions, resumeData, starDoc) {
    const parts = [
        instructions,
        '',
        '[STATIC KNOWLEDGE BASE BOUNDARY START]',
        '---',
        'RESUME PROJECTION (JSON)',
        '---',
        JSON.stringify(resumeData, null, 2),
        ''
    ];

    if (starDoc && typeof starDoc.content === 'string' && starDoc.content.length > 0) {
        parts.push(
            '---',
            `FILE NAME: ${STAR_TITLE}`,
            '---',
            starDoc.content,
            ''
        );
    }

    parts.push('[STATIC KNOWLEDGE BASE BOUNDARY END]', '');
    return parts.join('\n');
}

/**
 * Build the system prompt from MongoDB instructions, the resume projection, and the STAR document.
 * Fails closed: callers must not persist a thread when this throws.
 *
 * @param {{ ConfigModel?: object, KnowledgeModel?: object, loadResume?: Function }} [deps]
 * @returns {Promise<string>}
 */
async function buildContext(deps = {}) {
    const ConfigModel = deps.ConfigModel || Config;
    const KnowledgeModel = deps.KnowledgeModel || Knowledge;
    const loadResume = deps.loadResume || (() => getCachedResume());

    try {
        const instructionsDoc = await ConfigModel.findOne({ key: 'concierge_instructions' }).exec();
        if (!instructionsDoc || typeof instructionsDoc.value !== 'string' || instructionsDoc.value.trim().length === 0) {
            throw new Error('concierge_instructions key not found in MongoDB config collection.');
        }

        const resumeData = stripResumeMeta(await loadResume());

        const starDoc = await KnowledgeModel.findOne(STAR_QUERY).exec();
        if (!starDoc || typeof starDoc.content !== 'string' || starDoc.content.length === 0) {
            logger.warn(`STAR document ${STAR_TITLE} was not found; continuing with the projected resume only.`);
        }

        return assembleContext(instructionsDoc.value, resumeData, starDoc);
    } catch (e) {
        logger.error('Failed to build context', e);
        throw e;
    }
}

module.exports = {
    buildContext,
    getCachedResume,
    clearResumeCache,
    STAR_QUERY,
    STAR_TITLE
};
