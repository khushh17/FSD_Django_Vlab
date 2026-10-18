// Generates URL lab cases with the JS engine's predictions, for check_urls.py.
// Usage: node scripts/sim-check/generate-url-cases.mjs <out.json> [count]
import { writeFileSync } from 'node:fs'
import { compileRoute, simulateUrl, validateUrlconf } from '../../src/experiments/django-request-response/simulation/engine/urlEngine.js'

const out = process.argv[2]
const count = Number(process.argv[3] ?? 3000)

let seed = 4102026
const rand = () => {
  seed |= 0
  seed = (seed + 0x6d2b79f5) | 0
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}
const pick = (arr) => arr[Math.floor(rand() * arr.length)]
const chance = (p) => rand() < p

const LITERALS = ['blog', 'articles', 'shop', 'new', 'about', '2024', 'item', 'a-b', 'x.y', 'api']
const PARAMS = ['<int:pk>', '<slug:slug>', '<str:name>', '<year>', '<path:rest>', '<uuid:id>', '<int:year>', '<int:month>']
const SAMPLE = { int: ['42', '0042', '2024', '7'], slug: ['django-tips', 'abc', 'a_b'], str: ['hello', 'new', 'x.y'], path: ['a/b/c', 'x', 'blog/42'], uuid: ['075194d3-6885-417e-a8a8-6c931e272f00'] }
const VALUES = ['blog', 'articles', 'shop', 'new', 'about', '2024', '42', '0042', 'abc', 'django-tips', 'a-b', 'x.y', 'UPPER', 'item', '075194d3-6885-417e-a8a8-6c931e272f00']

let viewCounter = 0
function makeRoute() {
  if (chance(0.08)) return ''
  const parts = []
  const used = new Set()
  const n = 1 + Math.floor(rand() * 3)
  for (let i = 0; i < n; i += 1) {
    if (chance(0.45)) {
      const p = pick(PARAMS)
      const name = p.match(/<(?:[^>:]+:)?([^>]+)>/)[1]
      if (used.has(name)) continue
      used.add(name)
      parts.push(p)
    } else {
      parts.push(pick(LITERALS))
    }
  }
  if (parts.length === 0) parts.push(pick(LITERALS))
  return parts.join('/') + (chance(0.85) ? '/' : '')
}

function concreteFrom(route) {
  return route.replace(/<(?:([^>:]+):)?([^>]+)>/g, (_, conv) => pick(SAMPLE[conv ?? 'str']))
}

function makeUrlconf(caseId) {
  const entries = []
  const n = 1 + Math.floor(rand() * 4)
  for (let i = 0; i < n; i += 1) {
    if (chance(0.3)) {
      const children = []
      const m = Math.floor(rand() * 4)
      for (let j = 0; j < m; j += 1) {
        children.push({ id: `c${i}_${j}`, kind: 'view', route: makeRoute(), view: `view_${(viewCounter += 1)}`, name: chance(0.5) ? `n${viewCounter}` : '' })
      }
      entries.push({ id: `e${i}`, kind: 'include', route: makeRoute(), module: `inc_${caseId}_${i}`, children })
    } else {
      entries.push({ id: `e${i}`, kind: 'view', route: makeRoute(), view: `view_${(viewCounter += 1)}`, name: chance(0.5) ? `n${viewCounter}` : '' })
    }
  }
  return entries
}

function makePath(entries) {
  let p
  if (chance(0.6)) {
    // derived from a pattern, so matches are common
    const e = pick(entries)
    if (e.kind === 'include' && e.children.length && chance(0.8)) p = concreteFrom(e.route) + concreteFrom(pick(e.children).route)
    else p = concreteFrom(e.route)
    if (chance(0.3)) p = p.endsWith('/') ? p.slice(0, -1) : `${p}/`
  } else {
    const n = Math.floor(rand() * 4)
    p = Array.from({ length: n }, () => pick(VALUES)).join('/')
    if (n > 0 && chance(0.5)) p += '/'
  }
  if (p.startsWith('/')) p = p.slice(1) // never produce "//", which the test client reads as a host
  return `/${p}${chance(0.2) ? '?page=2' : ''}`
}

const cases = []
for (let id = 0; id < count; id += 1) {
  const entries = makeUrlconf(id)
  if (validateUrlconf(entries).errors.length) continue
  const request = { method: pick(['GET', 'POST']), path: makePath(entries), appendSlash: chance(0.7), debug: chance(0.5) }
  const { outcome } = simulateUrl(entries, request)
  cases.push({ id, entries, request, expected: outcome })
}

// Route validation cases: Django's ImproperlyConfigured messages
const badRoutes = ['blog/<foo:pk>/', 'blog/<int:2pk>/', 'blog/<int: pk>/', 'blog/<int:pk-id>/', 'a/<int:x>/<slug:x>/', 'ok/<int:pk>/']
const routeChecks = badRoutes.map((route) => ({ route, error: compileRoute(route, true).error }))

writeFileSync(out, JSON.stringify({ cases, routeChecks }))
console.log(`wrote ${cases.length} cases to ${out}`)
