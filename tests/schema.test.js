import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FIELDS, LEVELS, CONTENT_SECTIONS, TITLE_FIELD, optionsFor, visibleFields, atLeast } from '../js/schema.js';
import { RECORD_TYPES, blankConfig } from '../js/model.js';

test('every record type has fields, unique keys, a title field and valid levels', () => {
  for (const t of RECORD_TYPES) {
    const keys = FIELDS[t].map((f) => f.key);
    assert.equal(new Set(keys).size, keys.length, t);
    assert.ok(keys.includes(TITLE_FIELD[t]), `${t} title`);
    for (const f of FIELDS[t]) assert.ok(LEVELS.includes(f.level), `${t}.${f.key}`);
  }
});

test('every select resolves its options against a blank workspace (no silent fallback)', () => {
  const config = blankConfig();
  for (const t of RECORD_TYPES) {
    for (const f of FIELDS[t].filter((x) => x.type === 'select')) assert.ok(Array.isArray(optionsFor(f, t, config)), `${t}.${f.key}`);
  }
  assert.throws(() => optionsFor({ key: 'x', options: 'nonsense' }, 'ideas', config));
});

test('every status select has statuses configured', () => {
  const config = blankConfig();
  for (const t of RECORD_TYPES) {
    if (FIELDS[t].some((f) => f.options === 'status')) assert.ok(config.statuses[t]?.length, t);
  }
});

test('content fields sit in a known section; each level shows at least what the one below does', () => {
  const sections = new Set(CONTENT_SECTIONS.map(([id]) => id));
  for (const f of FIELDS.content) assert.ok(sections.has(f.section), f.key);
  for (const t of RECORD_TYPES) {
    const simple = visibleFields(t, 'simple').length;
    const adv = visibleFields(t, 'advanced').length;
    const exp = visibleFields(t, 'expert').length;
    assert.ok(simple <= adv && adv <= exp && exp === FIELDS[t].length, t);
  }
  assert.ok(atLeast('expert', 'advanced'));
  assert.ok(!atLeast('simple', 'advanced'));
});
