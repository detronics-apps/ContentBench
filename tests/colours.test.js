import { test } from 'node:test';
import assert from 'node:assert/strict';
import { blankWorkspace } from '../js/model.js';
import { familyOf, newColourNext, lineTarget, sayLine } from '../js/colours.js';

const T = '2026-11-01T00:00:00.000Z';
function ws(videos) {
  const w = blankWorkspace();
  const categories = [{ id: 'think', name: 'Thinking', color: '#a18ac8' }, { id: 'build', name: 'Building apps', color: '#4F9D73' }];
  const colourMeanings = { '#A18AC8': { name: 'Thinking & Problem Solving', colour: 'purple', means: 'how to think a problem through' },
    '#4F9D73': { name: 'Building & Business', colour: 'green', means: 'how I build things - and how to use them' } };
  const content = videos.map((v, i) => ({ id: `c${i}`, workingTitle: `V${i}`, categoryId: v.cat, created: T, modified: T, archived: false }));
  const outputs = videos.map((v, i) => ({ id: `o${i}`, contentId: `c${i}`, platformId: 'tt', scheduledDate: v.d, publishedDate: v.pub || '', status: v.pub ? 'Published' : 'Scheduled', created: T, modified: T, archived: false }));
  return { ...w, config: { ...w.config, categories, colourMeanings }, records: { ...w.records, content, outputs } };
}

test('a colour family carries its meaning', () => {
  const w = ws([{ cat: 'think', d: '2026-11-09' }]);
  assert.deepEqual(familyOf(w, w.records.content[0]), { color: '#A18AC8', name: 'Thinking & Problem Solving', colour: 'purple', means: 'how to think a problem through' });
});

test('the last video before a new colour announces it; the others say nothing', () => {
  const w = ws([{ cat: 'think', pub: '2026-11-09', d: '2026-11-09' }, { cat: 'think', d: '2026-11-12' }, { cat: 'build', d: '2026-11-13' }, { cat: 'build', d: '2026-11-14' }, { cat: 'think', d: '2026-11-15' }]);
  const [a, b, c, , e] = w.records.content;
  assert.equal(newColourNext(w, a), null, 'next is purple again');
  const hint = newColourNext(w, b);
  assert.equal(hint.next.id, 'c2');
  assert.equal(hint.family.colour, 'green');
  assert.match(hint.line, /^- Next video brings a new colour: green\. On this channel, green means how I build things - and how to use them\. So far it's been purple - how to think a problem through\.$/);
  assert.equal(newColourNext(w, c), null, 'green again next');
  assert.equal(newColourNext(w, e), null, 'the last in the line has no next');
});

test('the line goes before the recap or the motto - the motto stays last - and lists read naturally', () => {
  const names = (...n) => n.map((name, i) => ({ id: String(i), name }));
  assert.equal(lineTarget(names('Hook', 'Your turn (talk)', "Let's recap (read)", 'Motto (read)')).name, 'Your turn (talk)');
  assert.equal(lineTarget(names('Hook', 'Close', "Let's recap (read)", 'Motto (read)')).name, 'Close');
  assert.equal(lineTarget(names('Hook', 'Payoff', 'Motto (read)')).name, 'Payoff');
  assert.equal(lineTarget(names('Hook', 'Close')).name, 'Close');
  assert.match(sayLine({ colour: 'green', means: 'x' }, [{ colour: 'purple' }, { colour: 'orange' }, { colour: 'blue' }]), /So far it's been purple, orange and blue.$/);
});
