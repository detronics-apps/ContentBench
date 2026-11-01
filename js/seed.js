// Example data. Every bit of it is workspace data a creator can edit or delete -
// nothing in the application reads these names. Sample records carry `sample: true`.

import { blankWorkspace, createRecord, updateRecord, nowIso } from './model.js';
import { makeWorkflowTemplate, makeStoryTemplate, instantiateWorkflow, instantiateStory, setStepStatus } from './workflow.js';
import { makePlatform, createOutput } from './content.js';

const VERIFY = 'check the platform\'s current spec';

export function exampleWorkflows(now = nowIso()) {
  return [
    makeWorkflowTemplate({
      name: 'Creator workflow (detailed)', description: 'Example: idea to lessons learned. Edit, reorder or remove any step.',
      steps: [
        { name: 'Capture the idea', instructions: 'Write it down as it came to you.' },
        { name: 'Develop the concept and viewer value' },
        { name: 'Research and challenge the idea', checklist: ['List claims', 'Find the best counterargument'] },
        { name: 'Define the story and central message' },
        { name: 'Script, outline or talking points' },
        { name: 'Hook, re-hooks, ending and CTA' },
        { name: 'Plan visuals and supporting assets', optional: true },
        { name: 'Gather references and verify claims', skippable: false, checklist: ['Every claim has a reference', 'References marked verified'] },
        { name: 'Record or create' },
        { name: 'Edit and assemble' },
        { name: 'Review factual, legal and quality requirements', skippable: false },
        { name: 'Prepare platform outputs and publishing packages' },
        { name: 'Publish' },
        { name: 'Evaluate performance and feedback', optional: true },
        { name: 'Record lessons and follow-up content', optional: true },
      ],
    }, now),
    makeWorkflowTemplate({
      name: 'Lightweight', description: 'Example: for quick pieces that need no ceremony.',
      steps: ['Outline', 'Record', 'Edit', 'Publish'],
    }, now),
  ];
}

export function exampleStories(now = nowIso()) {
  return [
    makeStoryTemplate({ name: 'Short-form (example)', description: 'One possible short structure - not a rule for any platform.',
      blocks: [
        { name: 'Hook', purpose: 'Stop the scroll in the first seconds.' },
        { name: 'Re-hook', purpose: 'Give a reason to keep watching.' },
        { name: 'Main point' },
        { name: 'Re-hook or new development' },
        { name: 'Explanation / payoff' },
        { name: 'CTA' },
      ] }, now),
    makeStoryTemplate({ name: 'Long-form (example)', description: 'One possible long structure - not a rule for any platform.',
      blocks: ['Opening hook', 'Context and problem', 'Investigation or story setup', 'Main sections',
        'Examples and demonstrations', 'Complications, limitations or counterarguments',
        'Resolution and conclusion', 'Viewer takeaway', 'CTA'] }, now),
  ];
}

/** Placeholder specs, deliberately unverified: platforms change their limits. */
export function examplePlatforms() {
  return [
    makePlatform({ name: 'TikTok', notes: 'Example profile. Values are placeholders.', checklist: ['Captions burned in or added', 'Cover chosen'],
      metadataFields: ['Caption', 'Hashtags'],
      formats: [{ name: 'Short-form video', aspectRatio: '9:16', resolution: '1080x1920', duration: VERIFY, safeZones: 'Keep text clear of the right-hand buttons and bottom caption', checklist: ['Hook in first seconds'] }] }),
    makePlatform({ name: 'YouTube', notes: 'Example profile. Values are placeholders.', checklist: ['Disclosures set', 'End screen'],
      metadataFields: ['Title', 'Description', 'Tags', 'Chapters', 'Links'],
      formats: [
        { name: 'Long-form video', aspectRatio: '16:9', resolution: '3840x2160 or 1920x1080', duration: 'no fixed limit (verify)', cover: 'Thumbnail 16:9', checklist: ['Chapters in description', 'Thumbnail made'] },
        { name: 'Short', aspectRatio: '9:16', resolution: '1080x1920', duration: VERIFY },
      ] }),
    makePlatform({ name: 'Instagram', notes: 'Example profile. Values are placeholders.', metadataFields: ['Caption', 'Hashtags'],
      formats: [
        { name: 'Reel', aspectRatio: '9:16', resolution: '1080x1920', duration: VERIFY, cover: 'Cover crop also shown 1:1 / 4:5 in grid' },
        { name: 'Carousel', aspectRatio: '4:5 or 1:1', resolution: '1080x1350', duration: 'n/a', checklist: ['Slide 1 works alone'] },
      ] }),
  ];
}

const addDays = (iso, n) => new Date(Date.parse(iso) + n * 86400000).toISOString().slice(0, 10);

