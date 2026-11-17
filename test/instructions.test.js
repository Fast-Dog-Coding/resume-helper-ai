const fs = require('node:fs');
const path = require('node:path');
const { describe, test } = require('node:test');
const assert = require('node:assert/strict');

const INSTRUCTIONS_PATH = path.join(__dirname, '../config/instructions.md');

// Last segment of a host or filename. A dotted token ending in one of these
// is a URL or a file, unless it also uses array notation (`work[]`).
const PUBLIC_SUFFIX = /^(?:com|org|net|io|app|dev|md|js|json|html|css|txt|pdf|yml|yaml)$/i;

const IDENTIFIER_PATH = /^[A-Za-z_][\w]*(?:\[\])?(?:\.[A-Za-z_][\w]*(?:\[\])?)*$/;

/**
 * Field-path citations the system prompt must not teach the model.
 *
 * Catches the shapes from the citizenship-reply leak:
 * - dotted paths anywhere (`basics.workAuthorization`, `work[].projects`)
 * - bare array paths (`work[]`, `projects[]`)
 * - backtick-quoted keys and paths (`kind`, `startDate`, `basics`)
 * - schema examples (`"kind":`, backtick-quoted JSON such as `["US", "CA"]`)
 *
 * Emails, public URLs, the STAR filename, and the boundary-marker phrases
 * are not field paths.
 *
 * @param {string} text
 * @returns {string[]}
 */
function findInstructionFieldPaths(text) {
  const leaks = [];

  function add(token) {
    if (!leaks.includes(token)) {
      leaks.push(token);
    }
  }

  const dotted = /\b[A-Za-z_][\w]*(?:\[\])?(?:\.[A-Za-z_][\w]*(?:\[\])?)+\b/g;
  for (const match of text.matchAll(dotted)) {
    const token = match[0];
    const index = match.index ?? 0;
    const before = index > 0 ? text[index - 1] : '';
    const after = text[index + token.length] || '';
    if (before === '@' || after === '@' || before === '/') {
      continue;
    }
    const last = token.split('.').pop().replace(/\[\]/g, '');
    if (!token.includes('[]') && PUBLIC_SUFFIX.test(last)) {
      continue;
    }
    add(token);
  }

  const arrays = /\b[A-Za-z_][\w]*\[\]/g;
  for (const match of text.matchAll(arrays)) {
    add(match[0]);
  }

  const ticks = /`([^`\n]+)`/g;
  for (const match of text.matchAll(ticks)) {
    const inner = match[1].trim();
    if (IDENTIFIER_PATH.test(inner)) {
      add(`\`${inner}\``);
      continue;
    }
    // JSON snippets cited as code. Boundary markers also start with `[`
    // but they are prose, with spaces and no quotes.
    if (/^[{\[]/.test(inner) && /["':]/.test(inner)) {
      add(`\`${inner}\``);
    }
  }

  const jsonKeys = /"[A-Za-z_][\w]*"\s*:/g;
  for (const match of text.matchAll(jsonKeys)) {
    add(match[0]);
  }

  return leaks;
}

const PREVIOUS_FIELD_PATH_EXCERPT = [
  'In `work[]`, an entry with `"kind": "employer"` is direct employment. An entry with `"kind": "client"` and `"via": "fast-dog-coding"` is a client engagement.',
  'Entries in `work[].projects` link to `projects[].id`. Describe the matching `projects[]` record.',
  'Dates are year precision (`YYYY`). If a work entry has a `startDate` and no `endDate`, it is ongoing.',
  'Answer only from `basics.workAuthorization`. For example, `["US", "CA"]` means the United States and Canada.',
  'Share only the contact links present in `basics`.'
].join('\n');

describe('concierge instructions', () => {
  test('reads the real instructions file', () => {
    assert.equal(path.basename(INSTRUCTIONS_PATH), 'instructions.md');
    assert.equal(path.basename(path.dirname(INSTRUCTIONS_PATH)), 'config');
    assert.equal(fs.existsSync(INSTRUCTIONS_PATH), true);
    const text = fs.readFileSync(INSTRUCTIONS_PATH, 'utf8');
    assert.match(text, /You may go by the name Rio/);
    assert.match(text, /STATIC KNOWLEDGE BASE/);
    assert.equal(text.includes('You are a helpful assistant.'), false);
  });

  test('flags dotted paths, array paths, and backtick-quoted keys', () => {
    const leaks = findInstructionFieldPaths(PREVIOUS_FIELD_PATH_EXCERPT);
    const expected = [
      '`work[]`',
      'work[]',
      '"kind":',
      '"via":',
      'work[].projects',
      '`work[].projects`',
      'projects[].id',
      '`projects[].id`',
      '`projects[]`',
      'projects[]',
      '`YYYY`',
      '`startDate`',
      '`endDate`',
      'basics.workAuthorization',
      '`basics.workAuthorization`',
      '`["US", "CA"]`',
      '`basics`'
    ];
    for (const token of expected) {
      assert.ok(leaks.includes(token), `expected ${token} in ${leaks.join(', ')}`);
    }
  });

  test('allows emails, urls, the STAR filename, and boundary markers', () => {
    const benign = [
      'Advocate for Grant R. Lindsay.',
      'Email grant@fastdogcoding.com and https://fastdogcoding.com.',
      'Also grant.lindsay@fastdogcoding.com and https://fastdogcoding.com/resume.pdf.',
      'File **07_AI_Asst_STAR-Formatted_Responses.md** stays in the knowledge base.',
      'Markers (`[STATIC KNOWLEDGE BASE BOUNDARY START]` and `[STATIC KNOWLEDGE BASE BOUNDARY END]`).',
      'Never mention field names, JSON keys, paths, or data structure.'
    ].join('\n');
    assert.deepEqual(findInstructionFieldPaths(benign), []);
  });

  test('the checked-in instructions do not teach field paths', () => {
    const text = fs.readFileSync(INSTRUCTIONS_PATH, 'utf8');
    const leaks = findInstructionFieldPaths(text);
    assert.deepEqual(
      leaks,
      [],
      `config/instructions.md teaches field paths: ${leaks.join(', ')}`
    );
  });

  test('personal questions are declined without facts, and work authorization stays answerable', () => {
    const text = fs.readFileSync(INSTRUCTIONS_PATH, 'utf8');
    assert.match(text, /Never mention field names, JSON keys, paths, or data structure/);
    assert.match(text, /Never cite a source in backticks or brackets/);
    assert.match(text, /Citizenship, immigration, visa status, age, birth date, family, health, and similar personal questions are off limits/);
    assert.match(text, /Decline politely, without restating any facts, and offer grant@fastdogcoding\.com/);
    assert.match(text, /do not restate work authorization or any other facts, and offer grant@fastdogcoding\.com/);
    assert.match(text, /Answer a direct question about work authorization only from the work-authorization facts/);
    assert.match(text, /A direct question about work authorization is not one of these questions/);
    assert.equal(text.includes('experience, and work authorization'), false);
    assert.equal(text.includes('basics.workAuthorization'), false);
  });
});
