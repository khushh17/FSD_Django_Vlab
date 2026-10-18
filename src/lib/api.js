import { API_URL } from '../config/backend.js'

export class ApiError extends Error {
  /** status 0 = no response (offline, server down, CORS refused). */
  constructor(status, code, message) {
    super(message)
    this.status = status
    this.code = code
  }
}

/**
 * JSON request to the backend. Resolves to the parsed body (or, with `file: true`, to
 * { blob, filename } for a download); rejects with ApiError.
 */
export async function apiFetch(path, { method = 'GET', body, token, timeoutMs = 15000, cache, file = false } = {}) {
  const headers = {}
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (token) headers.Authorization = `Bearer ${token}`
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  let response
  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
      cache,
    })
  } catch {
    throw new ApiError(0, 'network', 'Could not reach the server. Check your connection and try again.')
  } finally {
    clearTimeout(timer)
  }
  if (file && response.ok) {
    const match = /filename="([^"]+)"/.exec(response.headers.get('Content-Disposition') ?? '')
    return { blob: await response.blob(), filename: match?.[1] ?? 'download' }
  }
  let data = null
  try {
    data = await response.json()
  } catch {
    // Non-JSON body (for example a proxy error page).
  }
  if (!response.ok) {
    throw new ApiError(response.status, data?.error ?? 'error', data?.message ?? 'Something went wrong. Please try again.')
  }
  return data
}

/** Random UUID for records, so a record sent twice is stored once. */
export function newId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID()
  const b = crypto.getRandomValues(new Uint8Array(16))
  b[6] = (b[6] & 0x0f) | 0x40
  b[8] = (b[8] & 0x3f) | 0x80
  const h = [...b].map((x) => x.toString(16).padStart(2, '0')).join('')
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`
}

// localStorage, wrapped: storage may be unavailable (private mode, blocked cookies).
export function readStored(key) {
  try {
    const raw = window.localStorage.getItem(key)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function writeStored(key, value) {
  try {
    if (value === null) window.localStorage.removeItem(key)
    else window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Storage unavailable: kept in memory only.
  }
}
