// The fields of each record type, as data. One generic form renders all of them,
// so a new field is one line here and no layout code.
//
//   type    text | textarea | select | multi | date | url | number | tags
//   options 'status' (the workspace's statuses for this type), 'categories',
//           a config list name ('series', 'audiences', ...), or a literal array
//   level   simple | advanced | expert - the least detail level that shows it
//   ai      true when the field holds machine-suggested text, kept apart from the creator's

export const LEVELS = ['simple', 'advanced', 'expert'];

const f = (key, label, type = 'text', extra = {}) => ({ key, label, type, level: 'simple', ...extra });
const adv = { level: 'advanced' };

export const FIELDS = {
  thoughts: [
    f('text', 'The thought', 'textarea', { rows: 2, hint: 'As it popped up. Nothing else is needed.' }),
    f('source', 'Where it came from', 'select', { options: 'thoughtSources' }),
    f('decision', 'Worth developing?', 'select', { options: ['Develop', 'Park', 'Drop'], hint: 'Your call - nothing has to be decided.' }),
    f('categoryId', 'Category', 'select', { options: 'categories', ...adv }),
    f('tags', 'Tags', 'tags', adv),
    f('notes', 'Notes', 'textarea', adv),
  ],
  ideas: [
    f('title', 'Title', 'text', { hint: 'A few words is enough. Everything else can wait.' }),
    f('rawInput', 'Original input', 'textarea', { hint: 'Kept exactly as you wrote it. Clean-ups go in the summary below.' }),
    f('status', 'Status', 'select', { options: 'status' }),
    f('categoryId', 'Category', 'select', { options: 'categories' }),
    f('ideaType', 'Idea type', 'select', { options: 'ideaTypes', ...adv }),
    f('priority', 'Priority', 'select', { options: ['Low', 'Medium', 'High'], ...adv }),
    f('series', 'Series', 'select', { options: 'series', ...adv }),
    f('audience', 'Intended audience', 'select', { options: 'audiences', ...adv }),
    f('tags', 'Tags', 'tags', adv),
    f('problem', 'The problem: who has it, how often, why it matters', 'textarea', { section: 'problem' }),
    f('approaches', 'Possible solutions and approaches', 'textarea', { section: 'ideas' }),
    f('gain', 'Balance: what we gain', 'textarea', { section: 'ideas', ...adv }),
    f('giveUp', 'Balance: what we give up', 'textarea', { section: 'ideas', ...adv }),
    f('produce', 'Could produce', 'multi', { options: 'produce', section: 'ideas' }),
    f('cleanedSummary', 'Cleaned summary', 'textarea', adv),
    f('viewerValue', 'Potential viewer value', 'textarea', adv),
    f('angle', 'Initial angle', 'textarea', adv),
    f('researchQuestions', 'Research questions', 'textarea', adv),
    f('aiInterpretation', 'AI interpretation', 'textarea', { ai: true, level: 'expert', hint: 'An assistant\'s reading of the idea. Never mixed into your own text.' }),
    f('notes', 'Notes', 'textarea'),
  ],
  projects: [
    f('title', 'Title'),
    f('description', 'Description', 'textarea'),
    f('status', 'Status', 'select', { options: 'status' }),
    f('projectType', 'Project type', 'select', { options: 'projectTypes', ...adv }),
    f('problem', 'Problem or opportunity', 'textarea'),
    f('elevatorPitch', 'Elevator pitch', 'textarea', { hint: 'The whole plan in a sentence or two - the simplicity that was earned.' }),
    f('produce', 'Produces', 'multi', { options: 'produce' }),
    f('categoryId', 'Category', 'select', { options: 'categories', ...adv }),
    f('audience', 'Audience', 'select', { options: 'audiences', ...adv }),
    f('tags', 'Tags', 'tags', adv),
    f('startDate', 'Start date', 'date'),
    f('targetDate', 'Target date', 'date'),
    f('reviewDate', 'Review date', 'date', adv),
    f('effort', 'Estimated effort', 'text', adv),
    f('risks', 'Risks', 'textarea', adv),
    f('assumptions', 'Assumptions', 'textarea', adv),
    f('successCriteria', 'Success criteria', 'textarea', adv),
    f('decisions', 'Decision history', 'textarea', adv),
    f('lessons', 'Lessons', 'textarea', adv),
    f('outcome', 'Final outcome and rationale', 'textarea', adv),
    f('notes', 'Notes', 'textarea'),
  ],
  content: [
    // 1 Idea - what it is, for whom, what they get, why it is made this way
    f('workingTitle', 'Working title', 'text', { section: 'idea' }),
    f('contentType', 'Content type', 'select', { options: 'contentTypes', section: 'idea' }),
    f('status', 'Status', 'select', { options: 'status', section: 'idea' }),
    f('targetDate', 'Target date', 'date', { section: 'idea' }),
    f('categoryId', 'Category', 'select', { options: 'categories', section: 'idea', hint: 'Sets the colour of the video and its graphics.' }),
    f('audience', 'Intended audience', 'select', { options: 'audiences', section: 'idea' }),
    f('offer', 'Free or paid', 'select', { options: ['Free', 'Paid', 'Not decided'], section: 'idea', kinds: 'product' }),
    f('price', 'Price', 'text', { section: 'idea', kinds: 'product' }),
    f('viewerPromise', 'What they get', 'textarea', { section: 'idea', hint: 'What the viewer or reader will have by the end that they did not have at the start.' }),
    f('centralMessage', 'Central idea, in one line', 'textarea', { section: 'idea' }),
    f('brief', 'Brief', 'textarea', { section: 'idea', hint: 'What this piece is, for whom, and why now.' }),
    f('reasoning', 'Why it is made this way', 'textarea', { section: 'idea', hint: 'The reasoning behind the structure and the choices - so the next one copies the thinking, not just the format.' }),
    f('tags', 'Tags', 'tags', { section: 'idea', ...adv }),
    f('series', 'Series', 'select', { options: 'series', section: 'idea', ...adv }),
    f('masterConcept', 'Master concept', 'textarea', { section: 'idea', ...adv }),
    // 2 Card - the blocks are the script; these sit around them
    f('delivery', 'How to say it (vibe and rules)', 'textarea', { section: 'card', hint: 'Tone, pace and the rules for this one. Shown on the teleprompter before you start.' }),
    f('hooks', 'Hook ideas and alternatives', 'textarea', { section: 'card', group: 'hooks' }),
    f('rehooks', 'Re-hooks', 'textarea', { section: 'card', group: 'hooks' }),
    f('ending', 'Ending', 'textarea', { section: 'card', group: 'hooks' }),
    f('cta', 'Call to action', 'textarea', { section: 'card', group: 'hooks' }),
    f('researchNotes', 'Research notes', 'textarea', { section: 'card', group: 'research' }),
    f('claimsToVerify', 'Claims to check before recording', 'textarea', { section: 'card', group: 'research' }),
    f('counterarguments', 'Counterarguments and limits', 'textarea', { section: 'card', group: 'research' }),
    f('visualPlan', 'Overall look and visual notes', 'textarea', { section: 'card', group: 'look', hint: 'What is on screen per block lives in each block; this is the look of the whole piece.' }),
    f('scriptFormat', 'Form', 'select', { options: ['Talking points', 'Outline', 'Full script'], section: 'card', group: 'script' }),
    f('script', 'Script text', 'textarea', { section: 'card', group: 'script', rows: 14, hint: 'Only for pieces without blocks, or a full written script. With blocks, the blocks are the script.' }),
    // 3 Record (or Make)
    f('lighting', 'Lighting setup', 'textarea', { section: 'record', rows: 2, kinds: 'recorded' }),
    f('sound', 'Sound setup (mic, room, levels)', 'textarea', { section: 'record', rows: 2, kinds: 'recorded' }),
    f('music', 'Music selection', 'textarea', { section: 'record', rows: 2, kinds: 'recorded' }),
    f('recordingNotes', 'Recording notes and cut points', 'textarea', { section: 'record', hint: 'The teleprompter saves the cut points of each take here.' }),
    f('productionNotes', 'Production instructions', 'textarea', { section: 'record' }),
    // 4 Edit (or Review)
    f('finalVideo', 'Finished video (file path or link)', 'text', { section: 'edit', hint: 'Where the edited video is. Claude fills this in when it renders.' }),
    f('editingNotes', 'Editing notes', 'textarea', { section: 'edit' }),
    f('reviewStatus', 'Review and approval', 'select', { options: ['Not reviewed', 'Changes needed', 'Approved'], section: 'edit', ...adv }),
    // 5 Results
    f('notes', 'Notes', 'textarea', { section: 'results' }),
  ],
  outputs: [
    f('title', 'Output title'),
    f('status', 'Status', 'select', { options: 'status' }),
    f('angle', 'Angle', 'textarea', adv),
    f('viewerPromise', 'Viewer promise', 'textarea', adv),
    f('script', 'Script or structure notes', 'textarea', { rows: 10 }),
    f('durationTarget', 'Duration target'),
    f('aspectRatio', 'Aspect ratio', 'text', adv),
    f('technical', 'Technical settings', 'text', adv),
    f('coverRequirements', 'Thumbnail / cover', 'textarea', adv),
    f('caption', 'Caption / description', 'textarea'),
    f('hashtags', 'Hashtags / tags'),
    f('links', 'References and links', 'textarea', adv),
    f('scheduledDate', 'Scheduled date', 'date'),
    f('publishedDate', 'Published date', 'date'),
    f('publishedUrl', 'Published URL', 'url'),
  ],
  references: [
    f('title', 'Title'),
    f('author', 'Creator / author / organisation'),
    f('url', 'URL or source details', 'url'),
    f('status', 'Verification', 'select', { options: 'status' }),
    f('description', 'Description', 'textarea', adv),
    f('supports', 'What it supports or explains', 'textarea', adv),
    f('claim', 'Relevant claim or section', 'textarea', adv),
    f('accessed', 'Date accessed', 'date', adv),
    f('notes', 'Notes', 'textarea'),
  ],
  assets: [
    f('name', 'Name'),
    f('assetType', 'Type', 'select', { options: ['Image', 'Diagram', 'Footage', 'Audio', 'Document', 'Font', 'Other'] }),
    f('location', 'File location or URL'),
    f('status', 'Status', 'select', { options: 'status' }),
    f('description', 'Description', 'textarea', adv),
    f('usage', 'Usage notes', 'textarea', adv),
  ],
  tasks: [
    f('title', 'Task'),
    f('status', 'Status', 'select', { options: 'status' }),
    f('due', 'Due', 'date'),
    f('notes', 'Notes', 'textarea'),
  ],
  publications: [
    f('title', 'Label'),
    f('date', 'Published on', 'date'),
    f('url', 'URL', 'url'),
    f('notes', 'Notes', 'textarea'),
  ],
  feedback: [
    f('title', 'Summary'),
    f('date', 'Date', 'date'),
    f('source', 'Source', 'text', { hint: 'Comments, analytics, a conversation...' }),
    f('views', 'Views', 'number', adv),
    f('likes', 'Likes', 'number', adv),
    f('comments', 'Comments', 'number', adv),
    f('shares', 'Shares', 'number', adv),
    f('retention', 'Retention / watch time', 'text', adv),
    f('notes', 'What people said', 'textarea'),
    f('lessons', 'Lessons', 'textarea'),
    f('followUp', 'Possible follow-up content', 'textarea', adv),
  ],
};

