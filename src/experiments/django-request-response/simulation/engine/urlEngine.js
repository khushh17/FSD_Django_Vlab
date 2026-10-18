/*
 * URL resolver lab engine: a model of django/urls/resolvers.py (Django 6.1) for path()
 * routes and one level of include(), plus CommonMiddleware's APPEND_SLASH handling
 * (django/middleware/common.py), with the default MIDDLEWARE.
 *
 *  - Routes are translated like _route_to_regex(): literal text is matched exactly,
 *    <conv:name> becomes the converter's regex, endpoints must match the whole remainder.
 *  - Patterns are tried in order; the first match wins. An include() matches a prefix and
 *    passes the rest to its children; if none of them match, resolution continues.
 *  - No match: if APPEND_SLASH is on, the path has no trailing slash and path + "/"
 *    resolves, CommonMiddleware redirects (301), or raises RuntimeError when DEBUG is on
 *    and the method is POST, PUT, PATCH or DELETE.
 *
 * Pure functions, no React: used by the UI and by the differential test (scripts/sim-check).
 */

export const CONVERTERS = {
  str: '[^/]+',
  int: '[0-9]+',
  slug: '[-a-zA-Z0-9_]+',
  uuid: '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}',
  path: '.+',
}

// _PATH_PARAMETER_COMPONENT_RE
const PARAMETER_RE = /<(?:([^>:]+):)?([^>]+)>/g
const IDENTIFIER_RE = /^[\p{L}_][\p{L}\p{N}_]*$/u
// Escape regex syntax characters (the only identity escapes allowed with the 'u' flag).
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')

/**
 * Compile a path() route like _route_to_regex(). Returns
 * { regex, names, converters, error, warnings }. `error` is the ImproperlyConfigured
 * message Django would raise; `warnings` mirror Django's URL system checks.
 */
export function compileRoute(route, isEndpoint) {
  const names = []
  const converters = []
  const warnings = []
  let source = '^'
  let previousEnd = 0
  for (const match of route.matchAll(PARAMETER_RE)) {
    if (/\s/.test(match[0])) {
      return { error: `URL route '${route}' cannot contain whitespace in angle brackets <…>.` }
    }
    const converter = match[1] ?? 'str'
    const name = match[2]
    if (!IDENTIFIER_RE.test(name)) {
      return { error: `URL route '${route}' uses parameter name '${name}' which isn't a valid Python identifier.` }
    }
    if (!(converter in CONVERTERS)) {
      return { error: `URL route '${route}' uses invalid converter '${converter}'.` }
    }
    if (names.includes(name)) {
      return { error: `URL route '${route}' uses the parameter name '${name}' twice, so its regular expression cannot be compiled.` }
    }
    source += escapeRegex(route.slice(previousEnd, match.index))
    source += `(${CONVERTERS[converter]})`
    names.push(name)
    converters.push(converter)
    previousEnd = match.index + match[0].length
  }
  source += escapeRegex(route.slice(previousEnd))
  if (isEndpoint) source += '$'

  if (route.startsWith('/')) {
    warnings.push(`Route '${route}' starts with '/'. Django matches paths without their leading slash, so this route only matches paths that begin with two slashes (//…). Remove the slash.`)
  }
  let depth = 0
  let unmatched = false
  for (const ch of route.replace(PARAMETER_RE, '')) {
    if (ch === '<') depth += 1
    if (ch === '>') depth -= 1
    if (depth < 0) unmatched = true
  }
  if (unmatched || depth !== 0) {
    warnings.push(`Route '${route}' has an unmatched angle bracket (urls.W010); the bracket is matched as literal text.`)
  }
  return { regex: new RegExp(source, 'u'), names, converters, error: null, warnings }
}

/** Python-style value for a captured, converted parameter. */
function convertValue(converter, raw) {
  if (converter === 'int') return { type: 'int', value: BigInt(raw).toString() }
  if (converter === 'uuid') return { type: 'UUID', value: raw }
  return { type: 'str', value: raw }
}

export function formatValue(v) {
  if (v.type === 'int') return v.value
  if (v.type === 'UUID') return `UUID('${v.value}')`
  return `'${v.value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`
}

export function formatKwargs(kwargs) {
  const entries = Object.entries(kwargs)
  if (entries.length === 0) return '{}'
  return `{${entries.map(([k, v]) => `'${k}': ${formatValue(v)}`).join(', ')}}`
}

