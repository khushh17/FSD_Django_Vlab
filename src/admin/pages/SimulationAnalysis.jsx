import { useId } from 'react'
import { useSearchParams } from 'react-router-dom'
import { pct } from '../format.js'
import { DataTable, LoadState, Stats } from '../parts.jsx'
import { useAdminData } from '../useAdminData.js'
import { useExperiment } from '../useExperiment.js'
import styles from '../admin.module.css'

/**
 * Simulation runs grouped by setup, hardest to predict first. A setup most students get
 * wrong, and the wrong answer they give, points at the idea to go over in class.
 */
export default function SimulationAnalysis() {
  const experiment = useExperiment()
  const [params, setParams] = useSearchParams()
  const labId = useId()
  const lab = experiment.labs[params.get('lab')] ? params.get('lab') : ''
  const { data, error, loading } = useAdminData(`/api/admin/simulation?experiment=${experiment.slug}&lab=${lab}`)

  const totals = data
    ? data.scenarios.reduce(
        (t, s) => ({ runs: t.runs + s.runs, predictions: t.predictions + s.predictions, correct: t.correct + s.correct }),
        { runs: 0, predictions: 0, correct: 0 },
      )
    : null

  return (
    <>
      <h1 className={styles.title}>Simulation analysis</h1>
      <div className={styles.filters}>
        <label className={styles.field} htmlFor={labId}>
          Lab
          <select
            id={labId}
            value={lab}
            onChange={(e) => setParams((prev) => ({ ...Object.fromEntries(prev), lab: e.target.value }), { replace: true })}
          >
            <option value="">Both labs</option>
            {Object.entries(experiment.labs).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <LoadState loading={loading} error={error} />
      {data && (
        <>
          <Stats
            items={[
              { label: 'Runs', value: totals.runs },
              { label: 'Different setups', value: data.scenarios.length },
              { label: 'Runs with a prediction', value: totals.predictions },
              {
                label: 'Predictions right',
                value: pct(totals.predictions ? Math.round((1000 * totals.correct) / totals.predictions) / 10 : null),
              },
            ]}
          />
          <p className={styles.muted}>
            A prediction counts as right only if every part the student predicted was right. Runs with the same setup
            are grouped together; open a setup to see exactly what was configured.
          </p>

          {data.scenarios.length === 0 ? (
            <p className={styles.muted}>No simulation runs yet.</p>
          ) : (
            <DataTable caption="Setups, hardest to predict first">
              <thead>
                <tr>
                  <th scope="col">Setup</th>
                  <th scope="col">Actual outcome</th>
                  <th scope="col" className={styles.num}>Runs</th>
                  <th scope="col" className={styles.num}>Predictions right</th>
                  <th scope="col">Most common wrong predictions</th>
                  <th scope="col" className={styles.num}>Used Run to end</th>
                </tr>
              </thead>
              <tbody>
                {data.scenarios.map((s, i) => {
                  const d = experiment.describeRun({ lab: s.lab, config: s.config, prediction: {}, outcome: s.outcome })
                  return (
                    <tr key={i}>
                      <td className={styles.questionCell}>
                        <details>
                          {/* oxlint-disable-next-line jsx-a11y/control-has-associated-label -- the setup text is the label */}
                          <summary>
                            <span className={styles.cellNote}>{experiment.labs[s.lab] ?? s.lab}</span>
                            {d.setup}
                          </summary>
                          <pre className={styles.config}>{JSON.stringify(s.config, null, 2)}</pre>
                        </details>
                      </td>
                      <td>{d.outcome}</td>
                      <td className={styles.num}>
                        {s.runs}
                        <span className={styles.cellNote}>
                          {s.students} {s.students === 1 ? 'student' : 'students'}
                        </span>
                      </td>
                      <td className={styles.num}>
                        {pct(s.accuracy)}
                        <span className={styles.cellNote}>
                          {s.correct} of {s.predictions}
                        </span>
                      </td>
                      <td>
                        {s.wrongPredictions.length === 0
                          ? '—'
                          : s.wrongPredictions.map((w, j) => (
                              <span key={j} className={styles.wrongGuess}>
                                {experiment.describeRun({ lab: s.lab, config: s.config, prediction: w.prediction, outcome: s.outcome })
                                  .prediction || '(nothing predicted)'}{' '}
                                <span className={styles.cellNote}>
                                  {w.count} {w.count === 1 ? 'run' : 'runs'}
                                </span>
                              </span>
                            ))}
                      </td>
                      <td className={styles.num}>{pct(s.usedRunToEnd)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </DataTable>
          )}
        </>
      )}
    </>
  )
}
