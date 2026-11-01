import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AI_ACTIONS, actionsFor, buildPrompt, targetField, RULES } from '../js/ai.js';
import { FIELDS } from '../js/schema.js';
import { blankWorkspace, RECORD_TYPES } from '../js/model.js';

test('every action lands in a field its record types actually have', () => {
  for (const [id, a] of Object.entries(AI_ACTIONS)) {
    for (const t of a.types) {
      const field = targetField(id, t);
      assert.ok(FIELDS[t].some((f) => f.key === field), `${id} on ${t} -> "${field}"`);
    }
  }
});

test("the prompt carries the rules and the creator's own text, not AI text", () => {
  const ws = blankWorkspace();
  ws.config.aiInstructions = 'Be brief.';
  const p = buildPrompt('cleanup', ws, 'ideas', { title: 'T', rawInput: 'raw words', aiInterpretation: 'MACHINE' });
  for (const r of RULES) assert.ok(p.includes(r));
  assert.ok(p.includes('raw words'));
  assert.ok(p.includes('Be brief.'));
  assert.ok(!p.includes('MACHINE'));
  assert.throws(() => buildPrompt('nope', ws, 'ideas', {}));
});

test('actionsFor only offers actions for that type', () => {
  for (const t of RECORD_TYPES) for (const a of actionsFor(t)) assert.ok(a.types.includes(t));
  assert.ok(actionsFor('outputs').some((a) => a.id === 'adapt'));
  assert.ok(!actionsFor('ideas').some((a) => a.id === 'adapt'));
});
