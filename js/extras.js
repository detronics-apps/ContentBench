// Beyond video: courses, e-books and PDFs, posters, and social posts - tracked per category.
// Each is a content item with its own content type, so it gets the same plan / make / release flow as a video.
// Pure - no DOM.

export const EXTRA_KINDS = [
  { id: 'course', name: 'Courses', one: 'course', contentType: 'Course', sellable: true },
  { id: 'ebook', name: 'E-books & PDFs', one: 'e-book / PDF', contentType: 'E-book / PDF', sellable: true },
  { id: 'poster', name: 'Posters', one: 'poster', contentType: 'Poster', sellable: true },
  // social: a standalone post, or any item (a video too) that has an output on that platform - an Instagram reel counts here
  { id: 'linkedin', name: 'LinkedIn posts', one: 'LinkedIn post', contentType: 'LinkedIn post', platform: 'LinkedIn' },
  { id: 'instagram', name: 'Instagram posts & reels', one: 'Instagram post', contentType: 'Instagram post', platform: 'Instagram' },
];

export const EXTRA_TYPES = EXTRA_KINDS.map((k) => k.contentType);
export const OFFERS = ['Free', 'Paid', 'Not decided'];

/** Does content item `c` count under `kind`? */
export function isKind(ws, c, kind) {
  if (c.contentType === kind.contentType) return true;
  if (!kind.platform) return false;
  const plat = ws.platforms.find((p) => p.name === kind.platform);
  return !!plat && ws.records.outputs.some((o) => o.contentId === c.id && o.platformId === plat.id && !o.archived);
}

/**
 * Rows of categories (plus "No category" when used), a cell per kind with its items and a free / paid count.
 * Archived items are left out.
 */
export function extrasGrid(ws) {
  const live = ws.records.content.filter((c) => !c.archived);
  const cats = [...ws.config.categories, { id: '', name: 'No category', color: '' }];
  const rows = cats.map((cat) => {
    const inCat = live.filter((c) => (c.categoryId || '') === cat.id);
    const cells = EXTRA_KINDS.map((kind) => {
      const items = inCat.filter((c) => isKind(ws, c, kind));
      return { kind, items, paid: items.filter((c) => c.offer === 'Paid').length, free: items.filter((c) => c.offer === 'Free').length };
    });
    return { cat, cells, total: cells.reduce((n, x) => n + x.items.length, 0) };
  });
  return rows.filter((r) => r.cat.id || r.total);
}

/** The content types a workspace should offer, without duplicating ones it already has. */
export const withExtraTypes = (types = []) => [...types, ...EXTRA_TYPES.filter((t) => !types.includes(t))];