/** RoutePattern.match(): returns { remaining, kwargs } or null. */
export function matchRoute(compiled, route, path, isEndpoint) {
  if (compiled.names.length > 0) {
    const m = compiled.regex.exec(path)
    if (!m) return null
    const kwargs = {}
    compiled.names.forEach((name, i) => {
      kwargs[name] = convertValue(compiled.converters[i], m[i + 1])
    })
    return { remaining: path.slice(m[0].length), kwargs }
  }
  if (isEndpoint) return route === path ? { remaining: '', kwargs: {} } : null
  return path.startsWith(route) ? { remaining: path.slice(route.length), kwargs: {} } : null
}

/**
 * Validate a URLconf. entries: [{ id, kind: 'view'|'include', route, view?, name?, children? }]
 * Returns { errors: [{id, message}], warnings: [{id, message}] }.
 */
export function validateUrlconf(entries) {
  const errors = []
  const warnings = []
  const visit = (entry, isEndpoint) => {
    const compiled = compileRoute(entry.route, isEndpoint)
    if (compiled.error) errors.push({ id: entry.id, message: compiled.error })
    else compiled.warnings.forEach((w) => warnings.push({ id: entry.id, message: w }))
  }
  const modules = new Set()
  for (const entry of entries) {
    if (entry.kind === 'include') {
      // One module per include(): the same module name twice would be the same urls.py in Django.
      if (!entry.module) errors.push({ id: entry.id, message: 'include() needs a module name.' })
      else if (modules.has(entry.module)) errors.push({ id: entry.id, message: `Another include() already uses ${entry.module}.urls; give each include its own module.` })
      modules.add(entry.module)
      visit(entry, false)
      for (const child of entry.children ?? []) visit(child, true)
    } else {
      visit(entry, true)
    }
  }
  return { errors, warnings }
}

/** Resolve a path (already split from its query string). Returns { match, tried, steps }. */
export function resolvePath(entries, path) {
  const steps = []
  const tried = []
  if (!path.startsWith('/')) {
    steps.push({ id: null, result: 'no-match', detail: 'The path does not start with "/", so the root resolver (pattern ^/) does not match.' })
    return { match: null, tried, steps }
  }
  const remainingRoot = path.slice(1)
  steps.push({ id: null, result: 'start', detail: `The root resolver removes the leading "/" and matches "${remainingRoot}" against ROOT_URLCONF.` })

  for (const entry of entries) {
    if (entry.kind === 'view') {
      const compiled = compileRoute(entry.route, true)
      const m = matchRoute(compiled, entry.route, remainingRoot, true)
      if (m) {
        steps.push({ id: entry.id, result: 'match', detail: `"${entry.route}" matches the whole of "${remainingRoot}". kwargs ${formatKwargs(m.kwargs)}.` })
        return { match: { view: entry.view, kwargs: m.kwargs, urlName: entry.name || null, route: entry.route }, tried, steps }
      }
      tried.push([entry.route])
      steps.push({ id: entry.id, result: 'no-match', detail: describeMiss(entry.route, remainingRoot, compiled) })
      continue
    }

    // include()
    const compiled = compileRoute(entry.route, false)
    const m = matchRoute(compiled, entry.route, remainingRoot, false)
    if (!m) {
      tried.push([entry.route])
      steps.push({ id: entry.id, result: 'no-match', detail: `include("${entry.route}") needs "${remainingRoot}" to start with it. It does not.` })
      continue
    }
    steps.push({ id: entry.id, result: 'prefix', detail: `include("${entry.route}") matches the start. Django removes it and tries the included patterns with "${m.remaining}".${Object.keys(m.kwargs).length ? ` Captured so far: ${formatKwargs(m.kwargs)}.` : ''}` })
    let found = null
    for (const child of entry.children ?? []) {
      const childCompiled = compileRoute(child.route, true)
      const cm = matchRoute(childCompiled, child.route, m.remaining, true)
      if (cm) {
        const kwargs = { ...m.kwargs, ...cm.kwargs }
        steps.push({ id: child.id, result: 'match', detail: `"${child.route}" matches "${m.remaining}". kwargs ${formatKwargs(kwargs)}.` })
        found = { view: child.view, kwargs, urlName: child.name || null, route: entry.route + child.route }
        break
      }
      tried.push([entry.route, child.route])
      steps.push({ id: child.id, result: 'no-match', detail: describeMiss(child.route, m.remaining, childCompiled) })
    }
    if (found) return { match: found, tried, steps }
    steps.push({ id: entry.id, result: 'include-miss', detail: `Nothing inside include("${entry.route}") matched, so Django continues with the next pattern in ROOT_URLCONF.` })
  }
  return { match: null, tried, steps }
}

