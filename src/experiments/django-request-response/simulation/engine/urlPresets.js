// Starting URLconfs for the URL resolver lab. Students can edit everything afterwards.

export const VIEW_NAMES = [
  'home',
  'about',
  'post_list',
  'post_detail',
  'post_by_year',
  'archive',
  'article',
  'new_article',
  'item',
  'search',
]

export const PRESETS = {
  theory: {
    label: 'Theory example (include and converters)',
    request: { path: '/blog/2024/django-tips/', method: 'GET', appendSlash: true, debug: false },
    entries: [
      { kind: 'view', route: '', view: 'home', name: 'home' },
      {
        kind: 'include',
        route: 'blog/',
        module: 'blog',
        children: [
          { kind: 'view', route: '<int:pk>/', view: 'post_detail', name: 'post-detail' },
          { kind: 'view', route: '<int:year>/<slug:slug>/', view: 'post_by_year', name: 'post-by-year' },
        ],
      },
      { kind: 'view', route: 'about/', view: 'about', name: 'about' },
    ],
  },
  order: {
    label: 'Order trap (a general pattern listed first)',
    request: { path: '/articles/new/', method: 'GET', appendSlash: true, debug: false },
    entries: [
      { kind: 'view', route: 'articles/<str:slug>/', view: 'article', name: 'article' },
      { kind: 'view', route: 'articles/new/', view: 'new_article', name: 'new-article' },
    ],
  },
  slash: {
    label: 'Missing trailing slash (APPEND_SLASH)',
    request: { path: '/blog/2024', method: 'GET', appendSlash: true, debug: false },
    entries: [{ kind: 'view', route: 'blog/<int:year>/', view: 'archive', name: 'archive' }],
  },
  empty: {
    label: 'Empty URLconf (include with no patterns)',
    request: { path: '/blog/', method: 'GET', appendSlash: true, debug: true },
    entries: [{ kind: 'include', route: '', module: 'blog', children: [] }],
  },
}

let counter = 0
export const newId = () => `p${(counter += 1)}`

/** Give every entry (and child) an id for editing and highlighting. */
export function withIds(entries) {
  return entries.map((e) => ({
    ...e,
    id: newId(),
    children: e.kind === 'include' ? (e.children ?? []).map((c) => ({ ...c, id: newId() })) : undefined,
  }))
}
