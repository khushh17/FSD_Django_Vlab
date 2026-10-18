import { Link } from 'react-router-dom'
import { pct } from '../format.js'
import { DataTable, LoadState, Stats } from '../parts.jsx'
import { useAdminData } from '../useAdminData.js'
import { useExperiment } from '../useExperiment.js'
import styles from '../admin.module.css'

export default function Overview() {
  const experiment = useExperiment()
  const { data, error, loading } = useAdminData(`/api/admin/overview?experiment=${experiment.slug}`)
  const query = `?exp=${experiment.slug}`

  return (
    <>
      <h1 className={styles.title}>Overview</h1>
      <LoadState loading={loading} error={error} />
      {data && (
        <>
          <Stats
            items={[
              { label: 'Students with a roll number', value: data.students.signedIn, note: 'all experiments' },
              { label: 'Used this experiment', value: data.students.active },
              { label: 'Active in the last 7 days', value: data.students.activeLast7Days },
              {
                label: 'Average rating',
                value: data.ratings.average ?? '—',
                note: `${data.ratings.count} ${data.ratings.count === 1 ? 'rating' : 'ratings'}`,
              },
              { label: 'Feedback messages', value: data.feedback },
              { label: 'Open bug reports', value: data.openBugs },
            ]}
          />

          <h2 className={styles.subtitle}>Progress</h2>
          <DataTable caption="Students who did each part (out of those who used this experiment)">
            <thead>
              <tr>
                <th scope="col">Part</th>
                <th scope="col" className={styles.num}>Students</th>
                <th scope="col" className={styles.num}>Share</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['Pretest', data.completion.pretest],
                ['Simulation', data.completion.simulation],
                ['Posttest', data.completion.posttest],
              ].map(([label, n]) => (
                <tr key={label}>
                  <th scope="row">{label}</th>
                  <td className={styles.num}>{n}</td>
                  <td className={styles.num}>{pct(data.students.active ? Math.round((1000 * n) / data.students.active) / 10 : null)}</td>
                </tr>
              ))}
            </tbody>
          </DataTable>

          <h2 className={styles.subtitle}>Learning gain</h2>
          {data.learningGain.students === 0 ? (
            <p className={styles.muted}>No student has done both the pretest and the posttest yet.</p>
          ) : (
            <>
              <Stats
                items={[
                  { label: 'Students with both tests', value: data.learningGain.students },
                  { label: 'Pretest average', value: pct(data.learningGain.pretest) },
                  { label: 'Posttest average', value: pct(data.learningGain.posttest) },
                  {
                    label: 'Average gain',
                    value: data.learningGain.gain > 0 ? `+${data.learningGain.gain} points` : `${data.learningGain.gain} points`,
                  },
                ]}
              />
              <p className={styles.muted}>
                Each student’s first pretest compared with their first posttest. The pretest checks prerequisites and the
                posttest checks this experiment, and students choose the posttest level, so read the gain as a rough
                guide.
              </p>
            </>
          )}

          <h2 className={styles.subtitle}>Test scores</h2>
          <DataTable caption="Scores on each student's first attempt">
            <thead>
              <tr>
                <th scope="col">Test</th>
                <th scope="col" className={styles.num}>Students</th>
                <th scope="col" className={styles.num}>All attempts</th>
                <th scope="col" className={styles.num}>Average</th>
                <th scope="col" className={styles.num}>Median</th>
              </tr>
            </thead>
            <tbody>
              <ScoreRow label="Pretest" row={data.pretest} to={`/admin/quiz${query}&kind=pretest`} />
              {experiment.posttestLevels.map((level) => (
                <ScoreRow
                  key={level}
                  label={`Posttest (${level})`}
                  row={data.posttest[level]}
                  to={`/admin/quiz${query}&kind=posttest&level=${level}`}
                />
              ))}
            </tbody>
          </DataTable>

          <h2 className={styles.subtitle}>Simulation</h2>
          <DataTable caption="Simulation runs that reached the last step">
            <thead>
              <tr>
                <th scope="col">Lab</th>
                <th scope="col" className={styles.num}>Runs</th>
                <th scope="col" className={styles.num}>Students</th>
                <th scope="col" className={styles.num}>Runs with a prediction</th>
                <th scope="col" className={styles.num}>Predictions right</th>
                <th scope="col" className={styles.num}>Used Run to end</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(experiment.labs).map(([key, label]) => {
                const lab = data.simulation[key]
                return (
                  <tr key={key}>
                    <th scope="row">{label}</th>
                    <td className={styles.num}>{lab?.runs ?? 0}</td>
                    <td className={styles.num}>{lab?.students ?? 0}</td>
                    <td className={styles.num}>{lab?.predictions ?? 0}</td>
                    <td className={styles.num}>{pct(lab?.predictionAccuracy)}</td>
                    <td className={styles.num}>{pct(lab?.usedRunToEnd)}</td>
                  </tr>
                )
              })}
            </tbody>
          </DataTable>

          <h2 className={styles.subtitle}>Ratings</h2>
          <DataTable caption="Number of students giving each rating">
            <thead>
              <tr>
                {[1, 2, 3, 4, 5].map((s) => (
                  <th key={s} scope="col" className={styles.num}>
                    {s} {s === 1 ? 'star' : 'stars'}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                {[1, 2, 3, 4, 5].map((s) => (
                  <td key={s} className={styles.num}>
                    {data.ratings.distribution[s]}
                  </td>
                ))}
              </tr>
            </tbody>
          </DataTable>
          <p className={styles.muted}>
            Read the <Link to={`/admin/feedback${query}`}>feedback</Link> and the{' '}
            <Link to={`/admin/bugs${query}`}>bug reports</Link>, or see which simulation setups students find hardest
            in the <Link to={`/admin/simulation${query}`}>simulation analysis</Link>.
          </p>
        </>
      )}
    </>
  )
}

function ScoreRow({ label, row, to }) {
  return (
    <tr>
      <th scope="row">
        <Link to={to}>{label}</Link>
      </th>
      <td className={styles.num}>{row?.students ?? 0}</td>
      <td className={styles.num}>{row?.attempts ?? 0}</td>
      <td className={styles.num}>{pct(row?.averageFirst)}</td>
      <td className={styles.num}>{pct(row?.medianFirst)}</td>
    </tr>
  )
}
