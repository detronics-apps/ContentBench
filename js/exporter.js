// The content package: a folder of Markdown files an outside collaborator or assistant
// can read without guessing. Only files that have something in them are written.

import { getRecord, related } from './model.js';
import { outputLabel } from './content.js';
import { progress } from './workflow.js';
import { RULES } from './ai.js';

/** Safe for a folder name on every OS; ids keep it unique, so the name is only for people. */
export function slug(text, max = 40) {
  return String(text || 'Untitled').normalize('NFKD').replace(/[^\w\s-]/g, '').trim()
    .replace(/[\s-]+/g, '_').slice(0, max) || 'Untitled';
}

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
    section('Viewer promise', c.viewerPromise), section('Concept', c.masterConcept)));
  put('Story_and_Structure.md', doc('Story and structure', storyText(c.story)));
  put('Script_or_Talking_Points.md', doc(c.scriptFormat || 'Script', c.script && `${c.script}\n`,
    section('Hooks', c.hooks), section('Re-hooks', c.rehooks), section('Ending', c.ending), section('Call to action', c.cta)));
  put('Research_and_References.md', doc('Research and references', section('Notes', c.researchNotes),
    section('Claims to verify', c.claimsToVerify), section('Counterarguments', c.counterarguments),
    section('References', list(refs.map(refLine)))));
  put('Visual_Direction.md', doc('Visual direction', section('Plan', c.visualPlan)));
  put('Production_Notes.md', doc('Production', section('Instructions', c.productionNotes),
    section('Recording', c.recordingNotes), section('Editing', c.editingNotes),
    section('Review', c.reviewStatus), section('Workflow', workflowText(c.workflow))));
  put('Asset_Manifest.md', doc('Assets', list(assets.map(assetLine))));
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