/** A complete example workspace - configuration plus clearly labelled sample records. */
export function exampleWorkspace(now = nowIso()) {
  const today = now.slice(0, 10);
  let ws = blankWorkspace({ name: 'Example workspace', description: 'Sample configuration and records to explore. Remove the samples or start a blank workspace when you are ready.' }, now);
  const cat = (name, color) => ({ id: `cat_${name.toLowerCase().replace(/\W+/g, '')}`, name, color });
  ws = { ...ws,
    config: { ...ws.config,
      identity: { ...ws.config.identity, channelName: 'Example Channel', tagline: 'How everyday things actually work',
        philosophy: 'Curiosity first. Show the evidence, admit what we do not know.' },
      categories: [cat('Science', '#2f6e94'), cat('Making', '#1f7a3d'), cat('Discussion', '#8a5a00')],
      series: ['Everyday Physics', 'Bench Notes'],
      audiences: ['Curious beginners', 'Hobbyist makers'],
      tags: ['wind', 'bridges', 'soldering'],
      voice: { tone: 'Plain, warm, precise', communication: 'Explain before naming things', hookStyles: 'A question the viewer has had themselves' },
      aiInstructions: 'Use plain language. Never invent sources or statistics. Mark anything uncertain as [VERIFY].',
    },
    workflows: exampleWorkflows(now), stories: exampleStories(now), platforms: examplePlatforms() };
  const [detailed, light] = ws.workflows;
  const [short, long] = ws.stories;
  const yt = ws.platforms.find((p) => p.name === 'YouTube');
  const tt = ws.platforms.find((p) => p.name === 'TikTok');
  const S = { sample: true };
  const add = (type, fields) => { const r = createRecord(ws, type, { ...S, ...fields }, now); ws = r.ws; return r.record; };

  const idea = add('ideas', { title: 'Why do bridges hum in the wind?', rawInput: 'saw a video of a bridge singing in wind - why? vortex thing? could demo with a fan + string',
    status: 'Exploring', categoryId: 'cat_science', series: 'Everyday Physics', audience: 'Curious beginners', tags: ['wind', 'bridges'] });
  add('ideas', { title: 'A history of the paperclip', rawInput: 'paperclip history - maybe one day', status: 'Parked', categoryId: 'cat_discussion' });
  add('ideas', { title: 'Soldering fumes - how bad are they?', rawInput: 'question from a viewer about fume extraction', status: 'Inbox', categoryId: 'cat_making' });
  const project = add('projects', { title: 'Build a home wind tunnel', description: 'A small tunnel for filming airflow demos.', status: 'Active',
    stage: 'Design', ideaIds: [idea.id], startDate: today, targetDate: addDays(today, 42),
    milestones: [{ id: 'ms_frame', name: 'Frame built', date: addDays(today, 10), done: false }, { id: 'ms_smoke', name: 'Smoke test', date: addDays(today, 24), done: false }] });
  add('projects', { title: 'Workshop reorganisation', description: 'A project with no content - and that is fine.', status: 'Proposed' });
  const ref = add('references', { title: 'Example reference - replace with a real source', author: '', url: '', status: 'Unverified',
    notes: 'Placeholder. This app never invents sources.' });
  const asset = add('assets', { name: 'Fan and string demo footage (example)', assetType: 'Footage', location: 'Footage/fan-demo/', status: 'Needed' });

  const content = add('content', { workingTitle: 'Why bridges hum', contentType: 'Long-form video', status: 'Scripting',
    categoryId: 'cat_science', series: 'Everyday Physics', audience: 'Curious beginners', targetDate: addDays(today, 21),
    ideaIds: [idea.id], projectIds: [project.id], referenceIds: [ref.id], assetIds: [asset.id],
    brief: 'Explain why wind makes some structures sing, with a tabletop demo.',
    centralMessage: 'Wind passing a cable sheds alternating swirls that push it side to side.',
    viewerPromise: 'You will know why a bridge can hum, and be able to make a string do it at home.',
    script: '- Open on the humming bridge\n- Fan + string demo\n- Swirls explained\n- Why engineers care',
    workflow: setStepStatus(instantiateWorkflow(detailed, now), detailed.steps[0].id, 'done'), story: instantiateStory(long, now) });
  let r = createOutput(ws, content.id, { platformId: yt.id, formatId: yt.formats[0].id, storyId: long.id }, now);
  ws = updateRecord(r.ws, 'outputs', r.record.id, { ...S, scheduledDate: addDays(today, 28), caption: 'Why some bridges sing in the wind.' }, now);
  r = createOutput(ws, content.id, { platformId: tt.id, formatId: tt.formats[0].id, storyId: short.id }, now);
  ws = updateRecord(r.ws, 'outputs', r.record.id, { ...S, title: 'This bridge is singing', angle: 'Just the demo, no theory',
    scheduledDate: addDays(today, 30), hashtags: '#physics #howitworks' }, now);

  const quick = add('content', { workingTitle: 'Five soldering mistakes', contentType: 'Short-form video', status: 'Concept',
    categoryId: 'cat_making', workflow: instantiateWorkflow(light, now), story: instantiateStory(short, now),
    centralMessage: 'Most bad joints come from heat, not solder.' });
  r = createOutput(ws, quick.id, { platformId: tt.id, formatId: tt.formats[0].id, storyId: short.id }, now);
  ws = updateRecord(r.ws, 'outputs', r.record.id, S, now);
  return ws;
}
