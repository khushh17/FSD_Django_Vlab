import { useCallback, useEffect, useMemo, useState } from 'react'
import { backendEnabled } from '../../config/backend.js'
import { apiFetch, readStored, writeStored } from '../../lib/api.js'
import { enqueue, flush, setOutboxSession } from '../../lib/outbox.js'
import { AuthContext } from './authContext.js'
import SignInDialog from './SignInDialog.jsx'

const KEY = 'django-vlab:auth' // { token, student }

/**
 * Student sign-in (roll number + class password), shared by the whole site.
 *   status: 'disabled' (no backend configured) | 'signed-out' | 'signed-in'
 *   student: { name, rollNumber } while signed in
 *   ready: signed in, so records can be sent
 */
export function AuthProvider({ children }) {
  const [saved, setSaved] = useState(() => (backendEnabled ? readStored(KEY) : null))
  const [ratings, setRatings] = useState({})
  const [dialog, setDialog] = useState(null) // { reason } while the sign-in dialog is open

  const token = saved?.token ?? null
  const student = saved?.student ?? null
  const status = !backendEnabled ? 'disabled' : token ? 'signed-in' : 'signed-out'
  const ready = Boolean(student?.rollNumber)

  const store = useCallback((next) => {
    writeStored(KEY, next)
    setSaved(next)
  }, [])

  const signOut = useCallback(async () => {
    await flush() // send what is waiting while the token is still valid
    store(null)
    setRatings({})
    setDialog(null)
  }, [store])

  // Expired sign-in: forget it without trying to send anything more.
  const forget = useCallback(() => {
    store(null)
    setRatings({})
    setDialog(null)
  }, [store])

  // Refresh the student and their ratings whenever the token changes (and on page load).
  useEffect(() => {
    if (!token) return undefined
    let cancelled = false
    apiFetch('/api/me', { token })
      .then((me) => {
        if (cancelled) return
        store({ token, student: me.student })
        setRatings(me.ratings)
      })
      .catch((err) => {
        if (!cancelled && err.status === 401) forget()
        // Offline: keep the saved student and try again on the next page load.
      })
    return () => {
      cancelled = true
    }
  }, [token, store, forget])

  useEffect(() => {
    // Records belong to the roll number they were made under.
    setOutboxSession({ token, owner: student?.rollNumber ?? null, ready, onUnauthorized: forget })
  }, [token, student?.rollNumber, ready, forget])

  const signIn = useCallback(
    async (path, body) => {
      const result = await apiFetch(path, { method: 'POST', body })
      store(result)
      return result.student
    },
    [store],
  )

  const value = useMemo(
    () => ({
      status,
      student,
      ready,
      ratings,
      requestSignIn: (reason = null) => setDialog({ reason }),
      rollSignIn: (rollNumber, password, name) =>
        signIn('/api/auth/roll', { roll_number: rollNumber, password, name }),
      signOut,
      async rate(experiment, stars) {
        await apiFetch('/api/ratings', { method: 'POST', token, body: { experiment, stars } })
        setRatings((prev) => ({ ...prev, [experiment]: stars }))
      },
      /** POST a form the student waits for (feedback, bug report). */
      submit: (path, body) => apiFetch(path, { method: 'POST', token, body }),
      /** Queue a background record; false if it cannot be recorded (not signed in). */
      record: (type, experiment, data) => (ready ? enqueue(type, experiment, data) : false),
    }),
    [status, student, ready, ratings, signIn, signOut, token],
  )

  // A requested sign-in closes by itself once the student is signed in.
  const showDialog = dialog !== null && !ready

  function closeDialog() {
    setDialog(null)
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
      {showDialog && <SignInDialog reason={dialog?.reason ?? null} onClose={closeDialog} />}
    </AuthContext.Provider>
  )
}
