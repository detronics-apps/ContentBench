// Generic building blocks: the schema-driven record form, link editor, list editors,
// dialogs. Nothing here knows what a "video" is - it renders whatever schema.js says.

import { EXTRA_TYPES } from '../extras.js';
import { isRecorded } from '../readiness.js';
import { el, clear, toast } from './dom.js';
import { FIELDS, optionsFor, visibleFields } from '../schema.js';
import { LINKS, TYPE_LABEL, titleOf, getRecord } from '../model.js';
import { timeline, formatSeconds } from '../workflow.js';
import { store } from './store.js';

export const href = (type, id) => `#/${type}/${id}`;
export const recordLink = (type, record) => el('a', { href: href(type, record.id), text: titleOf(record) });

export function badge(text, kind = '') {
  return el('span', { class: `badge ${kind ? `badge--${kind}` : ''}`, text });
}

export function catDot(ws, categoryId) {
  const c = ws.config.categories.find((x) => x.id === categoryId);
  return c ? el('span', { class: 'cat', title: c.name }, [el('span', { class: 'cat__dot', style: { background: c.color } }), c.name]) : null;
}

/** One control for one schema field. Text commits on change (blur), never on input. */
function control(type, fdef, record, ws, onPatch) {
  const key = `${type}.${fdef.key}`;
  const value = record[fdef.key];
  const commit = (v, render) => onPatch({ [fdef.key]: v }, render);
  if (fdef.type === 'textarea') {
    return el('textarea', { class: `input ${fdef.ai ? 'input--ai' : ''}`, rows: fdef.rows || 4, 'data-field': key, value: value || '',
      on: { change: (e) => commit(e.target.value, false) } });
  }
  if (fdef.type === 'select') {
    const opts = optionsFor(fdef, type, ws.config);
    // a value no longer in the list is shown, not silently replaced
    if (value && !opts.some((o) => o.value === value)) opts.push({ value, label: `${value} (not in settings)` });
    const node = el('select', { class: 'input', 'data-field': key, on: { change: (e) => commit(e.target.value, true) } },
      [el('option', { value: '', text: '—' }), ...opts.map((o) => el('option', { value: o.value, text: o.label }))]);
    node.value = value || '';
    return node;
  }
  if (fdef.type === 'multi') {
    const opts = optionsFor(fdef, type, ws.config);
    const picked = new Set(value || []);
    return el('div', { class: 'chipset' }, opts.map((o) => el('button', { class: 'chip', type: 'button', 'aria-pressed': String(picked.has(o.value)), text: o.label,
      'data-field': `${key}.${o.value}`, on: { click: () => commit(picked.has(o.value) ? [...picked].filter((x) => x !== o.value) : [...picked, o.value], true) } })));
  }
  if (fdef.type === 'tags') {
    return el('input', { class: 'input', 'data-field': key, value: (value || []).join(', '), placeholder: 'comma, separated',
      list: 'dl-tags', on: { change: (e) => commit(e.target.value.split(',').map((s) => s.trim()).filter(Boolean), false) } });
  }
  const input = el('input', { class: 'input', type: fdef.type === 'url' ? 'url' : fdef.type, 'data-field': key, value: value ?? '',
    on: { change: (e) => commit(fdef.type === 'number' ? (e.target.value === '' ? '' : Number(e.target.value)) : e.target.value, fdef.type === 'date') } });
  if (fdef.type === 'url' && value && /^https?:\/\//i.test(value)) {
    return el('div', { class: 'row' }, [input, el('a', { class: 'btn btn--small', href: value, target: '_blank', rel: 'noopener noreferrer', text: 'Open' })]);
  }
  return input;
}

