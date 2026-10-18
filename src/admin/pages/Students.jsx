import { useId, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { pct, score, when } from '../format.js'
import { DataTable, LoadState } from '../parts.jsx'
import { useAdminData } from '../useAdminData.js'
import { useExperiment } from '../useExperiment.js'
import styles from '../admin.module.css'

/** One row per student: for marking. Quiz cells show the best score (first score underneath). */
export default function Students() {
  const experiment = useExperiment()
  const { data, error, loading } = useAdminData(`/api/admin/students?experiment=${experiment.slug}`)
  const [search, setSearch] = useState('')
  const [onlyActive, setOnlyActive] = useState(false)
  const searchId = useId()

  const quizColumns = [
    { key: 'pretest:', label: 'Pretest' },
    ...experiment.posttestLevels.map((level) => ({ key: `posttest:${level}`, label: `Posttest (${level})` })),
  ]

  const rows = useMemo(() => {
    if (!data) return []
    const needle = search.trim().toLowerCase()
    return data.students
      .filter((s) => !onlyActive || Object.keys(s.quizzes).length > 0 || s.simulationRuns > 0)
      .filter((s) => !needle || [s.rollNumber, s.name, s.email].some((v) => v?.toLowerCase().includes(needle)))
      .sort((a, b) => (a.rollNumber ?? '￿').localeCompare(b.rollNumber ?? '￿') || a.email.localeCompare(b.email))
  }, [data, search, onlyActive])

  return (
    <>
      <h1 className={styles.title}>Students</h1>
      <LoadState loading={loading} error={error} />
      {data && (
        <>
          <div className={styles.filters}>
            <label className={styles.field} htmlFor={searchId}>
              Search by roll number, name or email
              <input id={searchId} type="search" value={search} onChange={(e) => setSearch(e.target.value)} />
            </label>
            <label className={styles.check}>
              <input type="checkbox" checked={onlyActive} onChange={(e) => setOnlyActive(e.target.checked)} />
              Only students who used this experiment
            </label>
          </div>
          <p className={styles.muted} aria-live="polite">
            Showing {rows.length} of {data.students.length} students.
          </p>
          <DataTable caption="Students and their results. Test cells: best score, with the first score and number of attempts below.">
            <thead>
              <tr>
                <th scope="col">Roll number</th>
                <th scope="col">Name</th>
                {quizColumns.map((c) => (
                  <th key={c.key} scope="col" className={styles.num}>
                    {c.label}
                  </th>
                ))}
                <th scope="col" className={styles.num}>Simulation runs</th>
                <th scope="col" className={styles.num}>Predictions right</th>
                <th scope="col" className={styles.num}>Rating</th>
                <th scope="col">Last seen</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((s) => (
                <tr key={s.id}>
                  <th scope="row">
                    <Link to={`/admin/students/${s.id}?exp=${experiment.slug}`}>{s.rollNumber ?? '(none yet)'}</Link>
                  </th>
                  <td>
                    {s.name || '—'}
                    <span className={styles.cellNote}>{s.email}</span>
                  </td>
                  {quizColumns.map((c) => {
                    const q = s.quizzes[c.key]
                    return (
                      <td key={c.key} className={styles.num}>
                        {q ? (
                          <>
                            {score(q.best)}
                            <span className={styles.cellNote}>
                              first {score(q.first)}, {q.attempts} {q.attempts === 1 ? 'try' : 'tries'}
                            </span>
                          </>
                        ) : (
                          '—'
                        )}
                      </td>
                    )
                  })}
                  <td className={styles.num}>{s.simulationRuns}</td>
                  <td className={styles.num}>{pct(s.predictionAccuracy)}</td>
                  <td className={styles.num}>{s.rating ?? '—'}</td>
                  <td>{when(s.lastSeen)}</td>
                </tr>
              ))}
            </tbody>
          </DataTable>
        </>
      )}
    </>
  )
}
