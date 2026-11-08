// The content package: a folder of Markdown files an outside collaborator or assistant
// can read without guessing. Only files that have something in them are written.

import { getRecord, related, slug, titleOf } from './model.js';
import { capturePath } from './capture.js';
import { outputLabel } from './content.js';
import { progress } from './workflow.js';
import { RULES } from './ai.js';

/** Safe for a folder name on every OS; ids keep it unique, so the name is only for people. */
export { slug };

const section = (title, body) => (body && String(body).trim() ? `## ${title}\n\n${String(body).trim()}\n` : '');
const doc = (title, ...parts) => {
  const body = parts.filter(Boolean).join('\n');
  return body ? `# ${title}\n\n${body}` : '';
};
const list = (items) => items.filter(Boolean).map((x) => `- ${x}`).join('\n');

function storyText(story) {
  if (!story?.blocks?.length) return '';
  const head = `Template: ${story.templateName} (v${story.templateVersion})\n\n`;
  return head + story.blocks.map((b, i) => [
    `### ${i + 1}. ${b.name}`,
    b.purpose && `Purpose: ${b.purpose}`,
    b.duration && `Duration: ${b.duration}`,
    b.script && `\n${b.script}`,
    b.visual && `Visuals: ${b.visual}`,
    b.transition && `Transition: ${b.transition}`,
    b.notes && `Notes: ${b.notes}`,
  ].filter(Boolean).join('\n')).join('\n\n');
}

function workflowText(wf) {
  if (!wf?.steps?.length) return '';
  const p = progress(wf);
  const mark = { done: '[x]', skipped: '[-]', todo: '[ ]' };
  return `Workflow: ${wf.templateName} (v${wf.templateVersion}) - ${p.done}/${p.total} done, ${p.skipped} skipped\n\n`
    + wf.steps.map((s) => `${mark[s.status]} ${s.name}${s.optional ? ' (optional)' : ''}`).join('\n');
}

const refLine = (r) => [r.title, r.author && `- ${r.author}`, r.url && `<${r.url}>`, `[${r.status || 'Unverified'}]`].filter(Boolean).join(' ');
const assetLine = (a) => [a.name, a.assetType && `(${a.assetType})`, a.location && `at ${a.location}`, a.status && `[${a.status}]`].filter(Boolean).join(' ');

