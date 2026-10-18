import { useAuth } from './authContext.js'
import styles from './AccountBar.module.css'

/** Sign-in status beside the breadcrumb. Hidden when no backend is configured. */
export default function AccountBar() {
  const { status, student, requestSignIn, signOut } = useAuth()
  if (status === 'disabled') return null
  if (status === 'signed-out') {
    return (
      <section className={styles.bar} aria-label="Your account">
        <span className={styles.label}>Sign in to save your results</span>
        <button type="button" className={styles.button} onClick={() => requestSignIn()}>
          Sign in
        </button>
      </section>
    )
  }
  return (
    <section className={styles.bar} aria-label="Your account">
      <span className={styles.label}>
        Signed in: <strong>{student?.rollNumber ?? student?.email}</strong>
      </span>
      {!student?.rollNumber && (
        <button type="button" className={styles.button} onClick={() => requestSignIn()}>
          Add roll number
        </button>
      )}
      <button type="button" className={styles.button} onClick={signOut}>
        Sign out
      </button>
    </section>
  )
}
