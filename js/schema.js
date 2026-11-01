// The fields of each record type, as data. One generic form renders all of them,
// so a new field is one line here and no layout code.
//
//   type    text | textarea | select | date | url | number | tags
//   options 'status' (the workspace's statuses for this type), 'categories',
//           a config list name ('series', 'audiences', ...), or a literal array
//   level   simple | advanced | expert - the least detail level that shows it
//   ai      true when the field holds machine-suggested text, kept apart from the creator's

export const LEVELS = ['simple', 'advanced', 'expert'];

const f = (key, label, type = 'text', extra = {}) => ({ key, label, type, level: 'simple', ...extra });
const adv = { level: 'advanced' };

export const FIELDS = {
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
    f('stage', 'Current stage'),
    f('projectType', 'Project type', 'select', { options: 'projectTypes', ...adv }),
    f('problem', 'Problem or opportunity', 'textarea', adv),
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
    f('workingTitle', 'Working title', 'text', { section: 'overview' }),
    f('contentType', 'Content type', 'select', { options: 'contentTypes', section: 'overview' }),
    f('status', 'Status', 'select', { options: 'status', section: 'overview' }),
    f('targetDate', 'Target date', 'date', { section: 'overview' }),
    f('categoryId', 'Primary category', 'select', { options: 'categories', section: 'overview', ...adv }),
    f('series', 'Series', 'select', { options: 'series', section: 'overview', ...adv }),
    f('audience', 'Intended audience', 'select', { options: 'audiences', section: 'overview', ...adv }),
    f('tags', 'Tags', 'tags', { section: 'overview', ...adv }),
    f('brief', 'Brief', 'textarea', { section: 'overview', hint: 'What this piece is, for whom, and why now.' }),
    f('centralMessage', 'Central idea or message', 'textarea', { section: 'concept' }),
    f('viewerPromise', 'Viewer promise', 'textarea', { section: 'concept', hint: 'What the viewer will have by the end that they did not have at the start.' }),
    f('masterConcept', 'Master concept', 'textarea', { section: 'concept', ...adv }),
    f('scriptFormat', 'Form', 'select', { options: ['Talking points', 'Outline', 'Full script'], section: 'script' }),
    f('script', 'Script, outline or talking points', 'textarea', { section: 'script', rows: 14 }),
    f('hooks', 'Opening hook options', 'textarea', { section: 'hooks' }),
    f('rehooks', 'Re-hooks', 'textarea', { section: 'hooks', ...adv }),
    f('ending', 'Ending', 'textarea', { section: 'hooks' }),
    f('cta', 'Call to action', 'textarea', { section: 'hooks' }),
    f('researchNotes', 'Research notes', 'textarea', { section: 'research' }),
    f('claimsToVerify', 'Claims to verify', 'textarea', { section: 'research', ...adv }),
    f('counterarguments', 'Counterarguments and limitations', 'textarea', { section: 'research', ...adv }),
    f('visualPlan', 'Visual plan', 'textarea', { section: 'visuals' }),
    f('productionNotes', 'Production instructions', 'textarea', { section: 'production' }),
    f('recordingNotes', 'Recording notes', 'textarea', { section: 'production', ...adv }),
    f('editingNotes', 'Editing notes', 'textarea', { section: 'production', ...adv }),
    f('reviewStatus', 'Review and approval', 'select', { options: ['Not reviewed', 'Changes needed', 'Approved'], section: 'production', ...adv }),
    f('notes', 'Notes', 'textarea', { section: 'history' }),
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

/** The content item's sections, in the order the work actually runs. */
export const CONTENT_SECTIONS = [
  ['overview', 'Overview'], ['concept', 'Concept'], ['story', 'Story'], ['script', 'Script'],
  ['hooks', 'Hooks & CTA'], ['research', 'Research'], ['visuals', 'Visuals & assets'],
  ['outputs', 'Outputs'], ['production', 'Production'], ['publishing', 'Publishing'],
  ['performance', 'Performance'], ['history', 'History & notes'],
];

/** The field a record's title lives in. */
export const TITLE_FIELD = { ideas: 'title', projects: 'title', content: 'workingTitle', outputs: 'title',
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