/** The form for one record, at the reader's detail level, optionally one content section. */
export function recordForm(type, record, ws, onPatch, { section, group } = {}) {
  // a field can belong to a small group inside its section, and to one kind of item only
  const fits = (x) => (x.group || '') === (group || '') && (!x.kinds || (x.kinds === 'product' ? EXTRA_TYPES.includes(record.contentType) : isRecorded(record)));
  const fields = visibleFields(type, store.ui.level, section).filter(fits);
  const hidden = (section ? FIELDS[type].filter((x) => x.section === section) : FIELDS[type]).filter(fits).length - fields.length;
  return el('div', { class: 'form' }, [
    ...fields.map((f) => el(f.type === 'multi' ? 'div' : 'label', { class: `field ${f.ai ? 'field--ai' : ''}` }, [
      el('span', { class: 'field__label' }, [f.label, f.ai ? badge('AI - not your words', 'ai') : null]),
      control(type, f, record, ws, onPatch),
      f.hint ? el('span', { class: 'field__hint', text: f.hint }) : null,
      f.connects && store.ui.level === 'expert' ? el('span', { class: 'field__connects', text: `↳ ${f.connects}` }) : null,
    ])),
    hidden > 0 ? el('p', { class: 'muted small', text: `${hidden} more field${hidden === 1 ? '' : 's'} at a higher detail level (bar under the header). Nothing hidden is cleared.` }) : null,
  ]);
}

/** Every link this record stores: chips to navigate or remove, and a picker to add. */
export function linkEditor(type, record, ws, onLink, { only } = {}) {
  const fields = Object.entries(LINKS[type]).filter(([f]) => !only || only.includes(f));
  if (!fields.length) return null;
  return el('div', { class: 'links' }, fields.map(([fieldName, target]) => {
    const isList = fieldName.endsWith('Ids');
    const ids = isList ? record[fieldName] || [] : record[fieldName] ? [record[fieldName]] : [];
    const candidates = ws.records[target].filter((r) => !r.archived && !ids.includes(r.id) && !(target === type && r.id === record.id));
    const picker = el('select', { class: 'input input--inline', 'data-field': `${type}.${fieldName}.add`,
      on: { change: (e) => e.target.value && onLink(fieldName, e.target.value, true) } },
    [el('option', { value: '', text: `Link ${TYPE_LABEL[target][0].toLowerCase()}…` }),
      ...candidates.map((r) => el('option', { value: r.id, text: titleOf(r) }))]);
    return el('div', { class: 'links__row' }, [
      el('span', { class: 'links__label', text: TYPE_LABEL[target][isList ? 1 : 0] }),
      el('span', { class: 'chips' }, [
        ...ids.map((id) => getRecord(ws, target, id)).filter(Boolean).map((r) => el('span', { class: 'chip chip--link' }, [
          recordLink(target, r),
          el('button', { class: 'chip__x', type: 'button', 'aria-label': `Unlink ${titleOf(r)}`, text: '×', on: { click: () => onLink(fieldName, r.id, false) } }),
        ])),
        ids.length && !isList ? null : (candidates.length ? picker : el('span', { class: 'muted small', text: ids.length ? '' : 'None yet' })),
      ]),
    ]);
  }));
}

/** A list of short strings edited as one line each. */
export function linesField(label, list, onSave, { hint, key, rows = 4 } = {}) {
  return el('label', { class: 'field' }, [
    el('span', { class: 'field__label', text: label }),
    el('textarea', { class: 'input', rows, 'data-field': key || `lines.${label}`, value: (list || []).join('\n'),
      on: { change: (e) => onSave(e.target.value.split('\n').map((s) => s.trim()).filter(Boolean)) } }),
    el('span', { class: 'field__hint', text: hint || 'One per line.' }),
  ]);
}

/** A plain text field bound to one value, for configuration screens. */
export function textField(label, value, onSave, { key, multiline = false, type = 'text', hint, rows = 3 } = {}) {
  const attrs = { class: 'input', 'data-field': key || `cfg.${label}`, value: value ?? '', on: { change: (e) => onSave(e.target.value) } };
  return el('label', { class: 'field' }, [
    el('span', { class: 'field__label', text: label }),
    multiline ? el('textarea', { ...attrs, rows }) : el('input', { ...attrs, type }),
    hint ? el('span', { class: 'field__hint', text: hint }) : null,
  ]);
}

export function checkbox(label, checked, onToggle, key) {
  return el('label', { class: 'check' }, [
    el('input', { type: 'checkbox', checked, 'data-field': key || `chk.${label}`, on: { change: (e) => onToggle(e.target.checked) } }),
    el('span', { text: label }),
  ]);
}

export function emptyState(title, text, actions = []) {
  return el('div', { class: 'empty' }, [el('strong', { text: title }), el('p', { text }), actions.length ? el('div', { class: 'row' }, actions) : null]);
}

