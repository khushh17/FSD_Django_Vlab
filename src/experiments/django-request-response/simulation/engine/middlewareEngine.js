/*
 * Middleware lab engine: a model of how Django 6.1 handles one request
 * (django/core/handlers/base.py and exception.py), with DEBUG = False.
 *
 *  - Every middleware, and the innermost _get_response, is wrapped so that an exception
 *    raised inside it is converted to a response (convert_exception_to_response).
 *  - _get_response: resolve the URL -> process_view() top-down -> the view
 *    (exceptions from the view go to process_exception() bottom-up) -> check_response
 *    -> if the response has render(): process_template_response() bottom-up, then render.
 *
 * Pure functions, no React: the UI and the differential test (scripts/sim-check) both use it.
 */
import { MIDDLEWARE, REQUESTS, VIEWS } from './middlewareCatalog.js'

const SAFE_METHODS = ['GET', 'HEAD', 'OPTIONS', 'TRACE']

class SimException {
  constructor(type, message, origin) {
    this.type = type // 'Http404' | 'Resolver404' | 'ValueError' | 'ImproperlyConfigured'
    this.message = message
    this.origin = origin
  }
}

function newResponse(status, source, extra = {}) {
  return {
    status,
    source,
    headers: { 'Content-Type': 'text/html; charset=utf-8', ...(extra.headers ?? {}) },
    templateName: extra.templateName ?? null,
    deferred: Boolean(extra.deferred), // a TemplateResponse not yet rendered
    body: extra.body ?? '',
  }
}

const REASON = { 200: 'OK', 403: 'Forbidden', 404: 'Not Found', 405: 'Method Not Allowed', 500: 'Internal Server Error', 503: 'Service Unavailable' }
export const reasonPhrase = (status) => REASON[status] ?? ''

// django.core.handlers.exception.response_for_exception, DEBUG = False
function responseForException(exc) {
  if (exc.type === 'Http404' || exc.type === 'Resolver404') {
    return newResponse(404, 'handler404 (django.views.defaults.page_not_found)', { body: 'Not Found' })
  }
  return newResponse(500, 'handler500 (django.views.defaults.server_error)', { body: 'Server Error (500)' })
}

/*
 * Built-in middleware behaviour that matters here. Each entry may define:
 *   request(ctx, emit)            code before get_response (MiddlewareMixin.process_request)
 *   response(ctx, response, emit) code after get_response (process_response)
 *   processView(ctx, emit)        returns a response or null
 *   processException(ctx, exc, emit)
 *   processTemplateResponse(ctx, response, emit)
 */