/** Every file in one content item's package, as `{ path, text }`. */
export function contentPackage(ws, contentId, now = new Date().toISOString()) {
  const c = getRecord(ws, 'content', contentId);
  if (!c) throw new Error(`contentPackage: no content "${contentId}"`);
  const root = `Content_${c.id}_${slug(c.workingTitle)}`;
  const rel = related(ws, 'content', c.id);
  const out = rel.outgoing;
  const ideas = out.filter((x) => x.type === 'ideas').map((x) => x.record);
  const projects = out.filter((x) => x.type === 'projects').map((x) => x.record);
  const refs = out.filter((x) => x.type === 'references').map((x) => x.record);
  const assets = out.filter((x) => x.type === 'assets').map((x) => x.record);
  const outputs = ws.records.outputs.filter((o) => o.contentId === c.id && !o.archived);
  const category = ws.config.categories.find((x) => x.id === c.categoryId)?.name;

  const files = [];
  const put = (path, text) => { if (text) files.push({ path: `${root}/${path}`, text }); };

  put('Brief.md', doc(c.workingTitle,
    list([`Type: ${c.contentType || '-'}`, `Status: ${c.status || '-'}`, category && `Category: ${category}`,
      c.series && `Series: ${c.series}`, c.audience && `Audience: ${c.audience}`, c.targetDate && `Target date: ${c.targetDate}`]) + '\n',
    section('Brief', c.brief),
    section('Source ideas', list(ideas.map((i) => `${i.title} (${i.id}) - original input: "${i.rawInput || ''}"`))),
    section('Projects', list(projects.map((p) => `${p.title} (${p.id})`)))) || `# ${c.workingTitle}\n`);
  put('Master_Concept.md', doc('Master concept', section('Central message', c.centralMessage),
    section('Viewer promise', c.viewerPromise), section('Why it is made this way', c.reasoning), section('Concept', c.masterConcept)));
  put('Story_and_Structure.md', doc('Story and structure', storyText(c.story)));
  put('Script_or_Talking_Points.md', doc(c.scriptFormat || 'Script', section('How to say it (vibe and rules)', c.delivery), c.script && `${c.script}\n`,
    section('Hooks', c.hooks), section('Re-hooks', c.rehooks), section('Ending', c.ending), section('Call to action', c.cta)));
  put('Research_and_References.md', doc('Research and references', section('Notes', c.researchNotes),
    section('Claims to verify', c.claimsToVerify), section('Counterarguments', c.counterarguments),
    section('References', list(refs.map(refLine)))));
  put('Visual_Direction.md', doc('Visual direction', section('Plan', c.visualPlan)));
  put('Production_Notes.md', doc('Production', section('Instructions', c.productionNotes),
    section('Recording', c.recordingNotes), section('Editing', c.editingNotes),
    section('Review', c.reviewStatus), section('Workflow', workflowText(c.workflow))));
  const kinds = ws.config.captureKinds || [];
  const captureLine = (cp) => `${kinds.find((k) => k.id === cp.kind)?.name || cp.kind}: ${cp.what || '(not described)'} -> ${capturePath(kinds, c, cp).full}.* (${cp.status})`;
  put('Asset_Manifest.md', doc('Assets', list(assets.map(assetLine)), section('To capture, and where each file goes', list((c.captures || []).map(captureLine)))));
  put('AI_Instructions.md', doc('Instructions for an assistant', list(RULES) + '\n',
    section('Creator\'s standing instructions', ws.config.aiInstructions),
    section('Voice and tone', ws.config.voice.tone)));

  for (const o of outputs) {
    const dir = `Platform_Outputs/${slug(outputLabel(ws, o), 50)}_${o.id}`;
    const platform = ws.platforms.find((p) => p.id === o.platformId);
    const format = platform?.formats.find((f) => f.id === o.formatId);
    put(`${dir}/Platform_Brief.md`, doc(o.title || c.workingTitle,
      list([`Platform: ${outputLabel(ws, o)}`, `Status: ${o.status || '-'}`, o.scheduledDate && `Scheduled: ${o.scheduledDate}`]) + '\n',
      section('Angle', o.angle), section('Viewer promise', o.viewerPromise), section('Script or structure', o.script),
      section('Story', storyText(o.story))));
    put(`${dir}/Caption_and_Metadata.md`, doc('Publishing metadata', section('Title', o.title), section('Caption / description', o.caption),
      section('Hashtags / tags', o.hashtags), section('Links', o.links), section('Cover / thumbnail', o.coverRequirements),
      section('Checklist', (o.checklist || []).map((x) => `${x.done ? '[x]' : '[ ]'} ${x.text}`).join('\n')),
      section('Published', [o.publishedDate, o.publishedUrl].filter(Boolean).join(' - '))));
    put(`${dir}/Export_Requirements.md`, doc('Export requirements', list([
      o.durationTarget && `Duration: ${o.durationTarget}`, o.aspectRatio && `Aspect ratio: ${o.aspectRatio}`,
      o.technical && `Technical: ${o.technical}`, format?.safeZones && `Safe zones: ${format.safeZones}`]),
      platform && `\nSpecs last verified: ${platform.verifiedOn || 'never - check before export'}`));
  }

  const index = files.map((f) => `- \`${f.path.slice(root.length + 1)}\``).join('\n');
  files.unshift({ path: `${root}/README.md`, text: `# ${c.workingTitle}

Exported from ContentBench on ${now.slice(0, 10)}. Content id \`${c.id}\` in workspace "${ws.name}".

Ids are stable; folder names are only for people. Text the creator wrote and text an
assistant suggested are kept apart - suggestions appear only where the creator accepted them.

## Files

- \`README.md\` - this index
${index}
- \`package.json\` - the same records as structured data
` });
  files.push({ path: `${root}/package.json`, text: JSON.stringify({ exported: now, workspace: ws.name, content: c,
    ideas, projects, references: refs, assets, outputs }, null, 2) });
  return { root, files };
}

/** One readable brief for pasting into an external assistant. */
export function assistantBrief(ws, contentId) {
  const { files } = contentPackage(ws, contentId);
  return files.filter((f) => f.path.endsWith('.md') && !f.path.endsWith('README.md'))
    .map((f) => `<!-- ${f.path} -->\n${f.text}`).join('\n\n');
}

/* ------------------------------------------------- product brief for Claude */

/** What to hand back, per kind of product. Kinds not listed get the e-book spec's general shape. */
const PRODUCT_SPECS = {
  'E-book / PDF': [
    'A designed PDF guide: cover, contents, one chapter per section of the structure below, then a one-page summary and a closing page.',
    'Make the ideas visible: diagrams, comparisons and frameworks drawn as clean vector graphics (the graphics list below says which), pull quotes for the key lines, a worksheet or checklist page the reader can actually use.',
    'Page size A4 portrait unless the design guide says otherwise; generous margins; readable on a phone as well as printed.',
    'Deliver the PDF and its editable source (HTML/CSS or DOCX) so it can be changed later.',
  ],
  Poster: [
    'One idea on one page, readable from two metres: a headline, the idea as a diagram or short list, one line of explanation, the motto small at the bottom.',
    'Print-ready PDF at A3 and A2 portrait, 300 dpi, 3 mm bleed; plus a 1080 x 1350 PNG for sharing.',
  ],
  Course: [
    'A course outline, not the videos: modules, then lessons; each lesson with its objective, the key points, an exercise and one question that checks understanding.',
    'Plus a workbook PDF for the first module in the design below, and a one-page course overview to sell or share it.',
  ],
  'LinkedIn post': [
    'Post text: the first two lines work on their own (they show before "see more"), short paragraphs, one idea, a real question at the end; no hashtag wall (three at most).',
    'One image 1080 x 1350 in the design below that carries the idea without the text.',
  ],
  'Instagram post': [
    'One image (or a carousel of up to 10 slides) 1080 x 1350 in the design below; slide 1 works alone; a caption with the idea in the first line and a real question.',
  ],
};

