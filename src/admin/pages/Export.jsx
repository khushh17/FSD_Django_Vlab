import { useState } from 'react'
import { useAdmin } from '../adminAuth.js'
import { useExperiment } from '../useExperiment.js'
import styles from '../admin.module.css'

const TABLES = [
  { table: 'students', label: 'Students', text: 'One row per student, for marking: first and best score per test, attempts, simulation runs, prediction accuracy, rating.' },
  { table: 'attempts', label: 'Test attempts', text: 'Every pretest and posttest attempt: score, percent, retake, time taken, date.' },
  { table: 'answers', label: 'Answers', text: 'Every answer in every attempt: question ID, the option chosen, right or wrong.' },
  { table: 'runs', label: 'Simulation runs', text: 'Every finished simulation run: setup, prediction and outcome (as JSON), steps, Run to end.' },
  { table: 'feedback', label: 'Feedback', text: 'Every feedback message.' },
  { table: 'bugs', label: 'Bug reports', text: 'Every bug report, with its status.' },
]

/** CSV downloads for marking and records. They open in Excel or Google Sheets. */
export default function Export() {
  const experiment = useExperiment()
  const { download } = useAdmin()
  const [busy, setBusy] = useState(null)
  const [message, setMessage] = useState(null) // { text, error }

  async function get(table) {
    setBusy(table)
    setMessage(null)
    try {
      const filename = await download(`/api/admin/export?experiment=${experiment.slug}&table=${table}`)
      setMessage({ text: `Downloaded ${filename}.`, error: false })
    } catch (err) {
      setMessage({ text: `Could not download: ${err.message}`, error: true })
    } finally {
      setBusy(null)
    }
  }

  return (
    <>
      <h1 className={styles.title}>Export</h1>
      <p className={styles.muted}>
        CSV files for {experiment.title}. Dates are in Indian Standard Time. They open in Excel or Google Sheets.
      </p>
      <p className={message?.error ? styles.error : styles.muted} aria-live="polite">
        {message?.text}
      </p>
      <ul className={styles.exportList}>
        {TABLES.map((t) => (
          <li key={t.table}>
            <div>
              <h2 className={styles.exportTitle}>{t.label}</h2>
              <p className={styles.exportText}>{t.text}</p>
            </div>
            <button type="button" className={styles.primaryButton} disabled={busy !== null} onClick={() => get(t.table)}>
              {busy === t.table ? 'Preparing…' : 'Download CSV'}
              <span className="visually-hidden"> of {t.label.toLowerCase()}</span>
            </button>
          </li>
        ))}
      </ul>
    </>
  )
}
