// The "How to use" content and first-run story, as data. Grow it with every feature.

/** App term -> the everyday words someone might search for instead. */
export const SEARCH_ALIASES = {
  idea: ['thought', 'note', 'inbox', 'brainstorm', 'jot', 'capture'],
  'content item': ['video', 'post', 'piece', 'episode', 'article', 'master'],
  'platform output': ['tiktok', 'youtube', 'instagram', 'reel', 'short', 'carousel', 'version', 'adaptation', 'cut'],
  workflow: ['process', 'steps', 'pipeline', 'checklist', 'stages'],
  storytelling: ['structure', 'hook', 'outline', 'narrative', 'beats', 'blocks'],
  workspace: ['profile', 'channel', 'account', 'brand', 'start over', 'reset', 'backup'],
  export: ['download', 'zip', 'package', 'share', 'send', 'backup', 'claude', 'assistant'],
  archive: ['hide', 'remove', 'delete', 'restore', 'bin'],
  planner: ['calendar', 'schedule', 'dates', 'deadline', 'due', 'drag', 'week', 'today', 'release'],
  structure: ['timeline', 'running time', 'length', 'seconds', 'intro', 'rework', 're-hook', 'variant', 'a/b'],
  assistant: ['ai', 'claude', 'chatgpt', 'prompt', 'suggestion'],
  reference: ['source', 'citation', 'link', 'evidence', 'fact check'],
};

export function searchText(text) {
  const low = String(text || '').toLowerCase();
  let extra = '';
  for (const [term, syns] of Object.entries(SEARCH_ALIASES)) if (low.includes(term)) extra += ` ${syns.join(' ')}`;
  return `${text} ${extra}`;
}

/** Every query word must appear - "export youtube" narrows, it does not widen. */
export function guideMatches(text, q) {
  if (!q) return true;
  const hay = searchText(text).toLowerCase();
  return q.toLowerCase().split(/\s+/).filter(Boolean).every((w) => hay.includes(w));
}

export const HOWTOS = [
  { id: 'deadline', category: 'Planner', title: 'Set a due date and get the steps dated for you', steps: [
    'Open Planner → Calendar. Videos without a date wait in "Not scheduled yet".',
    'Drag the "Due" chip onto the day the finished video should be ready (on a phone: tap the chip, then tap the day).',
    'Every step of its workflow is dated backwards from there, using each step\'s days. The toast says when you have to start.',
    'Planner → This week lists what is due today and over the next six days. Drag the chip again to move everything at once.'] },
  { id: 'release-dates', category: 'Planner', title: 'Plan TikTok, Reels and YouTube on their own schedules', steps: [
    'Each platform output (a TikTok, a Reel, a long-form upload) is its own chip on the calendar.',
    'Drag each one to its release day. Filter the calendar by platform with the chips above it.',
    'Chip colours are the content\'s category - set the colours in Settings.'] },
  { id: 'timeline', category: 'Story', title: 'Lay out the video as a timeline and test a variant', steps: [
    'Give each block of a storytelling template a duration, like 0:15. The bar shows each block\'s share of the running time.',
    'Make it the default (Templates → the template → Make this the default) and new videos start with a copy.',
    'On a video\'s Story section, repeat a block (an extra re-hook) or change a duration. The bar compares it with the template.',
    'Liked it? "Save as a new template (variant)" keeps it to use on other videos; the default is untouched.'] },
  { id: 'capture', category: 'Ideas', title: 'Capture an idea quickly', steps: [
    'Type it into Quick capture in the sidebar (or the box on the Dashboard) and press Add.',
    'That is all - it lands in the Ideas inbox with your words kept exactly as typed.',
    'Open it later from Ideas to add a category, angle or research questions.'] },
  { id: 'idea-to-content', category: 'Ideas', title: 'Turn an idea into a content item', steps: [
    'Open the idea from the Ideas tab.',
    'Press "Develop into content". A content item is created and linked back to the idea.',
    'One idea can become several content items - press it again for another.'] },
  { id: 'link-project', category: 'Content', title: 'Link content to a project (or leave it standalone)', steps: [
    'Open the content item and stay on Overview.',
    'Under Links, tick the project. Untick to make it standalone again.',
    'The project lists the content automatically - the link is stored once.'] },
  { id: 'workflow', category: 'Content', title: 'Choose a workflow and storytelling template', steps: [
    'Open the content item.',
    'On Production, pick a workflow and press Start. On Story, pick a structure and press Use.',
    'The item keeps its own copy, so later template edits do not change it.'] },
  { id: 'outputs', category: 'Platforms', title: 'Make TikTok and YouTube versions of one piece', steps: [
    'Add platforms first under Platforms & Publishing (or press "Add example platforms").',
    'Open the content item, go to Outputs, choose a platform and format, and press Create output.',
    'Repeat for each platform. Each output starts from the master and can then be rewritten freely.'] },
  { id: 'master-changed', category: 'Platforms', title: 'Bring a master change into an output', steps: [
    'Edit the master content; outputs are never changed automatically.',
    'Open the output. A notice lists the fields whose master changed.',
    'Press "Use master" to take the new text, or "Keep mine" to keep your adaptation.'] },
  { id: 'export', category: 'Export', title: 'Export a content package for a collaborator or assistant', steps: [
    'Open the content item.',
    'In the sidebar, under Export, press "Download package (.zip)".',
    'Or "Copy assistant brief" to paste the whole package into an AI assistant as text.'] },
  { id: 'ai', category: 'Assistant', title: 'Use an AI assistant without losing your own words', steps: [
    'Open an idea, content item or output and find "Assistant" at the bottom.',
    'Pick an action and press "Copy prompt" - paste it into the assistant you use.',
    'Paste the reply back as a suggestion. Accept, edit or reject it; accepting adds to your text, never replaces it.'] },
  { id: 'reset', category: 'Workspace', title: 'Start fresh without losing the app', steps: [
    'Open Settings.',
    'Use "Reset data" to clear records but keep your setup, or "Reset configuration" for the opposite.',
    'Each asks first and says exactly what goes. Other workspaces are never touched.'] },
  { id: 'backup', category: 'Workspace', title: 'Back up or move a workspace', steps: [
    'Open Settings and press "Export workspace (.json)".',
    'On the other machine, press "Import workspace" and choose the file.',
    'The file is checked before anything is added; an import never replaces an existing workspace.'] },
];

