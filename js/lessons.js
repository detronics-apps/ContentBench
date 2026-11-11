// Lessons: every issue becomes a check. What happened, how it was solved, and the one question to ask at that step so
// it doesn't happen again. The checks show on every video's step as an optional list - they never block anything.
// Pure - no DOM. Stored on the workspace: config.lessons = [{ id, step, check, issue, fix, date }].

import { newId, nowIso, getRecord, updateRecord } from './model.js';
import { STEPS } from './readiness.js';

export const LESSON_STEPS = STEPS.map(([id, label]) => [id, label]);

export const lessonsOf = (ws) => ws.config.lessons || [];

/** This step's checks, in the order they were learned. */
export const lessonsFor = (ws, step) => lessonsOf(ws).filter((l) => l.step === step);

const withLessons = (ws, lessons) => ({ ...ws, config: { ...ws.config, lessons } });

/** Adds a lesson. The check question is what matters; the issue and fix say why it is there. */
export function addLesson(ws, { step = 'card', check = '', issue = '', fix = '' } = {}, now = nowIso()) {
  const lesson = { id: newId('lesson'), step, check: String(check).trim(), issue: String(issue).trim(), fix: String(fix).trim(), date: now.slice(0, 10) };
  return { ws: withLessons(ws, [...lessonsOf(ws), lesson]), lesson };
}

export const updateLesson = (ws, id, patch) => withLessons(ws, lessonsOf(ws).map((l) => (l.id === id ? { ...l, ...patch } : l)));
export const removeLesson = (ws, id) => withLessons(ws, lessonsOf(ws).filter((l) => l.id !== id));

/** A video's ticks for one step's checks: how many of them were looked at. */
export function checksDone(ws, c, step) {
  const list = lessonsFor(ws, step);
  const ticked = list.filter((l) => c.checks?.[l.id]).length;
  return { ticked, total: list.length };
}

/** Ticks (or unticks) one check on one video. A tick is a note to self, never a gate. */
export function tickCheck(ws, contentId, lessonId, on, now = nowIso()) {
  const c = getRecord(ws, 'content', contentId);
  if (!c) return ws;
  const checks = { ...(c.checks || {}) };
  if (on) checks[lessonId] = now.slice(0, 10); else delete checks[lessonId];
  return updateRecord(ws, 'content', contentId, { checks }, now);
}
