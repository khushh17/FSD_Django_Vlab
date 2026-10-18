import { useId, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAdmin } from '../adminAuth.js'
import { capitalise, when } from '../format.js'
import { LoadState } from '../parts.jsx'
import { useAdminData } from '../useAdminData.js'
import { useExperiment } from '../useExperiment.js'
import styles from '../admin.module.css'

const FILTERS = [
  { value: 'open', label: 'Open' },
  { value: 'fixed', label: 'Fixed' },
  { value: '', label: 'All' },
]

/** Bug reports from the Report a Bug popup. Mark each one fixed (or open again). */
export default function BugReports() {
  const experiment = useExperiment()
  const { call } = useAdmin()
  const [params, setParams] = useSearchParams()
  const status = FILTERS.some((f) => f.value === params.get('status')) ? params.get('status') : 'open'
  const { data, error, loading } = useAdminData(`/api/admin/bugs?experiment=${experiment.slug}&status=${status}`)
  // Changes made on this page, shown at once: { [id]: status }. Kept until the filter changes.
  const [changed, setChanged] = useState({})
  const [message, setMessage] = useState(null) // { text, error }
  const filterId = useId()

  async function setStatus(bug, next) {
    setMessage(null)
    try {
      await call(`/api/admin/bugs/${bug.id}`, { status: next })
      setChanged((prev) => ({ ...prev, [bug.id]: next }))
      setMessage({ text: `Report from ${bug.student.rollNumber ?? bug.student.email} marked ${next}.`, error: false })
    } catch (err) {
      setMessage({ text: `Could not update the report: ${err.message}`, error: true })
    }
  }

  function pickFilter(value) {
    setChanged({})
    setMessage(null)
    setParams((prev) => ({ ...Object.fromEntries(prev), status: value }), { replace: true })
  }

  const counts = data ? { ...data.counts } : null
  if (counts) {
    for (const bug of data.bugs) {
      const now = changed[bug.id]
      if (now && now !== bug.status) {
        counts[bug.status] -= 1
        counts[now] += 1
      }
    }
  }

  return (
    <>
      <h1 className={styles.title}>Bug reports</h1>
      <fieldset className={styles.segmented}>
        <legend id={filterId}>Show</legend>
        {FILTERS.map((f) => (
          <label key={f.value} className={status === f.value ? styles.segmentActive : undefined}>
            <input type="radio" name={filterId} value={f.value} checked={status === f.value} onChange={() => pickFilter(f.value)} />
            {f.label}
            {counts && f.value && ` (${counts[f.value]})`}
          </label>
        ))}
      </fieldset>
      <p className={message?.error ? styles.error : styles.muted} aria-live="polite">
        {message?.text}
      </p>
      <LoadState loading={loading} error={error} />
      {data && data.bugs.length === 0 && <p className={styles.muted}>No {status} bug reports.</p>}
      {data && data.bugs.length > 0 && (
        <ul className={styles.feedbackList}>
          {data.bugs.map((bug) => {
            const current = changed[bug.id] ?? bug.status
            return (
              <li key={bug.id} className={current === 'fixed' ? styles.bugFixed : undefined}>
                <div className={styles.bugHead}>
                  <p className={styles.feedbackMeta}>
                    <span className={current === 'fixed' ? styles.badgeFixed : styles.badgeOpen}>{capitalise(current)}</span>{' '}
                    {when(bug.createdAt)} · {bug.page ? `${capitalise(bug.page)} page` : 'page not recorded'} ·{' '}
                    <Link to={`/admin/students/${bug.student.id}?exp=${experiment.slug}`}>
                      {bug.student.rollNumber ?? bug.student.email}
                    </Link>
                  </p>
                  <button
                    type="button"
                    className={styles.outlineButton}
                    onClick={() => setStatus(bug, current === 'fixed' ? 'open' : 'fixed')}
                  >
                    {current === 'fixed' ? 'Reopen' : 'Mark fixed'}
                  </button>
                </div>
                <p className={styles.feedbackText}>{bug.description}</p>
              </li>
            )
          })}
        </ul>
      )}
    </>
  )
}
