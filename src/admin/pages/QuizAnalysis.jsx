import { useId } from 'react'
import { useSearchParams } from 'react-router-dom'
import RichText from '../../components/quiz/RichText.jsx'
import { pct, testName } from '../format.js'
import { DataTable, LoadState, Stats } from '../parts.jsx'
import { useAdminData } from '../useAdminData.js'
import { useExperiment } from '../useExperiment.js'
import styles from '../admin.module.css'

/**
 * Per-question results for one test: how many got it right and which wrong option was
 * chosen most (a sign of a common misconception, or of a confusing question).
 */
export default function QuizAnalysis() {
  const experiment = useExperiment()
  const [params, setParams] = useSearchParams()
  const ids = { kind: useId(), level: useId(), attempts: useId() }

  const kind = params.get('kind') === 'posttest' ? 'posttest' : 'pretest'
  const levels = experiment.posttestLevels
  const level = kind === 'posttest' ? (levels.includes(params.get('level')) ? params.get('level') : levels[0]) : ''
  const attempts = params.get('attempts') === 'all' ? 'all' : 'first'

  const query = new URLSearchParams({ experiment: experiment.slug, kind, level, attempts })
  const { data, error, loading } = useAdminData(`/api/admin/quiz?${query}`)

  function update(patch) {
    setParams((prev) => ({ ...Object.fromEntries(prev), ...patch }), { replace: true })
  }

  const bank = kind === 'pretest' ? experiment.pretest : experiment.posttest.filter((q) => q.levels.includes(level))
  const rows = data
    ? bank
        .map((q) => {
          const r = data.questions[q.id] ?? { answered: 0, correct: 0, skipped: 0, percentCorrect: null, chosen: {} }
          const wrong = Object.entries(r.chosen)
            .map(([option, n]) => [Number(option), n])
            .filter(([option]) => option !== q.answer)
            .sort((a, b) => b[1] - a[1])[0]
          return { q, r, wrong }
        })
        // Hardest first; questions nobody has answered go last.
        .sort((a, b) => (a.r.percentCorrect ?? 101) - (b.r.percentCorrect ?? 101))
    : []

  return (
    <>
      <h1 className={styles.title}>Quiz analysis</h1>
      <div className={styles.filters}>
        <label className={styles.field} htmlFor={ids.kind}>
          Test
          <select id={ids.kind} value={kind} onChange={(e) => update({ kind: e.target.value })}>
            <option value="pretest">Pretest</option>
            <option value="posttest">Posttest</option>
          </select>
        </label>
        {kind === 'posttest' && (
          <label className={styles.field} htmlFor={ids.level}>
            Level
            <select id={ids.level} value={level} onChange={(e) => update({ level: e.target.value })}>
              {levels.map((l) => (
                <option key={l} value={l}>
                  {l[0].toUpperCase() + l.slice(1)}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className={styles.field} htmlFor={ids.attempts}>
          Attempts
          <select id={ids.attempts} value={attempts} onChange={(e) => update({ attempts: e.target.value })}>
            <option value="first">Each student’s first attempt</option>
            <option value="all">All attempts, including retakes</option>
          </select>
        </label>
      </div>

      <LoadState loading={loading} error={error} />
      {data && (
        <>
          <Stats
            items={[
              { label: 'Test', value: testName(kind, level) },
              { label: 'Attempts counted', value: data.count },
              { label: 'Average score', value: pct(data.averagePercent) },
            ]}
          />
          {attempts === 'all' && (
            <p className={styles.muted}>
              Retakes come after students have seen the answers and explanations, so all-attempt numbers run
              higher. First attempts are the fairer measure.
            </p>
          )}

          {data.count > 0 && (
            <DataTable caption="Number of attempts with each score">
              <thead>
                <tr>
                  {Object.keys(data.scores).map((s) => (
                    <th key={s} scope="col" className={styles.num}>
                      {s}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  {Object.entries(data.scores).map(([s, n]) => (
                    <td key={s} className={styles.num}>
                      {n}
                    </td>
                  ))}
                </tr>
              </tbody>
            </DataTable>
          )}

          <h2 className={styles.subtitle}>Questions, hardest first</h2>
          <DataTable caption="Each question: how many answered it, the share who got it right, and the most chosen wrong answer">
            <thead>
              <tr>
                <th scope="col">Question</th>
                <th scope="col" className={styles.num}>Answered</th>
                <th scope="col" className={styles.num}>Right</th>
                <th scope="col">Most chosen wrong answer</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ q, r, wrong }) => (
                <tr key={q.id}>
                  <td className={styles.questionCell}>
                    <details>
                      {/* oxlint-disable-next-line jsx-a11y/control-has-associated-label -- the question text is the label */}
                      <summary>
                        <RichText text={q.question} />
                      </summary>
                      <ol className={styles.optionList} type="A">
                        {q.options.map((option, i) => (
                          <li key={i} className={i === q.answer ? styles.answerRight : undefined}>
                            <RichText text={option} /> <span className={styles.cellNote}>{r.chosen[i] ?? 0} chose this{i === q.answer ? ' (correct)' : ''}</span>
                          </li>
                        ))}
                      </ol>
                      <p className={styles.cellNote}>
                        ID <code>{q.id}</code>, topic {q.topic}. {r.skipped > 0 && `${r.skipped} skipped it.`}
                      </p>
                    </details>
                  </td>
                  <td className={styles.num}>{r.answered + r.skipped}</td>
                  <td className={styles.num}>{pct(r.percentCorrect)}</td>
                  <td>
                    {wrong ? (
                      <>
                        <RichText text={q.options[wrong[0]]} />
                        <span className={styles.cellNote}>
                          {wrong[1]} {wrong[1] === 1 ? 'student' : 'students'}
                        </span>
                      </>
                    ) : (
                      '—'
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </DataTable>
        </>
      )}
    </>
  )
}