const BEHAVIOUR = {
  SecurityMiddleware: {
    request: () => 'SECURE_SSL_REDIRECT is False, so there is nothing to redirect.',
    response: (ctx, r) => {
      r.headers['X-Content-Type-Options'] ??= 'nosniff'
      r.headers['Referrer-Policy'] ??= 'same-origin'
      r.headers['Cross-Origin-Opener-Policy'] ??= 'same-origin'
      return 'Adds X-Content-Type-Options, Referrer-Policy and Cross-Origin-Opener-Policy.'
    },
  },
  SessionMiddleware: {
    request: (ctx) => {
      ctx.session = true
      return 'Attaches request.session (loaded only when used).'
    },
    response: () => 'The session was not modified, so nothing is saved.',
  },
  CommonMiddleware: {
    request: () => 'No DISALLOWED_USER_AGENTS match and PREPEND_WWW is False.',
    response: (ctx, r) =>
      r.status === 404
        ? 'Response is 404, but the path already ends with a slash, so APPEND_SLASH does not redirect. Sets Content-Length.'
        : 'Sets Content-Length.',
  },
  CsrfViewMiddleware: {
    request: () => 'Reads the CSRF cookie into request.META; no check yet.',
    processView: (ctx) => {
      if (SAFE_METHODS.includes(ctx.request.method)) {
        return { response: null, note: `${ctx.request.method} is a safe method: accepted, returns None.` }
      }
      if (ctx.request.csrfToken) {
        return { response: null, note: 'POST carries a valid token: accepted, returns None.' }
      }
      return {
        response: newResponse(403, 'CsrfViewMiddleware (csrf_failure view)', {
          body: 'Forbidden (403) CSRF verification failed. Request aborted.',
        }),
        note: 'POST has no token: rejected with 403 Forbidden (reason: "CSRF token missing.").',
      }
    },
    response: () => 'No CSRF token was used, so no cookie is set.',
  },
  AuthenticationMiddleware: {
    request: (ctx) => {
      if (!ctx.session) {
        throw new SimException(
          'ImproperlyConfigured',
          'The Django authentication middleware requires session middleware to be installed. ' +
            "Edit your MIDDLEWARE setting to insert 'django.contrib.sessions.middleware.SessionMiddleware' " +
            "before 'django.contrib.auth.middleware.AuthenticationMiddleware'.",
          'AuthenticationMiddleware',
        )
      }
      return 'Sets request.user (a lazy object read from the session).'
    },
  },
  MessageMiddleware: {
    request: (ctx) => {
      if (!ctx.session) {
        throw new SimException(
          'ImproperlyConfigured',
          'The session-based temporary message storage requires session middleware to be installed, ' +
            'and come before the message middleware in the MIDDLEWARE list.',
          'MessageMiddleware',
        )
      }
      return 'Attaches the message storage to the request.'
    },
    response: () => 'Stores any unread messages (none here).',
  },
  XFrameOptionsMiddleware: {
    request: () => 'No request step; calls get_response straight away.',
    response: (ctx, r) => {
      if (r.headers['X-Frame-Options'] === undefined) {
        r.headers['X-Frame-Options'] = 'DENY'
        return 'Adds X-Frame-Options: DENY.'
      }
      return 'X-Frame-Options is already set.'
    },
  },

  // Custom middleware: same behaviour as the Python in middlewareCatalog.js
  LoggingMiddleware: {
    request: (ctx, emit) => {
      emit('LoggingMiddleware: request in')
      return 'Prints, then calls get_response.'
    },
    response: (ctx, r, emit) => {
      emit(`LoggingMiddleware: response out (${r.status})`)
      return 'Prints the status on the way out.'
    },
  },
  MaintenanceMiddleware: {
    shortCircuit: (ctx, emit) => {
      emit('MaintenanceMiddleware: site is down, returning 503')
      return newResponse(503, 'MaintenanceMiddleware', { body: 'Down for maintenance' })
    },
  },
  ReadOnlyMiddleware: {
    request: () => 'Calls get_response.',
    processView: (ctx, emit) => {
      if (ctx.request.method === 'POST') {
        emit('ReadOnlyMiddleware.process_view: POST refused')
        return {
          response: newResponse(405, 'ReadOnlyMiddleware (HttpResponseNotAllowed)', { headers: { Allow: 'GET' } }),
          note: 'POST: returns HttpResponseNotAllowed (405).',
        }
      }
      return { response: null, note: 'Not a POST: returns None.' }
    },
  },
  FriendlyErrorMiddleware: {
    request: () => 'Calls get_response.',
    processException: (ctx, exc, emit) => {
      emit(`FriendlyErrorMiddleware.process_exception: ${exc.type}`)
      return newResponse(500, 'FriendlyErrorMiddleware.process_exception', { body: 'Sorry, something went wrong.' })
    },
  },
  TemplateSwapMiddleware: {
    request: () => 'Calls get_response.',
    processTemplateResponse: (ctx, r, emit) => {
      emit('TemplateSwapMiddleware: switching to post_detail_v2.html')
      r.templateName = 'blog/post_detail_v2.html'
      return 'Sets response.template_name = "blog/post_detail_v2.html".'
    },
  },
}

// The views from middlewareCatalog.js
const VIEW_BEHAVIOUR = {
  render: () => ({ response: newResponse(200, 'post_detail view (render)', { templateName: 'blog/post_detail.html' }) }),
  templateResponse: () => ({
    response: newResponse(200, 'post_detail view (TemplateResponse)', {
      templateName: 'blog/post_detail.html',
      deferred: true,
    }),
  }),
  http404: () => {
    throw new SimException('Http404', 'No Post matches the given query.', 'view')
  },
  bug: () => {
    throw new SimException('ValueError', "invalid literal for int() with base 10: 'twenty-twenty'", 'view')
  },
  noReturn: () => ({ response: null }),
}

const routeMatches = (path) => /^\/blog\/[0-9]+\/$/.test(path)

/**
 * Simulate one request.
 * config: { middleware: [names...], request: key of REQUESTS, view: key of VIEWS }
 * Returns { steps, result, tokens }.
 *   steps:  [{ kind, layer, title, detail, status?, prints: [...] }]  (one per Next)
 *   result: { status, reason, source, headers, viewCalled, template, prints, error }
 *   tokens: compact trace compared with real Django by the differential test
 */
