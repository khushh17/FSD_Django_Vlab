/*
 * Outbox for records sent in the background (quiz attempts, simulation runs).
 * Records are kept in localStorage until the server accepts them, so a dropped connection
 * or a closed tab does not lose them. Each record belongs to the student who made it and
 * is only ever sent with that student's sign-in.
 */
import { apiFetch, newId, readStored, writeStored } from './api.js'

const KEY = 'django-vlab:outbox'
const BATCH = 50 // the server's limit per request
const MAX_KEPT = 300
const MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000
const RETRY_MS = 30 * 1000

let queue = (readStored(KEY) ?? []).filter((e) => e && Date.now() - e.at < MAX_AGE_MS)
let session = { token: null, owner: null, ready: false, onUnauthorized: null }
let flushing = false
let retryTimer = null

function save() {
  if (queue.length > MAX_KEPT) queue = queue.slice(-MAX_KEPT)
  writeStored(KEY, queue.length ? queue : null)
}

/** Called by the auth provider whenever the sign-in changes. `ready` = roll number entered. */
export function setOutboxSession(next) {
  session = { ...session, ...next }
  flush()
}

/** Queue a record for the signed-in student. Returns false (and keeps nothing) if nobody is signed in. */
export function enqueue(type, experiment, data) {
  if (!session.owner) return false
  queue.push({ id: newId(), type, experiment, data, owner: session.owner, at: Date.now() })
  save()
  flush()
  return true
}

export async function flush() {
  const { token, owner, ready } = session
  if (flushing || !token || !ready) return
  const mine = queue.filter((e) => e.owner === owner).slice(0, BATCH)
  if (mine.length === 0) return
  flushing = true
  clearTimeout(retryTimer)
  let again = false
  try {
    const { results } = await apiFetch('/api/events', {
      method: 'POST',
      token,
      body: { events: mine.map(({ id, type, experiment, data }) => ({ id, type, experiment, data })) },
    })
    // Accepted and rejected records both leave the outbox: a rejected one would be rejected again.
    const answered = new Set(results.map((r) => r.id))
    for (const r of results) if (!r.ok) console.warn(`Record ${r.id} was rejected by the server: ${r.message}`)
    queue = queue.filter((e) => !answered.has(e.id))
    save()
    again = queue.some((e) => e.owner === owner)
  } catch (err) {
    if (err.status === 401) session.onUnauthorized?.()
    else if (err.status === 400) {
      // The whole batch was malformed (should not happen): drop it rather than retry forever.
      console.warn(`The server rejected ${mine.length} records: ${err.message}`)
      const dropped = new Set(mine.map((e) => e.id))
      queue = queue.filter((e) => !dropped.has(e.id))
      save()
    }
    else if (err.status === 0 || err.status >= 500) retryTimer = setTimeout(flush, RETRY_MS)
  } finally {
    flushing = false
  }
  if (again) flush()
}

if (typeof window !== 'undefined') window.addEventListener('online', () => flush())
