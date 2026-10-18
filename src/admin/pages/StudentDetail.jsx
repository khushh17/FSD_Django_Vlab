import { useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import RichText from '../../components/quiz/RichText.jsx'
import { duration, pct, testName, when } from '../format.js'
import { DataTable, LoadState, Stats } from '../parts.jsx'
import { useAdminData } from '../useAdminData.js'
import { useExperiment } from '../useExperiment.js'
import styles from '../admin.module.css'

export default function StudentDetail() {
  const { id } = useParams()
  const experiment = useExperiment()
  const { data, error, loading } = useAdminData(`/api/admin/students/${encodeURIComponent(id)}?experiment=${experiment.slug}`)
  const bank = useMemo(
    () => new Map([...experiment.pretest, ...experiment.posttest].map((q) => [q.id, q])),
    [experiment],
  )

  return (
    <>
      <p className={styles.back}>
        <Link to={`/admin/students?exp=${experiment.slug}`}>← All students</Link>
      </p>
      <LoadState loading={loading} error={error} />
      {data && (
        <>
          <h1 className={styles.title}>{data.student.rollNumber ?? data.student.email}</h1>
          <Stats
            items={[
              { label: 'Name', value: data.student.name || '—' },
              { label: 'Email', value: data.student.email },
              { label: 'First signed in', value: when(data.student.createdAt) },
              { label: 'Last seen', value: when(data.student.lastSeen) },
              { label: 'Rating', value: data.rating ?? '—' },
            ]}
          />

          <h2 className={styles.subtitle}>Test attempts</h2>
          {data.attempts.length === 0 ? (
            <p className={styles.muted}>No attempts yet.</p>
          ) : (
            <ol className={styles.attemptList}>
              {data.attempts.map((a) => (
                <li key={a.id} className={styles.attempt}>
                  <details>
                    <summary>
                      <strong>{testName(a.kind, a.level)}</strong>: {a.score}/{a.total} ({pct(a.percent)})
                      <span className={styles.summaryMeta}>
                        {when(a.createdAt)} · {duration(a.durationSeconds)}
                        {a.retake ? ' · retake' : ''}
                      </span>
                    </summary>
                    <ol className={styles.answerList}>
                      {a.answers.map((ans) => (
                        <Answer key={ans.questionId} answer={ans} question={bank.get(ans.questionId)} />
                      ))}
                    </ol>
                  </details>
                </li>
              ))}
            </ol>
          )}

          <h2 className={styles.subtitle}>Simulation runs</h2>
          {data.runs.length === 0 ? (
            <p className={styles.muted}>No simulation runs yet.</p>
          ) : (
            <DataTable caption="Simulation runs, newest first">
              <thead>
                <tr>
                  <th scope="col">When</th>
                  <th scope="col">Lab</th>
                  <th scope="col">Setup</th>
                  <th scope="col">Prediction</th>
                  <th scope="col">Outcome</th>
                  <th scope="col">Steps</th>
                </tr>
              </thead>
              <tbody>
                {data.runs.map((r) => {
                  const d = experiment.describeRun(r)
                  return (
                    <tr key={r.id}>
                      <td>{when(r.createdAt)}</td>
                      <td>{experiment.labs[r.lab] ?? r.lab}</td>
                      <td>{d.setup}</td>
                      <td>
                        {d.prediction || '—'}
                        {r.predictionCorrect != null && (
                          <span className={r.predictionCorrect ? styles.right : styles.wrong}>
                            {r.predictionCorrect ? ' (right)' : ' (wrong)'}
                          </span>
                        )}
                      </td>
                      <td>{d.outcome}</td>
                      <td>
                        {r.usedRunToEnd ? `${r.stepsViewed} of ${r.stepsTotal}, then Run to end` : `all ${r.stepsTotal}`}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </DataTable>
          )}

          <h2 className={styles.subtitle}>Feedback</h2>
          {data.feedback.length === 0 ? (
            <p className={styles.muted}>No feedback.</p>
          ) : (
            <ul className={styles.feedbackList}>
              {data.feedback.map((f) => (
                <li key={f.created_at}>
                  <p className={styles.feedbackMeta}>{when(f.created_at)}</p>
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

function Answer({ answer, question }) {
  if (!question) {
    return (
      <li>
        <code>{answer.questionId}</code> (no longer in the question bank): {answer.correct ? 'right' : 'wrong'}
      </li>
    )
  }
  const chosen = answer.chosen == null ? null : question.options[answer.chosen]
  return (
    <li className={answer.correct ? styles.answerRight : styles.answerWrong}>
      <p className={styles.answerQuestion}>
        <RichText text={question.question} />
      </p>
      <p className={styles.answerChoice}>
        {answer.correct ? 'Right: ' : 'Wrong: '}
        {chosen == null ? <em>skipped</em> : <RichText text={chosen} />}
        {!answer.correct && (
          <>
            {' '}
            (answer: <RichText text={question.options[question.answer]} />)
          </>
        )}
      </p>
    </li>
  )
}
