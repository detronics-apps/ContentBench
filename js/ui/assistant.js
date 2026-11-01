// The assistant panel: build a prompt, paste the reply back as a suggestion, then
// accept, edit or reject it. No model is called from here - nothing leaves the browser.

import { el } from './dom.js';
import { actionsFor, buildPrompt, targetField, AI_ACTIONS } from '../ai.js';
import { addSuggestion, resolveSuggestion } from '../content.js';
import { FIELDS } from '../schema.js';
import { getRecord, updateRecord } from '../model.js';
import { commitWs } from './store.js';
import { button, card, copyText, badge } from './forms.js';

const fieldLabel = (type, key) => FIELDS[type].find((f) => f.key === key)?.label || key;

export function assistantPanel(type, record, ws) {
  const actions = actionsFor(type);
  if (!actions.length) return null;
  const save = (fn, render = true) => commitWs((w) => updateRecord(w, type, record.id, fn(getRecord(w, type, record.id))), { render });
  const pick = el('select', { class: 'input input--inline', 'data-field': `ai.${type}.action` },
    actions.map((a) => el('option', { value: a.id, text: a.label })));
  const reply = el('textarea', { class: 'input', rows: 4, 'data-field': `ai.${type}.reply`, placeholder: 'Paste the assistant\'s reply here' });
  const pending = (record.aiSuggestions || []).filter((s) => s.status === 'pending');

  return card('Assistant', [
    el('p', { class: 'muted small', text: 'Copy a prompt into the assistant you use (Claude, or any other). Paste its reply back as a suggestion - it stays beside your text until you accept it, and accepting adds to your text rather than replacing it.' }),
    el('div', { class: 'row' }, [pick,
      button('Copy prompt', () => copyText(buildPrompt(pick.value, ws, type, record), 'Prompt copied'), 'primary')]),
    reply,
    el('div', { class: 'row' }, [button('Add as suggestion', () => {
      if (!reply.value.trim()) return;
      const action = pick.value;
      save((r) => addSuggestion(r, { action, field: targetField(action, type), text: reply.value.trim() }));
    })]),
    ...pending.map((s) => {
      const text = el('textarea', { class: 'input input--ai', rows: 4, value: s.text, 'data-field': `ai.sug.${s.id}` });
      return el('div', { class: 'suggestion' }, [
        el('div', { class: 'row' }, [badge('AI suggestion', 'ai'), el('span', { class: 'small muted',
          text: `${AI_ACTIONS[s.action]?.label || 'Suggestion'} → adds to "${fieldLabel(type, s.field)}"` })]),
        el('div', { class: 'compare' }, [
          el('div', {}, [el('div', { class: 'small muted', text: 'Your current text' }), el('pre', { class: 'compare__mine', text: record[s.field] || '(empty)' })]),
          el('div', {}, [el('div', { class: 'small muted', text: 'Suggestion (editable)' }), text]),
        ]),
        el('div', { class: 'row' }, [
          button('Accept', () => save((r) => resolveSuggestion(r, s.id, 'accepted', text.value)), 'primary'),
          button('Reject', () => save((r) => resolveSuggestion(r, s.id, 'rejected'))),
        ]),
      ]);
    }),
  ]);
}
