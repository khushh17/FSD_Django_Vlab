import { useId, useState } from 'react'
import { DEV_LOGIN, EMAIL_DOMAIN, GOOGLE_CLIENT_ID } from '../../config/backend.js'
import { useAuth } from './authContext.js'
import Dialog from './Dialog.jsx'
import GoogleButton from './GoogleButton.jsx'
import styles from './forms.module.css'

/**
 * Sign in with roll number + class password, or with Google (then, the first time only,
 * enter the roll number).
 */
export default function SignInDialog({ reason, onClose }) {
  const { status, student } = useAuth()
  const needsRoll = status === 'signed-in' && student && !student.rollNumber
  return (
    <Dialog title={needsRoll ? 'Your roll number' : 'Sign in'} onClose={onClose}>
      {needsRoll ? <RollNumberStep student={student} onClose={onClose} /> : <SignInStep reason={reason} />}
    </Dialog>
  )
}

const ROLL_HINT = '11 digits, for example 16010125804'

function SignInStep({ reason }) {
  const { rollSignIn, signInWithGoogle, devSignIn } = useAuth()
  const ids = { roll: useId(), password: useId(), name: useId() }
  const [roll, setRoll] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  async function attempt(action) {
    setBusy(true)
    setError(null)
    try {
      await action()
    } catch (err) {
      setError(err.message)
      setPassword('')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      {reason && <p className={styles.text}>{reason}</p>}
      <p className={styles.text}>
        Sign in so your pretest and posttest scores and your simulation runs are saved to your record for your teacher.
      </p>
      <form
        onSubmit={(event) => {
          event.preventDefault()
          attempt(() => rollSignIn(roll.replace(/\s/g, ''), password, name.trim()))
        }}
        noValidate
      >
        <label className={styles.field} htmlFor={ids.roll}>
          Roll number
          <input
            id={ids.roll}
            inputMode="numeric"
            autoComplete="username"
            spellCheck={false}
            maxLength={14}
            required
            value={roll}
            onChange={(e) => setRoll(e.target.value)}
            aria-describedby={`${ids.roll}-hint`}
          />
          <span id={`${ids.roll}-hint`} className={styles.hint}>
            {ROLL_HINT}
          </span>
        </label>
        <label className={styles.field} htmlFor={ids.password}>
          Class password
          <input
            id={ids.password}
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-describedby={`${ids.password}-hint`}
          />
          <span id={`${ids.password}-hint`} className={styles.hint}>
            The password your teacher gave the class.
          </span>
        </label>
        <label className={styles.field} htmlFor={ids.name}>
          Your name (optional)
          <input id={ids.name} autoComplete="name" maxLength={200} value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}
        <div className={styles.buttons}>
          <button type="submit" className={styles.primary} disabled={busy || !roll.trim() || !password}>
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </div>
      </form>
      {GOOGLE_CLIENT_ID && (
        <>
          <hr className={styles.divider} />
          <p className={styles.muted}>
            Or use your <strong>@{EMAIL_DOMAIN}</strong> Google account:
          </p>
          <div className={styles.googleSlot} aria-busy={busy}>
            <GoogleButton onCredential={(credential) => attempt(() => signInWithGoogle(credential))} />
          </div>
        </>
      )}
      {DEV_LOGIN && <DevSignIn busy={busy} onSubmit={(email, devName) => attempt(() => devSignIn(email, devName))} />}
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
      await saveRollNumber(roll.replace(/\s/g, ''))
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
          maxLength={14}
          value={roll}
          inputMode="numeric"
          onChange={(e) => setRoll(e.target.value)}
          aria-describedby={`${id}-hint`}
          aria-invalid={error ? true : undefined}
        />
        <span id={`${id}-hint`} className={styles.hint}>
          {ROLL_HINT}. Check it carefully: only the admin can change it later.
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
