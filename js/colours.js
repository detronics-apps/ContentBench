// A new colour on the channel: when the next video in the line wears a colour family viewers haven't seen yet, the
// video before it says so - one short line before the recap. Pure - no DOM.
// Meanings live on the workspace: config.colourMeanings = { '#4F9D73': { name: 'Building & Business', colour: 'green',
// means: 'how I build things - and how to use them' }, ... }. Without one, the category's own name is used.

const norm = (hex) => String(hex || '').toUpperCase();

/** The colour family of a video: its category's colour, with what that colour means on this channel. */
export function familyOf(ws, c) {
  const cat = ws.config.categories.find((x) => x.id === c?.categoryId);
  if (!cat?.color) return null;
  const m = (ws.config.colourMeanings || {})[norm(cat.color)] || {};
  return { color: norm(cat.color), name: m.name || cat.name, colour: m.colour || 'a new colour', means: m.means || '' };
}

const released = (o) => !!o.publishedDate || o.status === 'Published';
const when = (o) => o.publishedDate || o.scheduledDate || '';

/**
 * For video `c`: if the next video after it on the same platform brings a colour family that nothing released or
 * planned before it has worn, the line to say - and the colours seen so far. Null when there is nothing new to announce.
 */
export function newColourNext(ws, c) {
  const outs = ws.records.outputs.filter((o) => !o.archived && when(o));
  const mine = outs.filter((o) => o.contentId === c.id).sort((a, b) => (when(a) < when(b) ? -1 : 1))[0];
  if (!mine) return null;
  // same day: parts in part order, then the order they were made in
  const part = (o) => Number(ws.records.content.find((x) => x.id === o.contentId)?.part) || 0;
  const line = outs.filter((o) => o.platformId === mine.platformId)
    .sort((a, b) => (when(a) < when(b) ? -1 : when(a) > when(b) ? 1 : part(a) !== part(b) ? part(a) - part(b) : (a.created < b.created ? -1 : 1)));
  const at = line.findIndex((o) => o.id === mine.id);
  const next = line.slice(at + 1).map((o) => ws.records.content.find((x) => x.id === o.contentId)).find((x) => x && !x.archived && x.id !== c.id);
  if (!next) return null;
  const fam = familyOf(ws, next);
  if (!fam) return null;
  const before = line.slice(0, at + 1).map((o) => familyOf(ws, ws.records.content.find((x) => x.id === o.contentId))).filter(Boolean);
  if (before.some((f) => f.color === fam.color)) return null;
  const seen = [...new Map(before.map((f) => [f.color, f])).values()];
  return { next, family: fam, seen, line: sayLine(fam, seen) };
}

/** Where the line goes: "Your turn", else the block before the recap, else the block before the motto - the motto stays last. */
export function lineTarget(blocks = []) {
  const at = (re) => blocks.findIndex((b) => re.test(b.name || ''));
  const turn = at(/^your turn/i), recap = at(/recap/i), motto = at(/motto/i);
  if (turn >= 0) return blocks[turn];
  if (recap > 0) return blocks[recap - 1];
  if (motto > 0) return blocks[motto - 1];
  return blocks.at(-1) || null;
}

/** The talking point itself - short, as a prompt in my own words. */
export function sayLine(fam, seen) {
  const names = seen.map((f) => f.colour);
  const list = names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names.at(-1)}` : names[0];
  const was = seen.length ? ` So far it's been ${list}${seen.length === 1 && seen[0].means ? ` - ${seen[0].means}` : ''}.` : '';
  return `- Next video brings a new colour: ${fam.colour}. On this channel, ${fam.colour} means ${fam.means || fam.name}.${was}`;
}
