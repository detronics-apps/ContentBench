import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FLOW, TRACKS, flowFor } from '../js/flow.js';

test('every way out of every block goes to a block that exists', () => {
  const ids = new Set(FLOW.map((n) => n.id));
  for (const n of FLOW) {
    const outs = n.kind === 'step' ? [n.next] : n.choices.map(([, to]) => to);
    assert.ok(outs.length, `${n.id} has a way out`);
    for (const to of outs) assert.ok(ids.has(to), `${n.id} -> ${to}`);
    if (n.kind === 'choice') assert.ok(n.choices.length >= 2, `${n.id} is a real choice`);
  }
});

test('both tracks have something to say at every step, and the blocks stay short', () => {
  for (const track of Object.keys(TRACKS)) {
    for (const node of flowFor(track)) {
      if (node.kind === 'step') assert.ok(node.text, `${track}: ${node.title} has text`);
      assert.ok(node.text.length <= 90, `${track}: ${node.title} is short (${node.text.length})`);
      for (const e of node.exits) assert.ok(e.label.length <= 60, `${node.title}: "${e.label}" is short`);
    }
  }
  assert.notEqual(flowFor('auto').find((x) => x.id === 'edit').text, flowFor('manual').find((x) => x.id === 'edit').text);
});

test('loops are marked as going back; the straight path runs on', () => {
  const f = flowFor('auto');
  const line = f.find((x) => x.id === 'line');
  assert.deepEqual(line.exits.map((e) => [e.to, e.back]), [[6, true], [8, false]]);
  assert.ok(f.find((x) => x.id === 'idea').exits[0].next);
  assert.ok(f.find((x) => x.id === 'rework').exits.some((e) => e.to === 1 && e.back), 'rework can start the next video');
});
