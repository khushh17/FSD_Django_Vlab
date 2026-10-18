// Generates Middleware lab cases with the JS engine's predictions, for check_middleware.py.
// Usage: node scripts/sim-check/generate-middleware-cases.mjs <out.json> [randomCount]
import { writeFileSync } from 'node:fs'
import { MIDDLEWARE, REQUESTS, VIEWS } from '../../src/experiments/django-request-response/simulation/engine/middlewareCatalog.js'
import { simulate } from '../../src/experiments/django-request-response/simulation/engine/middlewareEngine.js'

const out = process.argv[2]
const randomCount = Number(process.argv[3] ?? 3000)

// Small seeded PRNG (mulberry32) so runs are reproducible.
let seed = 20261004
const rand = () => {
  seed |= 0
  seed = (seed + 0x6d2b79f5) | 0
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}
const pick = (arr) => arr[Math.floor(rand() * arr.length)]
const shuffle = (arr) => {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

const allNames = Object.keys(MIDDLEWARE)
const requestKeys = Object.keys(REQUESTS)
const viewKeys = Object.keys(VIEWS)
const defaults = allNames.filter((n) => MIDDLEWARE[n].builtin)

const configs = []
// Every request x view with the default list, with no middleware, and with each custom added.
for (const request of requestKeys) {
  for (const view of viewKeys) {
    configs.push({ middleware: defaults, request, view })
    configs.push({ middleware: [], request, view })
    for (const custom of allNames.filter((n) => !MIDDLEWARE[n].builtin)) {
      configs.push({ middleware: [custom, ...defaults], request, view })
      configs.push({ middleware: [...defaults, custom], request, view })
    }
  }
}
// Random subsets in random orders.
for (let k = 0; k < randomCount; k += 1) {
  const size = Math.floor(rand() * (allNames.length + 1))
  configs.push({ middleware: shuffle(allNames).slice(0, size), request: pick(requestKeys), view: pick(viewKeys) })
}

const cases = configs.map((config, id) => {
  const { tokens, result } = simulate(config)
  return {
    id,
    config,
    expected: {
      tokens: tokens.filter((t) => !t.startsWith('RENDER ')),
      status: result.status,
      viewCalled: result.viewCalled,
      template: result.template,
      prints: result.prints,
      headers: pickHeaders(result.headers),
      error: result.error?.type ?? null,
    },
  }
})

function pickHeaders(h) {
  const keys = ['Content-Type', 'X-Frame-Options', 'X-Content-Type-Options', 'Referrer-Policy', 'Cross-Origin-Opener-Policy', 'Allow']
  return Object.fromEntries(keys.filter((k) => h[k] !== undefined).map((k) => [k, h[k]]))
}

writeFileSync(
  out,
  JSON.stringify({
    middleware: Object.fromEntries(allNames.map((n) => [n, { path: MIDDLEWARE[n].path, builtin: MIDDLEWARE[n].builtin, code: MIDDLEWARE[n].code ?? null }])),
    views: Object.fromEntries(viewKeys.map((k) => [k, VIEWS[k].code])),
    requests: REQUESTS,
    cases,
  }),
)
console.log(`wrote ${cases.length} cases to ${out}`)