export const button = (text, onClick, kind = '', attrs = {}) =>
  el('button', { class: `btn ${kind ? `btn-${kind}` : ''}`, type: 'button', text, ...attrs, on: { click: onClick } });

/* ---------------------------------------------------------------- dialogs */

/** A modal. Buttons finish it directly rather than waiting on the `close` event,
 *  which Chromium ties to rendering and so can lag behind the click. */
function dialog(build) {
  const d = el('dialog', { class: 'dialog' });
  const shut = () => { if (d.open) d.close(); d.remove(); };
  d.append(...build(shut).filter(Boolean));
  d.addEventListener('close', () => d.remove());
  document.body.appendChild(d);
  d.showModal();
  return { d, shut };
}

/** Says exactly what goes and what stays, and resolves true only on an explicit yes. */
export function confirmDialog({ title, removes, keeps, confirm = 'Delete', danger = true }) {
  return new Promise((resolve) => {
    const { d } = dialog((shut) => {
      const finish = (ok) => { resolve(ok); shut(); };
      return [
        el('h2', { text: title }),
        removes ? el('p', {}, [el('strong', { text: 'Removes: ' }), removes]) : null,
        keeps ? el('p', {}, [el('strong', { text: 'Keeps: ' }), keeps]) : null,
        el('p', { class: 'muted small', text: 'This cannot be undone. Export first if you might want it back.' }),
        el('div', { class: 'row row--end' }, [
          button('Cancel', () => finish(false)),
          button(confirm, () => finish(true), danger ? 'danger' : 'primary', { 'data-field': 'dialog.confirm' }),
        ]),
      ];
    });
    d.addEventListener('close', () => resolve(false));    // Esc; a no-op once resolved
  });
}

export function infoDialog(title, paras, extra = null) {
  return dialog((shut) => [el('h2', { text: title }), ...paras.map((p) => (typeof p === 'string' ? el('p', { text: p }) : p)), extra,
    el('div', { class: 'row row--end' }, [button('Close', shut, 'primary', { 'data-field': 'dialog.close' })])]).d;
}

export async function copyText(text, what = 'Copied') {
  try { await navigator.clipboard.writeText(text); toast(`${what} to the clipboard.`); } catch {
    infoDialog('Copy this text', [el('textarea', { class: 'input', rows: 14, value: text, readonly: true })]);
  }
}

/** The video laid out as a bar: each block's width is its share of the running time. */
export function timelineBar(blocks, { label = '', against = null } = {}) {
  const t = timeline(blocks);
  const diff = against === null ? null : t.total - against;
  return el('div', { class: 'tl' }, [
    el('div', { class: 'tl__head' }, [
      label ? el('strong', { text: label }) : null,
      el('span', { class: 'muted', text: `${formatSeconds(t.total)} total` }),
      diff ? badge(`${diff > 0 ? '+' : '−'}${formatSeconds(Math.abs(diff))} vs template`, diff > 0 ? 'warn' : 'ok') : null,
      t.untimed.length ? el('span', { class: 'small muted', text: `· no time yet: ${t.untimed.join(', ')}` }) : null,
    ]),
    t.total ? el('div', { class: 'tl__bar', role: 'img', 'aria-label': `${label || 'Timeline'}: ${t.segments.map((s) => `${s.name} ${formatSeconds(s.seconds)}`).join(', ')}` },
      t.segments.map((s, i) => el('div', { class: `tl__seg tl__seg--${i % 5}`, style: { flexGrow: String(s.seconds), flexBasis: '0' },
        title: `${s.name}: ${formatSeconds(s.start)}–${formatSeconds(s.start + s.seconds)} (${formatSeconds(s.seconds)})` },
      [el('span', { text: s.name }), el('span', { class: 'muted', text: formatSeconds(s.seconds) })])))
      : el('p', { class: 'small muted', text: 'Give blocks a duration (e.g. 0:15) to see the timeline.' }),
    t.total ? el('div', { class: 'tl__ruler' }, [el('span', { text: '0:00' }), el('span', { text: formatSeconds(t.total / 2) }), el('span', { text: formatSeconds(t.total) })]) : null,
  ]);
}

/** Shared section card. */
export const card = (title, kids, attrs = {}) => el('section', { class: 'card', ...attrs }, [title ? el('h2', { class: 'card__title', text: title }) : null, ...kids]);

export { clear };