/**
 * One Markdown file to upload to Claude so it can make the product (e-book / PDF, poster, course, post):
 * the job, the rules, the product, its structure and content, the source material it is built from,
 * the design guide and the graphics to make.
 */
export function productBrief(ws, contentId) {
  const c = getRecord(ws, 'content', contentId);
  if (!c) throw new Error(`productBrief: no content "${contentId}"`);
  const kind = c.contentType || 'E-book / PDF';
  const cat = ws.config.categories.find((x) => x.id === c.categoryId);
  const out = related(ws, 'content', c.id).outgoing;
  const of = (t) => out.filter((x) => x.type === t).map((x) => x.record);
  const sources = (c.sourceIds || []).map((id) => getRecord(ws, 'content', id)).filter(Boolean);
  const kinds = ws.config.captureKinds || [];
  const graphics = (c.captures || []).filter((cp) => ['graphic', 'screen'].includes(cp.kind) || /graphic|diagram|image/i.test(kinds.find((k) => k.id === cp.kind)?.name || ''));
  const id = ws.config.identity || {}, brand = ws.config.brand || {}, voice = ws.config.voice || {};
  const sourceText = (s) => [
    `### ${titleOf(s)}${s.series ? ` (${s.series}${s.episode ? ` #${s.episode}` : ''})` : ''}`,
    s.centralMessage && `Central message: ${s.centralMessage}`,
    s.viewerPromise && `What the viewer gets: ${s.viewerPromise}`,
    s.story?.blocks?.length ? `\n${storyText(s.story)}` : s.script && `\n${s.script}`,
    s.researchNotes && `\nResearch notes:\n${s.researchNotes}`,
    s.claimsToVerify && `\nClaims still to check (do not state as fact):\n${s.claimsToVerify}`,
    s.counterarguments && `\nCounterarguments and limits:\n${s.counterarguments}`,
  ].filter(Boolean).join('\n');

  return [
    `# Brief: make the ${kind} "${titleOf(c)}"`,
    '',
    `Exported from ContentBench on ${new Date().toISOString().slice(0, 10)}. Everything you need is in this file; nothing else is coming.`,
    section('Your job', list(PRODUCT_SPECS[kind] || PRODUCT_SPECS['E-book / PDF'])),
    section('How to work', list([
      'Start by replying with the outline and the design direction you plan (page plan, type, colours, the graphics), and wait for my go before building.',
      ...RULES,
      'Never invent facts, statistics, quotes, examples or personal experiences. Anything in [square brackets] is a question for me - ask it, don\'t fill it.',
      'Claims listed as "still to check" are not facts yet: leave them out or mark them, never state them as true.',
      'Write in my voice (below): one person talking to one reader, practical, honest about trade-offs - not a guru, not a sales page.',
      ws.config.aiInstructions,
    ].filter(Boolean))),
    section('The product', list([`Kind: ${kind}`, cat && `Category: ${cat.name} (colour ${cat.color})`, c.audience && `For: ${c.audience}`,
      c.offer && `Free or paid: ${c.offer}${c.price ? ` - ${c.price}` : ''}`, c.targetDate && `Wanted by: ${c.targetDate}`, c.status && `Status: ${c.status}`])),
    section('What the reader gets', c.viewerPromise),
    section('The central idea', c.centralMessage),
    section('Brief', c.brief),
    section('Why it is made this way', c.reasoning),
    section('Structure (sections, in order, with what each is for)', storyText(c.story)),
    section('Content so far (my notes and talking points)', c.script),
    section('How to say it', c.delivery),
    section('Research notes', c.researchNotes),
    section('Claims still to check', c.claimsToVerify),
    section('Counterarguments and limits (include them - the balance is the point)', c.counterarguments),
    section('References', list(of('references').map(refLine))),
    section('Built from (source material)', sources.map(sourceText).join('\n\n')),
    section('Design', [
      cat && `Main colour: the category colour ${cat.color} (${cat.name}), used boldly.`,
      brand.colors && `Colours: ${brand.colors}`, brand.fonts && `Type: ${brand.fonts}`, brand.visualNotes && `\n${brand.visualNotes}`,
    ].filter(Boolean).join('\n')),
    section('Graphics to make', [c.visualPlan, list(graphics.map((g) => g.what))].filter(Boolean).join('\n\n')),
    section('Assets I have (ask me for the files)', list(of('assets').map(assetLine))),
    section('Who I am (for the voice and the closing page)', list([id.channelName && `Name: ${id.channelName}`, id.tagline && `Tagline: ${id.tagline}`,
      id.philosophy && `Philosophy: ${id.philosophy}`, id.principles && `Principles: ${id.principles}`, id.editorialGuidelines && `Editorial rules: ${id.editorialGuidelines}`,
      voice.tone && `Tone: ${voice.tone}`, voice.communication && `Communication: ${voice.communication}`].filter(Boolean))),
  ].filter(Boolean).join('\n');
}