/**
 * Simple is the minimum that still goes all the way from an idea to a released video: only these fields. Anything
 * else that was not marked shows from Advanced (the extras that make a video better). Expert adds making the app your
 * own - the settings - and notes on how things connect.
 */
export const ESSENTIAL = {
  thoughts: ['text', 'decision'],
  ideas: ['title', 'rawInput', 'status', 'categoryId'],
  projects: ['title', 'description', 'status', 'startDate', 'targetDate'],
  content: ['workingTitle', 'contentType', 'status', 'categoryId', 'viewerPromise', 'centralMessage', 'finalVideo'],
  outputs: ['title', 'status', 'caption', 'hashtags', 'scheduledDate', 'publishedDate'],
  references: ['title', 'url'],
  assets: ['name', 'location'],
  tasks: ['title', 'status', 'due'],
  publications: ['title', 'date', 'url'],
  feedback: ['title', 'date', 'notes'],
};

/** Shown at Expert under the field: what it feeds elsewhere in the app. */
const CONNECTS = {
  content: {
    categoryId: 'Sets the video\'s colour family (the edit\'s palette) and the "new colour" line on the video before it.',
    viewerPromise: 'Goes into the brief, the AI prompts and the platform versions\' "viewer promise".',
    centralMessage: 'The takeaway: the platform versions\' angle, the brief and the recording card start from it.',
    contentType: 'Short, long, e-book, poster... decides the steps\' wording (Record or Make) and which fields apply.',
    finalVideo: 'Ticks the Edit step; Review the finished video opens this file\'s review file.',
    status: 'Review, Ready and Published tick the steps; Ready puts it in the release backlog.',
  },
  outputs: {
    scheduledDate: 'Puts it in the release line (Videos → Next to release). A missed day moves the line on; a past day dropped on the calendar means released.',
    caption: 'The Publish step asks for one per platform version.',
  },
};
for (const [type, list] of Object.entries(FIELDS)) {
  for (const x of list) {
    if (x.level === 'simple' && !ESSENTIAL[type]?.includes(x.key)) x.level = 'advanced';
    if (CONNECTS[type]?.[x.key]) x.connects = CONNECTS[type][x.key];
  }
}

