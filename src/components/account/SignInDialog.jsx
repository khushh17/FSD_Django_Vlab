import { useId, useState } from 'react'
import { DEV_LOGIN, EMAIL_DOMAIN, GOOGLE_CLIENT_ID } from '../../config/backend.js'
import { useAuth } from './authContext.js'
import Dialog from './Dialog.jsx'
import GoogleButton from './GoogleButton.jsx'
import styles from './forms.module.css'

/** Sign in with Google, then (first time only) enter the roll number. */
export default function SignInDialog({ reason, onClose }) {
  const { status, student } = useAuth()
  const needsRoll = status === 'signed-in' && student && !student.rollNumber
  return (
    <Dialog title={needsRoll ? 'Your roll number' : 'Sign in'} onClose={onClose}>
      {needsRoll ? <RollNumberStep student={student} onClose={onClose} /> : <SignInStep reason={reason} />}
    </Dialog>
  )
}

function SignInStep({ reason }) {
  const { signInWithGoogle, devSignIn } = useAuth()
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  async function attempt(action) {
    setBusy(true)
    setError(null)
    try {
      await action()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      {reason && <p className={styles.text}>{reason}</p>}
      <p className={styles.text}>
        Use your <strong>@{EMAIL_DOMAIN}</strong> Google account. Your pretest and posttest scores and your simulation
        runs are then saved to your record for your teacher.
      </p>
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      {GOOGLE_CLIENT_ID ? (
        <div className={styles.googleSlot} aria-busy={busy}>
          <GoogleButton onCredential={(credential) => attempt(() => signInWithGoogle(credential))} />
        </div>
      ) : (
        // TODO: set VITE_GOOGLE_CLIENT_ID once the Google OAuth client exists.
        <p className={styles.muted}>Google sign-in is not set up yet.</p>
      )}
      {DEV_LOGIN && <DevSignIn busy={busy} onSubmit={(email, name) => attempt(() => devSignIn(email, name))} />}
    </>
  )
}

/** Local testing only (never in a production build): sign in as any email. */
function DevSignIn({ busy, onSubmit }) {
  const ids = { email: useId(), name: useId() }
  const [email, setEmail] = useState(`test.student@${EMAIL_DOMAIN}`)
  const [name, setName] = useState('Test Student')
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit(email, name)
      }}
    >
      <hr className={styles.divider} />
      <p className={styles.muted}>Development only: sign in without Google.</p>
      <label className={styles.field} htmlFor={ids.email}>
        Email
        <input id={ids.email} type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      </label>
      <label className={styles.field} htmlFor={ids.name}>
        Name
        <input id={ids.name} type="text" value={name} onChange={(e) => setName(e.target.value)} />
      </label>
      <div className={styles.buttons}>
        <button type="submit" className={styles.primary} disabled={busy}>
          Sign in (test)
        </button>
      </div>
    </form>
  )
}

function RollNumberStep({ student, onClose }) {
  const { saveRollNumber, signOut } = useAuth()
  const id = useId()
  const [roll, setRoll] = useState('')
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  async function onSubmit(event) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await saveRollNumber(roll.trim())
      onClose()
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate>
      <p className={styles.text}>
        Signed in as <strong>{student.email}</strong>. Enter your roll number so your teacher can match your results.
      </p>
      <label className={styles.field} htmlFor={id}>
        Roll number
        <input
          id={id}
          type="text"
          required
          autoComplete="off"
          spellCheck={false}
          maxLength={20}
          value={roll}
          onChange={(e) => setRoll(e.target.value.toUpperCase())}
          aria-describedby={`${id}-hint`}
          aria-invalid={error ? true : undefined}
        />
        <span id={`${id}-hint`} className={styles.hint}>
          Check it carefully: only the admin can change it later.
        </span>
      </label>
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      <div className={styles.buttons}>
        <button type="submit" className={styles.primary} disabled={busy || !roll.trim()}>
          Save
        </button>
        <button type="button" className={styles.secondary} disabled={busy} onClick={signOut}>
          Not you? Sign out
        </button>
      </div>
    </form>
  )
}
