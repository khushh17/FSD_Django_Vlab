import { useId, useState } from 'react'
import RecordNote from '../../../components/account/RecordNote.jsx'
import CodeBlock from '../../../components/content/CodeBlock.jsx'
import { CUSTOM_MIDDLEWARE, DEFAULT_MIDDLEWARE, LAB_URLCONF, MIDDLEWARE, REQUESTS, VIEWS } from './engine/middlewareCatalog.js'
import { reasonPhrase, simulate } from './engine/middlewareEngine.js'
import { Panel, PredictionCheck, SimControls, StepLog } from './SimParts.jsx'
import styles from './Simulation.module.css'
import { predictionResult, useRunRecorder } from './useRunRecorder.js'

const STATUS_CHOICES = ['200', '403', '404', '405', '500', '503']
const SHOWN_HEADERS = ['Content-Type', 'X-Frame-Options', 'X-Content-Type-Options', 'Referrer-Policy', 'Cross-Origin-Opener-Policy', 'Allow']

export default function MiddlewareLab() {
  const [middleware, setMiddleware] = useState(DEFAULT_MIDDLEWARE)
  const [requestKey, setRequestKey] = useState('get')
  const [viewKey, setViewKey] = useState('render')
  const [toAdd, setToAdd] = useState('')
  const [predictStatus, setPredictStatus] = useState('')
  const [predictView, setPredictView] = useState('')
  const [run, setRun] = useState(null) // { sim, index, jumpedFrom? }
  const ids = { request: useId(), view: useId(), add: useId(), status: useId(), viewRan: useId() }

  const running = run !== null
  const finished = running && run.index >= run.sim.steps.length - 1
  const unused = Object.keys(MIDDLEWARE).filter((m) => !middleware.includes(m))

  function move(i, delta) {
    setMiddleware((list) => {
      const next = [...list]
      const j = i + delta
      if (j < 0 || j >= next.length) return list
      ;[next[i], next[j]] = [next[j], next[i]]
      return next
    })
  }

  function start() {
    setRun({ sim: simulate({ middleware, request: requestKey, view: viewKey }), index: 0 })
  }

  const shownSteps = running ? run.sim.steps.slice(0, run.index + 1) : []
  const prints = shownSteps.flatMap((s) => s.prints)
  const cards = shownSteps.map((s) => ({
    title: s.title,
    detail: s.detail,
    status: s.kind === 'done' ? null : s.status,
    depth: depthOf(s, middleware.length),
    prints: s.prints,
  }))
  const result = run?.sim.result
  const predictions = result
    ? [
        { label: 'Status', predicted: predictStatus, actual: String(result.status) },
        {
          label: 'View runs',
          predicted: predictView,
          actual: result.viewCalled ? 'yes' : 'no',
          predictedText: predictView === 'yes' ? 'yes' : 'no',
          actualText: result.viewCalled ? 'yes' : 'no',
        },
      ]
    : []
  const recorded = useRunRecorder(run, finished, () => ({
    lab: 'middleware',
    config: { middleware, request: requestKey, view: viewKey },
    prediction: { status: predictStatus, viewRuns: predictView },
    outcome: {
      status: result.status,
      viewCalled: result.viewCalled,
      source: result.source,
      error: result.error?.type ?? null,
    },
    predictionCorrect: predictionResult(predictions),
  }))
  const settingsCode = `MIDDLEWARE = [\n${middleware.map((m) => `    "${MIDDLEWARE[m].path}",`).join('\n')}\n]`

  return (
    <div className={styles.lab}>
      <p className={styles.intro}>
        Arrange <code>MIDDLEWARE</code>, choose a request and a view, predict the result, then step through what
        Django does. The project uses <code>DEBUG = False</code> and one URL pattern, <code>blog/&lt;int:pk&gt;/</code>.
        Every combination here was checked against Django 6.1.
      </p>

      <div className={styles.layout}>
        <Panel title="Problem">
          <fieldset className={styles.fieldset}>
            <legend className={styles.legend}>Request and view</legend>
            <label className={styles.field} htmlFor={ids.request}>
              <span>Request</span>
              <select id={ids.request} disabled={running} value={requestKey} onChange={(e) => setRequestKey(e.target.value)}>
                {Object.entries(REQUESTS).map(([k, r]) => (
                  <option key={k} value={k}>
                    {r.label}
                  </option>
                ))}
              </select>
            </label>
            <label className={styles.field} htmlFor={ids.view}>
              <span>View post_detail</span>
              <select id={ids.view} disabled={running} value={viewKey} onChange={(e) => setViewKey(e.target.value)}>
                {Object.entries(VIEWS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v.label}
                  </option>
                ))}
              </select>
            </label>
            <details className={styles.details}>
              <summary>Show the view code and URLconf</summary>
              <CodeBlock title="blog/views.py" code={VIEWS[viewKey].code} />
              <CodeBlock title="mysite/urls.py" code={LAB_URLCONF} />
            </details>
          </fieldset>

          <fieldset className={styles.fieldset}>
            <legend className={styles.legend}>MIDDLEWARE (top runs first on the way in)</legend>
            {middleware.length === 0 && <p className={styles.note}>The list is empty.</p>}
            <ol className={styles.mwList}>
              {middleware.map((name, i) => (
                <li key={name} className={styles.mwItem}>
                  <div className={styles.mwRow}>
                    <span className={styles.mwName}>
                      {name}
                      {!MIDDLEWARE[name].builtin && <span className={styles.badge}>custom</span>}
                    </span>
                    <span className={styles.mwButtons}>
                      <button type="button" className={styles.small} onClick={() => move(i, -1)} disabled={running || i === 0} aria-label={`Move ${name} up`}>
                        Up
                      </button>
                      <button type="button" className={styles.small} onClick={() => move(i, 1)} disabled={running || i === middleware.length - 1} aria-label={`Move ${name} down`}>
                        Down
                      </button>
                      <button type="button" className={styles.small} onClick={() => setMiddleware((l) => l.filter((m) => m !== name))} disabled={running} aria-label={`Remove ${name}`}>
                        Remove
                      </button>
                    </span>
                  </div>
                  <span className={styles.mwSummary}>{MIDDLEWARE[name].summary}</span>
                  {MIDDLEWARE[name].code && (
                    <details className={styles.details}>
                      <summary>Show code</summary>
                      <CodeBlock title="blog/middleware.py" code={MIDDLEWARE[name].code} />
                    </details>
                  )}
                </li>
              ))}
            </ol>
            <div className={styles.addRow}>
              <label htmlFor={ids.add} className="visually-hidden">
                Middleware to add
              </label>
              <select id={ids.add} disabled={running} value={toAdd} onChange={(e) => setToAdd(e.target.value)}>
                <option value="">Add middleware…</option>
                {unused.map((m) => (
                  <option key={m} value={m}>
                    {m}
                    {CUSTOM_MIDDLEWARE.includes(m) ? ' (custom)' : ''}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className={styles.small}
                disabled={running || !toAdd}
                onClick={() => {
                  setMiddleware((l) => [...l, toAdd])
                  setToAdd('')
                }}
              >
                Add at bottom
              </button>
              <button type="button" className={styles.small} disabled={running} onClick={() => setMiddleware(DEFAULT_MIDDLEWARE)}>
                Restore default list
              </button>
            </div>
            <details className={styles.details}>
              <summary>Show as settings.py</summary>
              <CodeBlock title="mysite/settings.py" code={settingsCode} />
            </details>
          </fieldset>

          <fieldset className={styles.fieldset}>
            <legend className={styles.legend}>Predict before you start (optional)</legend>
            <label className={styles.field} htmlFor={ids.status}>
              <span>Status code</span>
              <select id={ids.status} disabled={running} value={predictStatus} onChange={(e) => setPredictStatus(e.target.value)}>
                <option value="">No prediction</option>
                {STATUS_CHOICES.map((s) => (
                  <option key={s} value={s}>
                    {s} {reasonPhrase(Number(s))}
                  </option>
                ))}
              </select>
            </label>
            <label className={styles.field} htmlFor={ids.viewRan}>
              <span>Will the view run?</span>
              <select id={ids.viewRan} disabled={running} value={predictView} onChange={(e) => setPredictView(e.target.value)}>
                <option value="">No prediction</option>
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </label>
          </fieldset>

          <p className={styles.note}>When you are ready, press Start beside the steps.</p>
        </Panel>

        <div className={styles.runColumn}>
          <SimControls
            running={running}
            finished={finished}
            canStart
            index={run?.index ?? 0}
            total={run?.sim.steps.length ?? 0}
            onStart={start}
            onNext={() => setRun((r) => ({ ...r, index: Math.min(r.index + 1, r.sim.steps.length - 1) }))}
            onFinish={() => setRun((r) => ({ ...r, jumpedFrom: r.jumpedFrom ?? r.index, index: r.sim.steps.length - 1 }))}
            onReset={() => setRun(null)}
          />

          <Panel title="Step Execute">
            <StepLog steps={cards} total={run?.sim.steps.length ?? 0} emptyText="Press Start to run the request. Each step appears here, newest at the bottom." />
          </Panel>

          <Panel title="Result">
            {!running && <p className={styles.note}>The console output and the response appear here.</p>}
            {running && (
              <>
                <h3 className={styles.subhead}>Console output</h3>
                <pre className={styles.console} aria-label="Console output">
                  {prints.length ? prints.join('\n') : '(nothing printed yet)'}
                </pre>
              </>
            )}

            {finished && (
              <>
                <h3 className={styles.subhead}>Response</h3>
                <p className={styles.bigStatus}>
                  {result.status} {result.reason}
                </p>
                <dl className={styles.facts}>
                  <dt>Produced by</dt>
                  <dd>{result.source}</dd>
                  <dt>View called</dt>
                  <dd>{result.viewCalled ? 'Yes' : 'No'}</dd>
                  {result.template && (
                    <>
                      <dt>Template</dt>
                      <dd>
                        <code>{result.template}</code>
                      </dd>
                    </>
                  )}
                  {result.error && (
                    <>
                      <dt>Exception</dt>
                      <dd>
                        <code>{result.error.type}</code>: {result.error.message}
                      </dd>
                    </>
                  )}
                </dl>
                <h3 className={styles.subhead}>Headers</h3>
                <ul className={styles.headers}>
                  {SHOWN_HEADERS.filter((h) => result.headers[h] !== undefined).map((h) => (
                    <li key={h}>
                      <code>
                        {h}: {result.headers[h]}
                      </code>
                    </li>
                  ))}
                </ul>
                <PredictionCheck items={predictions} />
                <RecordNote recorded={recorded} what="run" />
              </>
            )}
          </Panel>
        </div>
      </div>
    </div>
  )
}

// Indent the trace like the onion: __call__ of layer i at depth i; URL resolution, the hooks
// (process_view and friends) and the view all run inside _get_response, at the centre.
const CENTRE_KINDS = ['process_view', 'process_exception', 'process_template_response']
function depthOf(step, layers) {
  if (CENTRE_KINDS.includes(step.kind)) return layers
  if (step.layer != null) return step.layer
  if (step.kind === 'start' || step.kind === 'done') return 0
  return layers
}