export function simulate(config) {
  const names = config.middleware
  const request = REQUESTS[config.request]
  const view = VIEW_BEHAVIOUR[config.view]
  if (!request || !view || names.some((n) => !BEHAVIOUR[n])) throw new Error('Unknown simulation config')

  const steps = []
  const tokens = []
  const prints = []
  const ctx = { request, session: false }
  let viewCalled = false
  let renderedTemplate = null
  let lastError = null

  let pendingPrints = []
  const emit = (line) => {
    prints.push(line)
    pendingPrints.push(line)
  }
  const step = (kind, layer, title, detail, extra = {}) => {
    steps.push({ kind, layer, title, detail, prints: pendingPrints, ...extra })
    pendingPrints = []
  }

  function processExceptionChain(exc) {
    for (let i = names.length - 1; i >= 0; i -= 1) {
      const hook = BEHAVIOUR[names[i]].processException
      if (!hook) continue
      tokens.push(`${names[i]} process_exception`)
      const response = hook(ctx, exc, emit)
      step('process_exception', i, `${names[i]}.process_exception()`, response ? `Returns a ${response.status} response; the remaining exception hooks are skipped.` : 'Returns None.', { status: response?.status })
      if (response) return response
    }
    return null
  }

  function getResponse() {
    // URL resolution
    if (!routeMatches(request.path)) {
      step('resolve', null, 'URL resolver', `No pattern in ROOT_URLCONF matches ${request.path}: Resolver404 is raised.`)
      throw new SimException('Resolver404', `No pattern matches ${request.path}`, 'resolver')
    }
    step('resolve', null, 'URL resolver', 'blog/<int:pk>/ matches: view post_detail, kwargs {"pk": 42}.')

    // process_view, top-down
    let response = null
    for (let i = 0; i < names.length; i += 1) {
      const hook = BEHAVIOUR[names[i]].processView
      if (!hook) continue
      tokens.push(`${names[i]} process_view`)
      const out = hook(ctx, emit)
      step('process_view', i, `${names[i]}.process_view()`, out.note, { status: out.response?.status })
      if (out.response) {
        response = out.response
        step('skip', null, 'View skipped', 'A process_view() returned a response, so the view and any later process_view() hooks are not called.')
        break
      }
    }

    if (!response) {
      tokens.push('VIEW')
      viewCalled = true
      try {
        response = view().response
        step('view', null, 'post_detail(request, pk=42)', describeViewResult(response), { status: response?.status })
      } catch (exc) {
        step('view', null, 'post_detail(request, pk=42)', `Raises ${exc.type}: ${exc.message}`)
        response = processExceptionChain(exc)
        if (!response) {
          step('raise', null, 'No process_exception() returned a response', `${exc.type} is raised on, out of _get_response.`)
          throw exc
        }
      }
    }

    // check_response
    if (response === null) {
      const exc = new SimException(
        'ValueError',
        "The view blog.views.post_detail didn't return an HttpResponse object. It returned None instead.",
        'check_response',
      )
      step('raise', null, 'check_response()', `The view returned None: Django raises ValueError. process_exception() is not called for this.`)
      throw exc
    }

    // deferred rendering
    if (response.deferred) {
      for (let i = names.length - 1; i >= 0; i -= 1) {
        const hook = BEHAVIOUR[names[i]].processTemplateResponse
        if (!hook) continue
        tokens.push(`${names[i]} process_template_response`)
        const note = hook(ctx, response, emit)
        step('process_template_response', i, `${names[i]}.process_template_response()`, note)
      }
      response.deferred = false
      renderedTemplate = response.templateName
      tokens.push(`RENDER ${response.templateName}`)
      step('render', null, 'response.render()', `The TemplateResponse renders ${response.templateName} now.`)
    } else if (response.templateName) {
      renderedTemplate = response.templateName
      tokens.push(`RENDER ${response.templateName}`)
    }
    return response
  }

  function describeViewResult(response) {
    if (response === null) return 'Returns None (there is no return statement).'
    if (response.deferred) return `Returns a TemplateResponse for ${response.templateName}, not rendered yet.`
    return `render() fills ${response.templateName} and returns an HttpResponse (200).`
  }

  // Wrapper around layer i (or the innermost _get_response when i === names.length).
  function handler(i) {
    try {
      return i === names.length ? getResponse() : callLayer(i)
    } catch (exc) {
      if (!(exc instanceof SimException)) throw exc
      lastError = exc
      const response = responseForException(exc)
      const where = i === names.length ? 'the innermost handler' : names[i]
      step('convert', i === names.length ? null : i, 'Exception converted to a response', `${exc.type} escaping ${where} becomes a ${response.status} response from ${response.source}.`, { status: response.status })
      return response
    }
  }

  function callLayer(i) {
    const name = names[i]
    const b = BEHAVIOUR[name]
    tokens.push(`${name} in`)
    let response
    try {
      if (b.shortCircuit) {
        response = b.shortCircuit(ctx, emit)
        step('in', i, `${name}.__call__ (request)`, `Returns a ${response.status} response without calling get_response: the layers below and the view never see the request.`, { status: response.status })
      } else {
        const note = b.request ? b.request(ctx, emit) : 'Calls get_response.'
        step('in', i, `${name}.__call__ (request)`, note)
        response = handler(i + 1)
      }
      const note = b.response ? b.response(ctx, response, emit) : 'No response step.'
      step('out', i, `${name}.__call__ (response)`, note, { status: response.status })
    } catch (exc) {
      if (exc instanceof SimException) {
        tokens.push(`${name} raised`)
        if (exc.origin === name) step('in', i, `${name}.__call__ (request)`, `Raises ${exc.type}: ${exc.message}`)
      }
      throw exc
    }
    tokens.push(`${name} out`)
    return response
  }

  step('start', null, `${request.method} ${request.path}`, 'WSGIHandler sends request_started, builds a WSGIRequest and calls the first middleware.')
  const response = handler(0)
  step('done', null, `${response.status} ${reasonPhrase(response.status)}`, 'The response leaves the last middleware and goes back to the WSGI server.', { status: response.status })

  return {
    steps,
    tokens,
    result: {
      status: response.status,
      reason: reasonPhrase(response.status),
      source: response.source,
      headers: response.headers,
      viewCalled,
      template: renderedTemplate,
      prints,
      error: lastError ? { type: lastError.type, message: lastError.message } : null,
    },
  }
}

export { MIDDLEWARE, REQUESTS, VIEWS }
