// Beyond video: a grid of your categories against courses, e-books / PDFs, posters, LinkedIn and Instagram posts.
// Every cell lists what exists and starts a new one in that category.

import { el } from './dom.js';
import * as M from '../model.js';
import { EXTRA_KINDS, extrasGrid, withExtraTypes } from '../extras.js';
import { createOutput } from '../content.js';
import { ws as currentWs, commitWs } from './store.js';
import { card, badge, button } from './forms.js';
import { go } from './records.js';

/** A new item of `kind` in category `catId`; social kinds also get their platform output. */
function startOne(kind, catId) {
  let made;
  commitWs((w0) => {
    // workspaces made before these kinds existed get them in their content types
    const w = { ...w0, config: { ...w0.config, contentTypes: withExtraTypes(w0.config.contentTypes) } };
    const r = M.createRecord(w, 'content', { workingTitle: `New ${kind.one}`, contentType: kind.contentType, categoryId: catId,
      status: w.config.statuses.content[0] || '', offer: kind.sellable ? 'Not decided' : '', captures: [] });
    made = r.record;
    const plat = kind.platform && w.platforms.find((p) => p.name === kind.platform);
    const fmt = plat && (plat.formats.find((f) => /post|image/i.test(f.name)) || plat.formats[0]);
    return plat ? createOutput(r.ws, made.id, { platformId: plat.id, formatId: fmt?.id || '' }).ws : r.ws;
  }, { render: false });
  go(`#/content/${made.id}`);
}

export function extrasModule() {
  const ws = currentWs();
  const rows = extrasGrid(ws);
  const totals = EXTRA_KINDS.map((k) => rows.reduce((n, r) => n + r.cells.find((c) => c.kind.id === k.id).items.length, 0));
  const paid = rows.reduce((n, r) => n + r.cells.reduce((m, c) => m + c.paid, 0), 0);
  const free = rows.reduce((n, r) => n + r.cells.reduce((m, c) => m + c.free, 0), 0);
  return el('div', { class: 'stack' }, [
    card('Beyond video', [
      el('p', { class: 'muted small', text: 'Courses, e-books and PDFs that sum up an idea, posters, and LinkedIn and Instagram posts - per category. Each one is a content item with the same plan, make and release steps as a video. A video with an Instagram or LinkedIn output counts there too.' }),
      el('p', { class: 'small' }, [`${totals.reduce((a, b) => a + b, 0)} items · `, `${free} free · ${paid} paid`,
        el('span', { class: 'muted', text: ' - free resources are part of the channel; keep the balance visible.' })]),
    ]),
    rows.length ? el('div', { class: 'extras-scroll' }, [el('table', { class: 'extras' }, [
      el('thead', {}, [el('tr', {}, [el('th', { text: 'Category' }), ...EXTRA_KINDS.map((k, i) => el('th', {}, [k.name, el('span', { class: 'muted small', text: ` ${totals[i]}` })]))])]),
      el('tbody', {}, rows.map((r) => el('tr', {}, [
        el('th', { scope: 'row' }, [r.cat.color ? el('span', { class: 'cat__dot', style: { background: r.cat.color } }) : null, ` ${r.cat.name}`]),
        ...r.cells.map((c) => el('td', {}, [
          ...c.items.map((x) => el('div', { class: 'extras__item' }, [el('a', { href: `#/content/${x.id}`, text: M.titleOf(x) }),
            x.offer === 'Paid' ? badge(x.price ? `paid ${x.price}` : 'paid', 'warn') : x.offer === 'Free' ? badge('free', 'ok') : null,
            x.status ? el('span', { class: 'muted small', text: ` ${x.status}` }) : null])),
          button('+', () => startOne(c.kind, r.cat.id), 'ghost small', { 'aria-label': `New ${c.kind.one} in ${r.cat.name}`, title: `New ${c.kind.one} in ${r.cat.name}`, 'data-field': `extras.${r.cat.id || 'none'}.${c.kind.id}` }),
        ])),
      ]))),
    ])]) : el('p', { class: 'muted', text: 'Add categories in Settings to start.' }),
  ]);
}
