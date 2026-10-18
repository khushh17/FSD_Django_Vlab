import { useId, useState } from 'react'
import { newId } from '../../lib/api.js'
import { useAuth } from './authContext.js'
import styles from './forms.module.css'

const MAX = 2000

/**
 * A text box sent to the backend (feedback, bug reports). Needs sign-in.
 * `body` holds the extra fields sent with { id, message/description }.
 */
export default function MessageForm({ path, field, body, label, hint, submitLabel, successText, signInReason, onCancel }) {
  const { status, submit, requestSignIn } = useAuth()
  const id = useId()
  const [text, setText] = useState('')
  const [clientId, setClientId] = useState(newId) // the same id on retry, so a resend is stored once
  const [state, setState] = useState({ busy: false, error: null, sent: false })

  if (status === 'signed-out') {
    return (
      <>
        <p className={styles.text}>{signInReason}</p>
        <div className={styles.buttons}>
          <button type="button" className={styles.primary} onClick={() => requestSignIn(signInReason)}>
            Sign in
          </button>
        </div>
      </>
    )
  }

  async function onSubmit(event) {
    event.preventDefault()
    setState({ busy: true, error: null, sent: false })
    try {
      await submit(path, { ...body, id: clientId, [field]: text.trim() })
      setText('')
      setClientId(newId())
      setState({ busy: false, error: null, sent: true })
    } catch (err) {
      setState({ busy: false, error: err.message, sent: false })
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate>
      <label className={styles.field} htmlFor={id}>
        {label}
        <textarea
          id={id}
          value={text}
          maxLength={MAX}
          onChange={(e) => {
            setText(e.target.value)
            if (state.sent) setState((s) => ({ ...s, sent: false }))
          }}
          aria-describedby={`${id}-hint`}
        />
        <span id={`${id}-hint`} className={styles.hint}>
          {hint} {text.length}/{MAX} characters.
        </span>
      </label>
      <div aria-live="polite">
        {state.sent && <p className={styles.success}>{successText}</p>}
        {state.error && <p className={styles.error}>{state.error}</p>}
      </div>
      <div className={styles.buttons}>
        <button type="submit" className={styles.primary} disabled={state.busy || !text.trim()}>
          {state.busy ? 'Sending…' : submitLabel}
        </button>
        {onCancel && (
          <button type="button" className={styles.secondary} onClick={onCancel}>
            {state.sent ? 'Close' : 'Cancel'}
          </button>
        )}
      </div>
    </form>
  )
}
