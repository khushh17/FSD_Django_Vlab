import { useId, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { when } from '../format.js'
import { LoadState } from '../parts.jsx'
import { useAdminData } from '../useAdminData.js'
import { useExperiment } from '../useExperiment.js'
import styles from '../admin.module.css'

/** Feedback from the Feedback tab, newest first. */
export default function FeedbackInbox() {
  const experiment = useExperiment()
  const { data, error, loading } = useAdminData(`/api/admin/feedback?experiment=${experiment.slug}`)
  const [search, setSearch] = useState('')
  const searchId = useId()

  const items = useMemo(() => {
    if (!data) return []
    const needle = search.trim().toLowerCase()
    if (!needle) return data.feedback
    return data.feedback.filter((f) =>
      [f.message, f.student.rollNumber, f.student.name, f.student.email].some((v) => v?.toLowerCase().includes(needle)),
    )
  }, [data, search])

  return (
    <>
      <h1 className={styles.title}>Feedback</h1>
      <LoadState loading={loading} error={error} />
      {data && (
        <>
          <div className={styles.filters}>
            <label className={styles.field} htmlFor={searchId}>
              Search the messages, roll numbers and names
              <input id={searchId} type="search" value={search} onChange={(e) => setSearch(e.target.value)} />
            </label>
          </div>
          <p className={styles.muted} aria-live="polite">
            Showing {items.length} of {data.feedback.length} messages, newest first.
          </p>
          {items.length > 0 && (
            <ul className={styles.feedbackList}>
              {items.map((f) => (
                <li key={f.id}>
                  <p className={styles.feedbackMeta}>
                    {when(f.createdAt)} ·{' '}
                    <Link to={`/admin/students/${f.student.id}?exp=${experiment.slug}`}>
                      {f.student.rollNumber ?? f.student.email}
                    </Link>{' '}
                    {f.student.name}
                  </p>
                  <p className={styles.feedbackText}>{f.message}</p>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </>
  )
}
