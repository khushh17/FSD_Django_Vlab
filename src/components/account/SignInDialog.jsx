import { useId, useState } from 'react'
import { useAuth } from './authContext.js'
import Dialog from './Dialog.jsx'
import styles from './forms.module.css'

/** Sign in with roll number + class password. */
export default function SignInDialog({ reason, onClose }) {
  return (
    <Dialog title="Sign in" onClose={onClose}>
      <SignInStep reason={reason} />
    </Dialog>
  )
}

const ROLL_HINT = '11 digits, for example 16010125804'

function SignInStep({ reason }) {
  const { rollSignIn } = useAuth()
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
    </>
  )
}
