// Workflow and storytelling templates, and the instances made from them.
// A template is reusable; an instance is a copy taken at one version. Editing a
// template bumps its version and never reaches into the instances already made.

import { newId, nowIso, moveItem, removeItem, patchItem, duplicateItem } from './model.js';

/* ------------------------------------------------------------- workflows */

export function makeStep(fields = {}) {
  return {
    id: newId('step'), name: 'New step', description: '', instructions: '',
    optional: false, skippable: true, inputs: '', expectedOutput: '', checklist: [],
    dependsOn: [], effort: '', aiPrompt: '',
    ...fields,
  };
}

export function makeWorkflowTemplate({ name = 'New workflow', description = '', steps = [], ...rest } = {}, now = nowIso()) {
  return { id: newId('wf'), name, description, version: 1, modified: now, ...rest,
    steps: steps.map((s) => makeStep(typeof s === 'string' ? { name: s } : s)) };
}

const bump = (tpl, patch, now) => ({ ...tpl, ...patch, version: tpl.version + 1, modified: now });

/** Every template edit goes through these, so the version always moves. */
export const editTemplate = (tpl, patch, now = nowIso()) => bump(tpl, patch, now);
export const addStep = (tpl, fields, now = nowIso()) => bump(tpl, { steps: [...tpl.steps, makeStep(fields)] }, now);
export const updateStep = (tpl, id, patch, now = nowIso()) => bump(tpl, { steps: patchItem(tpl.steps, id, patch) }, now);
export const moveStep = (tpl, id, delta, now = nowIso()) => bump(tpl, { steps: moveItem(tpl.steps, id, delta) }, now);
export const duplicateStep = (tpl, id, now = nowIso()) => bump(tpl, { steps: duplicateItem(tpl.steps, id, 'step') }, now);
export function removeStep(tpl, id, now = nowIso()) {
  const steps = removeItem(tpl.steps, id).map((s) => ({ ...s, dependsOn: s.dependsOn.filter((d) => d !== id) }));
  return bump(tpl, { steps }, now);
}

/** A copy of the whole template under a new name, starting again at version 1. */
export function duplicateTemplate(tpl, now = nowIso()) {
  return { ...structuredClone(tpl), id: newId(tpl.blocks ? 'story' : 'wf'), name: `${tpl.name} (copy)`, version: 1, modified: now };
}

/** The process actually followed for one item, frozen at the template's current version. */
export function instantiateWorkflow(tpl, now = nowIso()) {
  return {
    templateId: tpl.id, templateName: tpl.name, templateVersion: tpl.version, created: now,
    steps: tpl.steps.map((s) => ({ ...structuredClone(s), status: 'todo', checks: s.checklist.map(() => false) })),
  };
}

export const STEP_STATUSES = ['todo', 'done', 'skipped'];

export const canSkip = (step) => step.optional || step.skippable;

/** A required, unskippable step asked to skip is refused rather than half-applied. */
export function setStepStatus(inst, stepId, status) {
  if (!STEP_STATUSES.includes(status)) throw new Error(`setStepStatus: unknown status "${status}"`);
  return { ...inst, steps: inst.steps.map((s) => {
    if (s.id !== stepId) return s;
    if (status === 'skipped' && !canSkip(s)) return s;
    return { ...s, status };
  }) };
}

export function toggleCheck(inst, stepId, index) {
  return { ...inst, steps: inst.steps.map((s) => (s.id !== stepId ? s
    : { ...s, checks: s.checks.map((c, i) => (i === index ? !c : c)) })) };
}

/** Steps still to do whose dependencies are not yet finished. */
export function blockedSteps(inst) {
  const finished = new Set(inst.steps.filter((s) => s.status !== 'todo').map((s) => s.id));
  return inst.steps.filter((s) => s.status === 'todo' && s.dependsOn.some((d) => !finished.has(d))).map((s) => s.id);
}

export function progress(inst) {
  const steps = inst?.steps || [];
  const done = steps.filter((s) => s.status === 'done').length;
  const skipped = steps.filter((s) => s.status === 'skipped').length;
  const requiredLeft = steps.filter((s) => s.status === 'todo' && !s.optional).length;
  const next = steps.find((s) => s.status === 'todo') || null;
  return { done, skipped, total: steps.length, requiredLeft, next };
}

/** Reports that the template moved on since this instance was made. Told, never applied. */
export function templateDrift(inst, tpl) {
  if (!inst || !tpl || inst.templateId !== tpl.id) return null;
  return tpl.version > inst.templateVersion ? { from: inst.templateVersion, to: tpl.version } : null;
}

/* --------------------------------------------------------------- stories */

export function makeBlock(fields = {}) {
  return {
    id: newId('blk'), name: 'New block', purpose: '', prompt: '', script: '', duration: '',
    visual: '', assets: '', references: '', transition: '', notes: '',
    ...fields,
  };
}

export function makeStoryTemplate({ name = 'New structure', description = '', blocks = [], ...rest } = {}, now = nowIso()) {
  return { id: newId('story'), name, description, version: 1, modified: now, ...rest,
    blocks: blocks.map((b) => makeBlock(typeof b === 'string' ? { name: b } : b)) };
}

export const addBlock = (tpl, fields, now = nowIso()) => bump(tpl, { blocks: [...tpl.blocks, makeBlock(fields)] }, now);
export const updateBlock = (tpl, id, patch, now = nowIso()) => bump(tpl, { blocks: patchItem(tpl.blocks, id, patch) }, now);
export const moveBlock = (tpl, id, delta, now = nowIso()) => bump(tpl, { blocks: moveItem(tpl.blocks, id, delta) }, now);
export const removeBlock = (tpl, id, now = nowIso()) => bump(tpl, { blocks: removeItem(tpl.blocks, id) }, now);
/** Repeating a block (a second re-hook, another story section) is a duplicate. */
export const repeatBlock = (tpl, id, now = nowIso()) => bump(tpl, { blocks: duplicateItem(tpl.blocks, id, 'blk') }, now);

/** A structure being filled in for one content item or output. Its blocks are its own. */
export function instantiateStory(tpl, now = nowIso()) {
  return { templateId: tpl.id, templateName: tpl.name, templateVersion: tpl.version, created: now,
    blocks: tpl.blocks.map((b) => ({ ...structuredClone(b), id: newId('blk') })) };
}

/** Block edits on an instance - the same list helpers, no version (an instance is not a template). */
export const instanceBlocks = {
  add: (inst, fields) => ({ ...inst, blocks: [...inst.blocks, makeBlock(fields)] }),
  update: (inst, id, patch) => ({ ...inst, blocks: patchItem(inst.blocks, id, patch) }),
  move: (inst, id, delta) => ({ ...inst, blocks: moveItem(inst.blocks, id, delta) }),
  remove: (inst, id) => ({ ...inst, blocks: removeItem(inst.blocks, id) }),
  repeat: (inst, id) => ({ ...inst, blocks: duplicateItem(inst.blocks, id, 'blk') }),
};