/** The content item's sections, in the order the work runs: plan (inputs), then make. */
/** The six steps of a content item (its tabs). Labels and the gaps per step live in readiness.js. */
export const CONTENT_SECTIONS = [['idea', 'Idea'], ['card', 'Card'], ['record', 'Record'], ['edit', 'Edit'], ['publish', 'Publish'], ['results', 'Results']];

/** The field a record's title lives in. */
export const TITLE_FIELD = { thoughts: 'text', ideas: 'title', projects: 'title', content: 'workingTitle', outputs: 'title',
  references: 'title', assets: 'name', tasks: 'title', publications: 'title', feedback: 'title' };

export const atLeast = (current, level) => LEVELS.indexOf(current) >= LEVELS.indexOf(level || 'simple');

/** Resolves a field's `options` against one workspace's configuration. */
export function optionsFor(field, type, config) {
  const src = field.options;
  if (Array.isArray(src)) return src.map((v) => ({ value: v, label: v }));
  if (src === 'status') return (config.statuses[type] || []).map((v) => ({ value: v, label: v }));
  if (src === 'categories') return config.categories.map((c) => ({ value: c.id, label: c.name }));
  if (Array.isArray(config[src])) return config[src].map((v) => ({ value: v, label: v }));
  throw new Error(`optionsFor: "${field.key}" names an unknown option source "${src}"`);
}

/** The fields to show at a given level, optionally for one content section. */
export function visibleFields(type, level, section) {
  return FIELDS[type].filter((x) => atLeast(level, x.level) && (!section || x.section === section));
}