export const FAQS = [
  { q: 'How are the step dates worked out?', a: 'Backwards from the due date. The last step is due on it; each earlier step is due when the next one has to start, using each step\'s days. Skipped steps take no time. Weekends are counted as normal days.' },
  { q: 'Why does a block show "no time yet"?', a: 'Its duration is blank or not a time. Use 15, 0:15, 1:30, 45s or 2m. The app never guesses a length.' },
  { q: 'Where is my data?', a: 'Only in this browser, on this device (localStorage). Nothing is uploaded. Export a workspace regularly as a backup.' },
  { q: 'Does the assistant run inside the app?', a: 'No. The app builds the prompt and keeps the reply as a suggestion; you run the assistant yourself. No integration is faked.' },
  { q: 'I edited a workflow template - why did my content item not change?', a: 'An item keeps the version it started with, on purpose. Its Production tab says when the template has moved on.' },
  { q: 'What is the difference between a content item and a platform output?', a: 'The content item is the idea of the piece. An output is one version of it for one platform and format. One item can have none, one or many.' },
  { q: 'Are the platform specs correct?', a: 'They are placeholders you edit. Each platform shows when you last verified it - specs change, so check before publishing.' },
  { q: 'What does archive do?', a: 'Hides a record from lists without deleting it. Turn on "Show archived" to see and restore it. Delete is permanent and asks first.' },
  { q: 'Why does an idea never show as overdue?', a: 'An idea is not a commitment. Only dated projects, content, outputs and tasks appear in the Planner.' },
  { q: 'What do Simple, Advanced and Expert change?', a: 'Only how many fields are shown. Nothing hidden is cleared, and every level saves the same data.' },
];

export const MENTAL_MODEL = [
  ['Idea → content → outputs', 'One idea can feed many content items; one item can become many platform versions.'],
  ['Templates are copied', 'A workflow or structure is copied into the item that uses it, so editing a template is always safe.'],
  ['Your words stay yours', 'Raw input is preserved, and assistant suggestions sit beside your text until you accept them.'],
  ['Workspace = your setup', 'Categories, platforms, templates and records belong to a workspace, never to the app.'],
];

