// AI integration points. Nothing here calls a model - this app sends nothing anywhere.
// Each action builds a prompt the creator copies into the assistant of their choice;
// the reply is pasted back as a suggestion (content.js) and never written over their text.

import { titleOf } from './model.js';
import { FIELDS } from './schema.js';

/** action id -> what it asks for, which record types offer it, and where an accepted answer goes. */
export const AI_ACTIONS = {
  cleanup: { label: 'Clean up the raw idea', types: ['ideas'], field: 'cleanedSummary',
    ask: 'Rewrite my original input as a clear two- or three-sentence summary. Keep my meaning; do not add claims or opinions I did not make.' },
  classify: { label: 'Summarise and classify', types: ['ideas'], field: 'aiInterpretation',
    ask: 'Summarise this idea and suggest which of my categories, series and audiences it fits, with a one-line reason for each.' },
  clarify: { label: 'Ask me clarifying questions', types: ['ideas', 'content', 'projects'], field: 'notes',
    ask: 'Ask me up to five questions whose answers would make my intended meaning clear. Do not answer them yourself.' },
  message: { label: 'Identify the central message', types: ['ideas', 'content'], field: 'centralMessage',
    ask: 'Suggest two or three candidate central messages and the viewer value of each, using only what I have written.' },
  research: { label: 'Suggest research questions and counterarguments', types: ['ideas', 'content', 'projects'], field: 'researchQuestions',
    ask: 'List the research questions I should answer and the strongest counterarguments, marking each as something to verify, not a fact.' },
  structure: { label: 'Help structure the story', types: ['content', 'outputs'], field: 'script',
    ask: 'Propose a structure using my storytelling blocks below, with one line per block on what it should do.' },
  hooks: { label: 'Generate hook and re-hook options', types: ['content', 'outputs'], field: 'hooks',
    ask: 'Write five opening hooks and three re-hooks in my voice. Do not invent statistics, quotes or personal experiences.' },
  draft: { label: 'Create a first script or outline', types: ['content', 'outputs'], field: 'script',
    ask: 'Draft an outline or talking points from my brief and structure. Mark every factual claim [VERIFY].' },
  adapt: { label: 'Adapt the master to this platform', types: ['outputs'], field: 'script',
    ask: 'Adapt the master concept for this platform and format, keeping my central message and respecting the technical limits listed.' },
  metadata: { label: 'Draft caption, title, hashtags and cover brief', types: ['outputs'], field: 'caption',
    ask: 'Draft a title, a caption/description, hashtags and a thumbnail or cover brief for this output.' },
  gaps: { label: 'Find missing references or requirements', types: ['content', 'outputs', 'projects'], field: 'notes',
    ask: 'List claims that still need a reference and production or publishing requirements that look missing. Do not supply sources yourself.' },
};

export const RULES = [
  'Distinguish clearly between what I wrote and what you suggest.',
  'Never present an unverified suggestion as fact.',
  'Never invent sources, quotes, statistics, personal experiences or beliefs on my behalf.',
  'If my intended meaning is unclear, ask rather than guess.',
];

/** Where an accepted answer lands for this record type: the action's own field if the
 *  type has it, otherwise the type's notes, otherwise its script. */
export function targetField(actionId, type) {
  const keys = new Set((FIELDS[type] || []).filter((x) => !x.ai || x.key === AI_ACTIONS[actionId].field).map((x) => x.key));
  return [AI_ACTIONS[actionId].field, 'notes', 'script'].find((k) => keys.has(k)) || '';
}

export const actionsFor = (type) => Object.entries(AI_ACTIONS).filter(([, a]) => a.types.includes(type)).map(([id, a]) => ({ id, ...a }));

/** The creator-authored fields of a record, labelled, empty ones left out. AI fields excluded. */
export function recordText(type, record) {
  return (FIELDS[type] || [])
    .filter((x) => !x.ai && typeof record[x.key] === 'string' && record[x.key].trim())
    .map((x) => `${x.label}: ${record[x.key].trim()}`)
    .join('\n');
}

function workspaceContext(ws) {
  const c = ws.config;
  return [
    c.identity.channelName && `Channel: ${c.identity.channelName}`,
    c.identity.philosophy && `Philosophy: ${c.identity.philosophy}`,
    c.voice.tone && `Voice and tone: ${c.voice.tone}`,
    c.categories.length && `My categories: ${c.categories.map((x) => x.name).join(', ')}`,
    c.series.length && `My series: ${c.series.join(', ')}`,
    c.audiences.length && `My audiences: ${c.audiences.join(', ')}`,
    c.aiInstructions && `My standing instructions:\n${c.aiInstructions}`,
  ].filter(Boolean).join('\n');
}

/** The prompt text for one action on one record, ready to paste into an assistant. */
export function buildPrompt(actionId, ws, type, record, extra = '') {
  const action = AI_ACTIONS[actionId];
  if (!action) throw new Error(`buildPrompt: unknown action "${actionId}"`);
  const story = record.story?.blocks?.length
    ? `\nStorytelling blocks: ${record.story.blocks.map((b) => b.name).join(' > ')}` : '';
  return [
    `Task: ${action.ask}`,
    '',
    'Rules:',
    ...RULES.map((r) => `- ${r}`),
    '',
    workspaceContext(ws) && `About me:\n${workspaceContext(ws)}\n`,
    `My ${type === 'content' ? 'content item' : type.replace(/s$/, '')} "${titleOf(record)}":`,
    recordText(type, record) + story,
    extra && `\n${extra}`,
  ].filter((x) => x !== false && x !== '' && x != null).join('\n');
}
