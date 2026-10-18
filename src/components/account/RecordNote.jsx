import { useAuth } from './authContext.js'
import styles from './RecordNote.module.css'

/**
 * Says whether a result was saved to the student's record.
 *   recorded: what `record()` returned when the result was produced
 *   what: e.g. 'score', 'run'
 */
export default function RecordNote({ recorded, what }) {
  const { status, student, requestSignIn } = useAuth()
  if (status === 'disabled') return null
  if (recorded) {
    return (
      <p className={styles.note}>
        This {what} is saved to your record (roll number {student?.rollNumber}). If you are offline, it is sent
        when you are back online.
      </p>
    )
  }
  const action = status === 'signed-in' ? 'Add your roll number' : 'Sign in'
  return (
    <p className={styles.note}>
      This {what} was not saved.{' '}
      <button type="button" className={styles.link} onClick={() => requestSignIn()}>
        {action}
      </button>{' '}
      to save the next one.
    </p>
  )
}
