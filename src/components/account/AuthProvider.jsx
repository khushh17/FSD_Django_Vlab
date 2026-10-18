import { useCallback, useEffect, useMemo, useState } from 'react'
import { backendEnabled } from '../../config/backend.js'
import { apiFetch, readStored, writeStored } from '../../lib/api.js'
import { enqueue, flush, setOutboxSession } from '../../lib/outbox.js'
import { AuthContext } from './authContext.js'
import SignInDialog from './SignInDialog.jsx'

const KEY = 'django-vlab:auth' // { token, student }

/**
 * Student sign-in (Google), shared by the whole site.
 *   status: 'disabled' (no backend configured) | 'signed-out' | 'signed-in'
 *   student: { email, name, rollNumber } while signed in
 *   ready: signed in and the roll number is saved, so records can be sent
 */
export function AuthProvider({ children }) {
  const [saved, setSaved] = useState(() => (backendEnabled ? readStored(KEY) : null))
  const [ratings, setRatings] = useState({})
  const [dialog, setDialog] = useState(null) // { reason } while the sign-in dialog is open
  const [rollDismissed, setRollDismissed] = useState(false)

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
    window.google?.accounts?.id?.disableAutoSelect()
    store(null)
    setRatings({})
    setRollDismissed(false)
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
    setOutboxSession({ token, owner: student?.email ?? null, ready, onUnauthorized: forget })
  }, [token, student?.email, ready, forget])

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
      signInWithGoogle: (credential) => signIn('/api/auth/google', { credential }),
      devSignIn: (email, name) => signIn('/api/auth/dev', { email, name }),
      signOut,
      async saveRollNumber(rollNumber) {
        const result = await apiFetch('/api/me/roll-number', { method: 'POST', token, body: { roll_number: rollNumber } })
        store({ token, student: result.student })
      },
      async rate(experiment, stars) {
        await apiFetch('/api/ratings', { method: 'POST', token, body: { experiment, stars } })
        setRatings((prev) => ({ ...prev, [experiment]: stars }))
      },
      /** POST a form the student waits for (feedback, bug report). */
      submit: (path, body) => apiFetch(path, { method: 'POST', token, body }),
      /** Queue a background record; false if it cannot be recorded (not signed in / no roll number). */
      record: (type, experiment, data) => (ready ? enqueue(type, experiment, data) : false),
    }),
    [status, student, ready, ratings, signIn, signOut, store, token],
  )

  // Signed in but no roll number yet: ask for it straight away (once per page load if closed).
  const needsRoll = status === 'signed-in' && student && !student.rollNumber && !rollDismissed
  // A requested sign-in closes by itself once the student is signed in with a roll number.
  const showDialog = (dialog !== null && !ready) || needsRoll

  function closeDialog() {
    setDialog(null)
    if (needsRoll) setRollDismissed(true)
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
      {showDialog && <SignInDialog reason={dialog?.reason ?? null} onClose={closeDialog} />}
    </AuthContext.Provider>
  )
}
