import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { guideMatches, HOWTOS, FAQS, ONBOARDING } from '../js/guide.js';
import { LICENCE, LEGAL } from '../js/legal.js';

test('search folds in everyday words and ANDs the query', () => {
  const t = HOWTOS.find((h) => h.id === 'outputs');
  assert.ok(guideMatches(`${t.title} ${t.steps.join(' ')}`, 'tiktok'));
  assert.ok(guideMatches('Export a content package', 'zip claude'));
  assert.ok(!guideMatches('Export a content package', 'zip calendar'));
  assert.ok(guideMatches('anything', ''));
});

test('guide data is complete', () => {
  assert.equal(new Set(HOWTOS.map((h) => h.id)).size, HOWTOS.length);
  for (const h of HOWTOS) assert.ok(h.steps.length >= 2, h.id);
  for (const f of FAQS) assert.ok(f.q.endsWith('?'), f.q);
  assert.ok(ONBOARDING.length >= 3 && ONBOARDING.length <= 5);
  for (const s of ONBOARDING) assert.match(s.href, /^#\//);
});

test('the licence named in the app is the one in LICENSE and the README', () => {
  assert.ok(readFileSync(new URL('../LICENSE', import.meta.url), 'utf8').startsWith(`${LICENCE} License`));
  assert.match(readFileSync(new URL('../README.md', import.meta.url), 'utf8'), new RegExp(`## Licence\\s+${LICENCE}`));
  assert.ok(LEGAL.licence.paras[0].includes(LICENCE));
});