function describeMiss(route, path, compiled) {
  if (compiled.names.length === 0) return `"${route}" must equal "${path}" exactly. It does not.`
  const prefixOnly = new RegExp(compiled.regex.source.replace(/\$$/, ''), 'u').exec(path)
  if (prefixOnly) {
    return `"${route}" matches the start ("${prefixOnly[0]}"), but "${path.slice(prefixOnly[0].length)}" is left over, and a pattern without include() must match all of it.`
  }
  return `"${route}" does not match "${path}" (a converter or literal part does not fit).`
}

/**
 * Full request outcome with the default MIDDLEWARE (CommonMiddleware enabled).
 * request: { method, path (may include ?query), appendSlash, debug }
 * Returns { outcome, steps, ... } where outcome is one of
 *   { type: 'match', view, kwargs, urlName, route, status: 200 }
 *   { type: 'redirect', status: 301, location }
 *   { type: 'runtime-error', status: 500, message }
 *   { type: 'not-found', status: 404, tried }
 *   { type: 'welcome', status: 200 }   DEBUG on and no pattern was tried (empty URLconf)
 */
export function simulateUrl(entries, request) {
  const [rawPath, ...queryParts] = request.path.split('?')
  const query = queryParts.join('?')
  const path = rawPath.startsWith('/') ? rawPath : `/${rawPath}`
  const first = resolvePath(entries, path)
  const steps = first.steps.map((s) => ({ ...s, phase: 'resolve' }))

  if (first.match) {
    steps.push({ id: null, phase: 'outcome', result: 'outcome', detail: `Django calls ${first.match.view}(request${kwargsAsArgs(first.match.kwargs)}).` })
    return { outcome: { type: 'match', status: 200, ...first.match }, steps, path, query }
  }

  steps.push({ id: null, phase: 'outcome', result: 'not-found', detail: 'No pattern matched: the resolver raises Resolver404, which becomes a 404 response.' })

  // django.views.debug.technical_404_response: with DEBUG on and nothing tried (an empty
  // URLconf), Django shows its "The install worked successfully!" page with status 200.
  // CommonMiddleware then sees a 200, so APPEND_SLASH does not apply.
  if (request.debug && first.tried.length === 0) {
    steps.push({ id: null, phase: 'outcome', result: 'welcome', detail: 'DEBUG is True and no URL pattern was tried at all (the URLconf is effectively empty), so Django shows its "The install worked successfully!" page with status 200 instead of a 404.' })
    return { outcome: { type: 'welcome', status: 200 }, steps, path, query }
  }

  if (request.appendSlash && !path.endsWith('/')) {
    const slashed = resolvePath(entries, `${path}/`)
    if (slashed.match) {
      steps.push({ id: null, phase: 'append-slash', result: 'append-slash', detail: `CommonMiddleware sees the 404. APPEND_SLASH is True and "${path}" has no trailing slash, so it checks "${path}/": that resolves to ${slashed.match.view}.` })
      if (request.debug && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) {
        const message = `You called this URL via ${request.method}, but the URL doesn't end in a slash and you have APPEND_SLASH set. Django can't redirect to the slash URL while maintaining ${request.method} data.`
        steps.push({ id: null, phase: 'outcome', result: 'runtime-error', detail: `DEBUG is True and the method is ${request.method}: instead of redirecting, CommonMiddleware raises RuntimeError.` })
        return { outcome: { type: 'runtime-error', status: 500, message }, steps, path, query }
      }
      const location = `${path}/${query ? `?${query}` : ''}`
      steps.push({ id: null, phase: 'outcome', result: 'redirect', detail: `The 404 is replaced by a permanent redirect: 301 to ${location}.` })
      return { outcome: { type: 'redirect', status: 301, location }, steps, path, query }
    }
    steps.push({ id: null, phase: 'append-slash', result: 'append-slash', detail: `APPEND_SLASH is True, but "${path}/" does not match either, so the 404 stands.` })
  }
  steps.push({ id: null, phase: 'outcome', result: 'not-found', detail: request.debug ? 'DEBUG is True: Django shows its debug 404 page listing the patterns it tried.' : 'DEBUG is False: handler404 returns the 404 page.' })
  return { outcome: { type: 'not-found', status: 404, tried: first.tried }, steps, path, query }
}

function kwargsAsArgs(kwargs) {
  const entries = Object.entries(kwargs)
  return entries.length ? `, ${entries.map(([k, v]) => `${k}=${formatValue(v)}`).join(', ')}` : ''
}
