// The stage process: thought -> idea -> plan -> educate -> evaluate -> goal. Stages are
// workspace data (process-data.js holds the default). Nothing here ever blocks a move:
// prompts and scores are suggestions, a project can go to any stage, forwards or back.

import { DEFAULT_STAGES, DEFAULT_SCORECARD } from './process-data.js';
import { addDays } from './workflow.js';

/** The levels of work, by how much time and energy they take. */
export const GROUPS = ['Thought', 'Idea', 'Plan', 'Educate', 'Evaluate', 'Goal'];

export const defaultProcess = () => ({ stages: structuredClone(DEFAULT_STAGES), scorecard: structuredClone(DEFAULT_SCORECARD) });

export const sortedStages = (process) => [...(process?.stages || [])].sort((a, b) => a.n - b.n);
export const stagesIn = (process, group) => sortedStages(process).filter((s) => s.group === group);
export const stageById = (process, id) => (process?.stages || []).find((s) => s.id === id) || null;

/** The prompts offered when a thought is weighed up: the first Thought stage's questions. */
export const passportPrompts = (process) => stagesIn(process, 'Thought')[0]?.prompts || [];

/** The stage a project starts on when it grows out of an idea: the first Plan stage. */
export const firstPlanStage = (process) => stagesIn(process, 'Plan')[0] || sortedStages(process)[0] || null;

export function daysBetween(a, b) {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86400000);
}

/**
 * Moves a project to any stage. The time spent in the stage it leaves is kept in the
 * log - that log is what later replaces the placeholder estimates with your own.
 */
export function moveStage(project, stageId, { reason = '', today } = {}) {
  if (project.stageId === stageId) return project;
  const log = [...(project.stageLog || [])];
  const open = log.at(-1);
  if (open && !open.left) log[log.length - 1] = { ...open, left: today };
  log.push({ stageId, entered: today, left: '', reason });
  return { ...project, stageId, stageLog: log };
}

/** Notes the done-by forecast on the current stage visit, so the page can say how it moved since. */
export function stampForecast(project, date) {
  const log = [...(project.stageLog || [])];
  if (!log.length || log.at(-1).forecast) return project;
  log[log.length - 1] = { ...log.at(-1), forecast: date };
  return { ...project, stageLog: log };
}

/** Days the forecast moved since this stage began: positive = later, negative = earlier. */
export function forecastDrift(project, date) {
  const was = (project.stageLog || []).at(-1)?.forecast;
  return was && date ? { was, days: daysBetween(was, date) } : null;
}

/**
 * Finished visits to one stage across every project, in days. A same-day pass-through
 * (clicking past a stage) is not a measurement, so it is left out.
 * ponytail: whole days only - add hours if same-day stages need learning too.
 */
export function stageSamples(projects, stageId) {
  return projects.flatMap((p) => (p.stageLog || []).filter((e) => e.stageId === stageId && e.left)
    .map((e) => daysBetween(e.entered, e.left)).filter((d) => d > 0));
}

/** Your own average once there are two finished visits; the placeholder until then. */
export function estimateDays(stage, samples = []) {
  if (samples.length >= 2) return { days: Math.round(samples.reduce((a, b) => a + b, 0) / samples.length), source: 'yours', samples: samples.length };
  const n = Number(stage.days);
  return { days: Number.isFinite(n) && n >= 0 ? n : 1, source: 'placeholder', samples: samples.length };
}

/**
 * When the project can be done if the process is followed: the rest of the current
 * stage plus every stage after it, up to the stage marked `finish` (or the last).
 * Counted forwards from today; going back a stage simply makes this later.
 */
export function projectForecast(project, process, allProjects = [], today) {
  const stages = sortedStages(process);
  if (!stages.length) return null;
  const finish = Math.max(0, stages.findIndex((s) => s.finish));
  const end = finish || stages.length - 1;
  let cur = stages.findIndex((s) => s.id === project.stageId);
  if (cur < 0) cur = 0;
  if (cur > end) return { past: true, date: '', remaining: 0, stages: [] };
  const open = (project.stageLog || []).at(-1);
  const spent = open && !open.left && open.stageId === stages[cur].id ? Math.max(0, daysBetween(open.entered, today)) : 0;
  let remaining = 0;
  const rows = [];
  for (let i = cur; i <= end; i++) {
    const est = estimateDays(stages[i], stageSamples(allProjects, stages[i].id));
    // running over is normal: a stage still open is assumed to need at least one more day
    const left = i === cur ? Math.max(est.days > 0 || spent > 0 ? 1 : 0, est.days - spent) : est.days;
    remaining += left;
    rows.push({ stage: stages[i], ...est, left });
  }
  return { past: false, date: addDays(today, remaining), remaining, finishStage: stages[end], stages: rows };
}

/** Scores are optional, 1-10. The average counts only what was answered - a blank never drags it down. */
export function scoreSummary(scores = {}, scorecard = []) {
  const vals = scorecard.map((c) => Number(scores[c.id])).filter((v) => Number.isFinite(v) && v >= 1 && v <= 10);
  return { answered: vals.length, total: scorecard.length,
    average: vals.length ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10 : null };
}

/** How many of a set of prompts have an answer. Purely informative. */
export const answeredCount = (answers = {}, prompts = []) => prompts.filter((_, i) => String(answers[i] ?? '').trim()).length;