export const FEATURES = [
  ['Deadline calendar', 'Planner → Calendar', 'Drag a video to its due day; its workflow steps are dated backwards.'],
  ['This week', 'Planner → This week', 'Overdue, today and the next six days, steps included.'],
  ['Release chips per platform', 'Planner → Calendar', 'Each TikTok, Reel and YouTube upload has its own date and category colour.'],
  ['Video timeline', 'Content → Story', 'The structure as a timed bar, compared with its template.'],
  ['Variant templates', 'Content → Story', 'Save a tweaked structure as a new template to test it.'],
  ['Quick capture', 'Sidebar → Quick capture', 'Jot an idea from any screen without leaving it.'],
  ['Related records', 'Sidebar → Related', 'Jump between an idea, its content and its outputs in both directions.'],
  ['Master drift', 'Output → notice', 'Shows which master fields changed since an output copied them.'],
  ['Content package', 'Sidebar → Export', 'A zip of Markdown files an outsider can read without guessing.'],
  ['Board view', 'Content Library → Board', 'Content grouped by status.'],
  ['Remove samples', 'Settings → Workspace', 'Strips every example record, keeping your own.'],
  ['Spec verification date', 'Platforms → platform', 'Records when you last checked a platform\'s limits.'],
  ['Detail levels', 'Bar under the header', 'Simple shows the essentials; Expert shows everything.'],
];

/** The first-run story: numbered starting actions, each a link into the app. */
export const ONBOARDING = [
  { title: 'Look around the example', text: 'You are in a labelled example workspace. Open "Why bridges hum" to see an idea carried all the way to two platform outputs.', href: '#/library' },
  { title: 'Capture your own idea', text: 'Type a thought into Quick capture. No form to fill in.', href: '#/ideas' },
  { title: 'Make it yours', text: 'In Settings, name your workspace and set your categories, series and audiences.', href: '#/settings' },
  { title: 'Start clean when ready', text: 'Create a blank workspace, or remove the samples. The app itself is never affected.', href: '#/settings' },
];

/** The "How this works" panel per module: the idea in plain language. main.js adds the live numbers. */
export const EXPLAIN = {
  dashboard: ['Your workspace at a glance', 'Active work, dates coming up and what you touched last. No scores and no streaks - just where things are.'],
  ideas: ['Ideas are cheap on purpose', 'An idea needs only a few words. Your original wording is kept untouched; summaries and interpretations sit beside it. Parking or rejecting an idea is a valid outcome.'],
  projects: ['A project is not a video', 'A project is a larger piece of work - a build, an investigation, a journey. It can produce several content items, or none.'],
  library: ['One piece, many versions', 'A content item is the idea of one piece of communication. Platform outputs are its versions; each item can have none, one or many.'],
  create: ['Work on the master first', 'Brief, message and promise come before any platform. Outputs copy the master when created and never change silently afterwards.'],
  content: ['Work on the master first', 'Brief, message and promise come before any platform. Outputs copy the master when created and never change silently afterwards.'],
  outputs: ['An adaptation that remembers its source', 'This output copied its master when it was made. When the master changes, you are told which fields, and you choose per field.'],
  production: ['Steps from a copied workflow', 'Each item follows its own copy of a workflow template. Required steps cannot be skipped; optional ones can. Tasks are separate actionable items made from steps.'],
  planner: ['Pick the date, the steps follow', 'Put a video\'s Due chip on a day and its workflow is dated backwards from it. Platform releases are their own chips with their own dates. Ideas never get dates, so an idea can never be overdue.'],
  platforms: ['A platform holds formats', 'YouTube is a platform; long-form and Shorts are its formats, each with its own specs. Specs are editable and dated, because platforms change them.'],
  performance: ['Look back, then capture forward', 'Record what happened and what you learned. Follow-up ideas go back into Ideas.'],
  templates: ['Templates are copied, never linked', 'Editing a template bumps its version. Items already using it keep the version they started with.'],
  settings: ['The workspace is yours, the app is not', 'Categories, colours, voice and AI instructions are workspace data. Resetting a workspace never touches the app or other workspaces.'],
  assets: ['Sources and files as records', 'A reference or asset is entered once and linked wherever it is used, rather than pasted into every script.'],
  guide: ['Search in your own words', 'The search knows that "tiktok version" means a platform output and "backup" means export.'],
};
