import { useId, useMemo, useState } from 'react'
import { formatKwargs, simulateUrl, validateUrlconf } from './engine/urlEngine.js'
import { PRESETS, VIEW_NAMES, newId, withIds } from './engine/urlPresets.js'
import RecordNote from '../../../components/account/RecordNote.jsx'
import { Panel, PredictionCheck, SimControls, StepLog } from './SimParts.jsx'
import { describeKey, OUTCOME_TEXT } from './engine/outcomes.js'
import { predictionResult, useRunRecorder } from './useRunRecorder.js'
import styles from './Simulation.module.css'

const STATUS_TEXT = {
  'no-match': 'no match',
  match: 'match',
  prefix: 'prefix matched',
  'include-miss': 'nothing inside matched',
}

// Card titles for steps that are not about one pattern
const PHASE_TITLE = {
  start: 'Root resolver',
  outcome: 'View called',
  'not-found': 'No match: Resolver404',
  'append-slash': 'CommonMiddleware (APPEND_SLASH)',
  redirect: '301 redirect',
  'runtime-error': 'RuntimeError',
  welcome: 'Welcome page',
}


export default function UrlLab() {
  const [presetKey, setPresetKey] = useState('theory')
  const [entries, setEntries] = useState(() => withIds(PRESETS.theory.entries))
  const [request, setRequest] = useState(PRESETS.theory.request)
  const [prediction, setPrediction] = useState('')
  const [run, setRun] = useState(null) // { sim, index, jumpedFrom? }
  const ids = { preset: useId(), path: useId(), method: useId(), slash: useId(), debug: useId(), predict: useId() }

  const running = run !== null
  const finished = running && run.index >= run.sim.steps.length - 1
  const validation = useMemo(() => validateUrlconf(entries), [entries])
  const canStart = validation.errors.length === 0 && request.path.trim() !== ''

  function loadPreset(key) {
    setPresetKey(key)
    setEntries(withIds(PRESETS[key].entries))
    setRequest(PRESETS[key].request)
    setPrediction('')
  }

  // Generic list edits for the root list (parentId null) or an include's children.
  function updateList(parentId, fn) {
    setEntries((list) =>
      parentId === null ? fn(list) : list.map((e) => (e.id === parentId ? { ...e, children: fn(e.children ?? []) } : e)),
    )
  }
  const edit = (parentId, id, patch) => updateList(parentId, (l) => l.map((e) => (e.id === id ? { ...e, ...patch } : e)))
  const remove = (parentId, id) => updateList(parentId, (l) => l.filter((e) => e.id !== id))
  const move = (parentId, index, delta) =>
    updateList(parentId, (l) => {
      const j = index + delta
      if (j < 0 || j >= l.length) return l
      const next = [...l]
      ;[next[index], next[j]] = [next[j], next[index]]
      return next
    })
  const addView = (parentId) => updateList(parentId, (l) => [...l, { id: newId(), kind: 'view', route: '', view: 'home', name: '' }])
  const addInclude = () =>
    setEntries((l) => [...l, { id: newId(), kind: 'include', route: 'shop/', module: 'shop', children: [] }])

  const viewOptions = [...new Set(entries.flatMap((e) => (e.kind === 'include' ? (e.children ?? []).map((c) => c.view) : [e.view])))]

  const shownSteps = running ? run.sim.steps.slice(0, run.index + 1) : []
  const current = shownSteps[shownSteps.length - 1]
  const statusById = {}
  for (const s of shownSteps) if (s.id) statusById[s.id] = s.result
  const outcome = run?.sim.outcome
  const outcomeKey = outcome ? (outcome.type === 'match' ? `view:${outcome.view}` : outcome.type) : ''
  const predictions = [
    {
      label: 'Outcome',
      predicted: prediction,
      actual: outcomeKey,
      predictedText: describeKey(prediction),
      actualText: describeKey(outcomeKey),
    },
  ]
  const recorded = useRunRecorder(run, finished, () => ({
    lab: 'urls',
    config: { preset: presetKey, urlpatterns: stripIds(entries), request },
    prediction: { outcome: prediction },
    outcome: { type: outcome.type, key: outcomeKey },
    predictionCorrect: predictionResult(predictions),
  }))
  const lines = sourceLines(entries)
  const labels = patternLabels(entries)
  const cards = shownSteps.map((s) => ({
    title: s.id ? labels[s.id] : PHASE_TITLE[s.result] ?? 'Step',
    detail: s.detail,
    status: s.id ? STATUS_TEXT[s.result] : null,
  }))

  return (
    <div className={styles.lab}>
      <p className={styles.intro}>
        Build <code>urlpatterns</code>, enter a request path, predict the outcome, then step through URL resolution.
        The project uses the default <code>MIDDLEWARE</code> (so <code>CommonMiddleware</code> applies{' '}
        <code>APPEND_SLASH</code>), and POST requests are assumed to carry a valid CSRF token.
      </p>

      <div className={styles.layout}>
        <Panel title="Problem">
          <fieldset className={styles.fieldset}>
            <legend className={styles.legend}>URLconf</legend>
            <label className={styles.field} htmlFor={ids.preset}>
              <span>Start from</span>
              <select id={ids.preset} disabled={running} value={presetKey} onChange={(e) => loadPreset(e.target.value)}>
                {Object.entries(PRESETS).map(([k, p]) => (
                  <option key={k} value={k}>
                    {p.label}
                  </option>
                ))}
              </select>
            </label>

            <ol className={styles.urlList}>
              {entries.map((entry, i) => (
                <li key={entry.id} className={styles.urlItem}>
                  <EntryRow
                    entry={entry}
                    index={i}
                    count={entries.length}
                    onEdit={(patch) => edit(null, entry.id, patch)}
                    onRemove={() => remove(null, entry.id)}
                    onMove={(d) => move(null, i, d)}
                    messages={messagesFor(validation, entry.id)}
                    locked={running}
                  />
                  {entry.kind === 'include' && (
                    <div className={styles.children}>
                      <p className={styles.childrenHead}>
                        <code>{entry.module || '?'}/urls.py</code>
                      </p>
                      {(entry.children ?? []).length === 0 && <p className={styles.note}>No patterns yet.</p>}
                      <ol className={styles.urlList}>
                        {(entry.children ?? []).map((child, j) => (
                          <li key={child.id} className={styles.urlItem}>
                            <EntryRow
                              entry={child}
                              index={j}
                              count={entry.children.length}
                              onEdit={(patch) => edit(entry.id, child.id, patch)}
                              onRemove={() => remove(entry.id, child.id)}
                              onMove={(d) => move(entry.id, j, d)}
                              messages={messagesFor(validation, child.id)}
                              locked={running}
                            />
                          </li>
                        ))}
                      </ol>
                      <button type="button" className={styles.small} disabled={running} onClick={() => addView(entry.id)}>
                        Add path() to {entry.module || 'this include'}
                      </button>
                    </div>
                  )}
                </li>
              ))}
            </ol>
            <div className={styles.addRow}>
              <button type="button" className={styles.small} disabled={running} onClick={() => addView(null)}>
                Add path()
              </button>
              <button type="button" className={styles.small} disabled={running} onClick={addInclude}>
                Add include()
              </button>
            </div>
          </fieldset>

          <fieldset className={styles.fieldset}>
            <legend className={styles.legend}>Request</legend>
            <label className={styles.field} htmlFor={ids.path}>
              <span>Path</span>
              <input
                id={ids.path}
                type="text"
                disabled={running}
                value={request.path}
                spellCheck={false}
                autoComplete="off"
                onChange={(e) => setRequest((r) => ({ ...r, path: e.target.value }))}
              />
            </label>
            <label className={styles.field} htmlFor={ids.method}>
              <span>Method</span>
              <select id={ids.method} disabled={running} value={request.method} onChange={(e) => setRequest((r) => ({ ...r, method: e.target.value }))}>
                <option>GET</option>
                <option>POST</option>
              </select>
            </label>
            <label className={styles.check} htmlFor={ids.slash}>
              <input id={ids.slash} type="checkbox" disabled={running} checked={request.appendSlash} onChange={(e) => setRequest((r) => ({ ...r, appendSlash: e.target.checked }))} />
              <code>APPEND_SLASH = {request.appendSlash ? 'True' : 'False'}</code>
            </label>
            <label className={styles.check} htmlFor={ids.debug}>
              <input id={ids.debug} type="checkbox" disabled={running} checked={request.debug} onChange={(e) => setRequest((r) => ({ ...r, debug: e.target.checked }))} />
              <code>DEBUG = {request.debug ? 'True' : 'False'}</code>
            </label>
          </fieldset>

          <fieldset className={styles.fieldset}>
            <legend className={styles.legend}>Predict before you start (optional)</legend>
            <label className={styles.field} htmlFor={ids.predict}>
              <span>Outcome</span>
              <select id={ids.predict} disabled={running} value={prediction} onChange={(e) => setPrediction(e.target.value)}>
                <option value="">No prediction</option>
                {viewOptions.map((v) => (
                  <option key={v} value={`view:${v}`}>
                    Calls {v}
                  </option>
                ))}
                {Object.entries(OUTCOME_TEXT).map(([k, t]) => (
                  <option key={k} value={k}>
                    {t}
                  </option>
                ))}
              </select>
            </label>
          </fieldset>

          <p className={styles.note}>When you are ready, press Start beside the steps.</p>
        </Panel>

        <div className={styles.runColumn}>
          <SimControls
            running={running}
            finished={finished}
            canStart={canStart}
            index={run?.index ?? 0}
            total={run?.sim.steps.length ?? 0}
            startHint={!canStart && !running ? 'Fix the URLconf errors (or enter a path) to start.' : null}
            onStart={() => setRun({ sim: simulateUrl(entries, request), index: 0 })}
            onNext={() => setRun((r) => ({ ...r, index: Math.min(r.index + 1, r.sim.steps.length - 1) }))}
            onFinish={() => setRun((r) => ({ ...r, jumpedFrom: r.jumpedFrom ?? r.index, index: r.sim.steps.length - 1 }))}
            onReset={() => setRun(null)}
          />

          <Panel title="Step Execute">
            <StepLog steps={cards} total={run?.sim.steps.length ?? 0} emptyText="Press Start to resolve the path. Each step appears here, newest at the bottom." />
          </Panel>

          <Panel title="Result">
            <dl className={styles.facts}>
              <dt>Request</dt>
              <dd>
                <code>
                  {request.method} {request.path || '(no path)'}
                </code>
              </dd>
              <dt>Settings</dt>
              <dd>
                <code>APPEND_SLASH={request.appendSlash ? 'True' : 'False'}</code>,{' '}
                <code>DEBUG={request.debug ? 'True' : 'False'}</code>
              </dd>
            </dl>
            {validation.warnings.length > 0 && (
              <ul className={styles.warnings}>
                {validation.warnings.map((w) => (
                  <li key={w.id + w.message}>{w.message}</li>
                ))}
              </ul>
            )}
            <h3 className={styles.subhead}>urls.py as tested</h3>
            {/* oxlint-disable-next-line jsx-a11y/no-noninteractive-tabindex */}
            <pre className={styles.source} tabIndex={0} aria-label="URLconf source">
              {lines.map((line, i) => {
                const status = line.id ? statusById[line.id] : undefined
                const isCurrent = running && line.id && current?.id === line.id
                return (
                  <span key={i} className={`${styles.sourceLine} ${isCurrent ? styles.current : ''}`}>
                    {line.text}
                    {status && STATUS_TEXT[status] && (
                      <span className={`${styles.lineTag} ${status === 'match' || status === 'prefix' ? styles.right : ''}`}>
                        {'  # '}
                        {STATUS_TEXT[status]}
                      </span>
                    )}
                    {'\n'}
                  </span>
                )
              })}
            </pre>
            {finished && <Outcome outcome={outcome} />}
            {finished && (
              <>
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

// The URLconf as the student built it, without the editor's internal ids.
function stripIds(list) {
  return list.map(({ id: _id, children, ...rest }) => (children ? { ...rest, children: stripIds(children) } : rest))
}

function EntryRow({ entry, index, count, onEdit, onRemove, onMove, messages, locked }) {
  const routeId = useId()
  const viewId = useId()
  const nameId = useId()
  const label = `${entry.kind === 'include' ? 'include' : 'path'} ${index + 1}`
  return (
    <div className={styles.entry}>
      <div className={styles.entryRow}>
        <span className={styles.kind}>{entry.kind === 'include' ? 'include()' : 'path()'}</span>
        <label htmlFor={routeId} className="visually-hidden">
          Route for {label}
        </label>
        <input
          id={routeId}
          type="text"
          className={styles.routeInput}
          value={entry.route}
          disabled={locked}
          placeholder='"" (empty route)'
          spellCheck={false}
          autoComplete="off"
          onChange={(e) => onEdit({ route: e.target.value })}
        />
        {entry.kind === 'include' ? (
          <>
            <label htmlFor={viewId} className="visually-hidden">
              Module for {label}
            </label>
            <input
              id={viewId}
              type="text"
              className={styles.nameInput}
              value={entry.module}
              disabled={locked}
              spellCheck={false}
              autoComplete="off"
              onChange={(e) => onEdit({ module: e.target.value.replace(/[^A-Za-z0-9_]/g, '') })}
            />
            <span className={styles.suffix}>.urls</span>
          </>
        ) : (
          <>
            <label htmlFor={viewId} className="visually-hidden">
              View for {label}
            </label>
            <select id={viewId} disabled={locked} value={entry.view} onChange={(e) => onEdit({ view: e.target.value })}>
              {VIEW_NAMES.map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
            <label htmlFor={nameId} className={styles.suffix}>
              <span aria-hidden="true">name=</span>
              <span className="visually-hidden">URL name for {label}</span>
            </label>
            <input
              id={nameId}
              type="text"
              className={styles.nameInput}
              value={entry.name}
              disabled={locked}
              placeholder="name"
              spellCheck={false}
              autoComplete="off"
              onChange={(e) => onEdit({ name: e.target.value })}
            />
          </>
        )}
        <span className={styles.mwButtons}>
          <button type="button" className={styles.small} onClick={() => onMove(-1)} disabled={locked || index === 0} aria-label={`Move ${label} up`}>
            Up
          </button>
          <button type="button" className={styles.small} onClick={() => onMove(1)} disabled={locked || index === count - 1} aria-label={`Move ${label} down`}>
            Down
          </button>
          <button type="button" className={styles.small} onClick={onRemove} disabled={locked} aria-label={`Remove ${label}`}>
            Remove
          </button>
        </span>
      </div>
      {messages.map((m) => (
        <p key={m.text} className={m.error ? styles.error : styles.warning}>
          {m.error ? 'Django would refuse this route: ' : 'Warning: '}
          {m.text}
        </p>
      ))}
    </div>
  )
}

function Outcome({ outcome }) {
  return (
    <div className={styles.outcome}>
      <h3 className={styles.subhead}>Outcome</h3>
      {outcome.type === 'match' && (
        <>
          <p className={styles.bigStatus}>Calls {outcome.view}</p>
          <dl className={styles.facts}>
            <dt>kwargs</dt>
            <dd>
              <code>{formatKwargs(outcome.kwargs)}</code>
            </dd>
            <dt>url_name</dt>
            <dd>
              <code>{outcome.urlName ?? 'None'}</code>
            </dd>
            <dt>route</dt>
            <dd>
              <code>{outcome.route === '' ? "''" : outcome.route}</code>
            </dd>
          </dl>
        </>
      )}
      {outcome.type === 'redirect' && (
        <>
          <p className={styles.bigStatus}>301 Moved Permanently</p>
          <dl className={styles.facts}>
            <dt>Location</dt>
            <dd>
              <code>{outcome.location}</code>
            </dd>
          </dl>
        </>
      )}
      {outcome.type === 'runtime-error' && (
        <>
          <p className={styles.bigStatus}>500: RuntimeError</p>
          <p className={styles.small2}>{outcome.message}</p>
        </>
      )}
      {outcome.type === 'welcome' && <p className={styles.bigStatus}>200: “The install worked successfully!”</p>}
      {outcome.type === 'not-found' && (
        <>
          <p className={styles.bigStatus}>404 Not Found</p>
          {outcome.tried.length > 0 && (
            <>
              <p className={styles.small2}>Patterns tried, in order:</p>
              <ol className={styles.tried}>
                {outcome.tried.map((t, i) => (
                  <li key={i}>
                    <code>{t.map((r) => (r === '' ? "''" : r)).join(' ')}</code>
                  </li>
                ))}
              </ol>
            </>
          )}
        </>
      )}
    </div>
  )
}


function messagesFor(validation, id) {
  return [
    ...validation.errors.filter((e) => e.id === id).map((e) => ({ text: e.message, error: true })),
    ...validation.warnings.filter((w) => w.id === id).map((w) => ({ text: w.message, error: false })),
  ]
}

/** Short label for each pattern, for the step cards. */
function patternLabels(entries) {
  const labels = {}
  for (const e of entries) {
    labels[e.id] = e.kind === 'include' ? `include(${pyStr(e.route)})` : `path(${pyStr(e.route)}) → ${e.view}`
    for (const c of e.children ?? []) labels[c.id] = `${e.module}: path(${pyStr(c.route)}) → ${c.view}`
  }
  return labels
}

const pyStr = (s) => `"${s.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`

/** urls.py source as lines, each tagged with the entry id it shows (for highlighting). */
function sourceLines(entries) {
  const lines = [{ text: '# mysite/urls.py  (ROOT_URLCONF)' }, { text: 'urlpatterns = [' }]
  for (const e of entries) {
    lines.push({
      id: e.id,
      text:
        e.kind === 'include'
          ? `    path(${pyStr(e.route)}, include(${pyStr(`${e.module}.urls`)})),`
          : `    path(${pyStr(e.route)}, views.${e.view}${e.name ? `, name=${pyStr(e.name)}` : ''}),`,
    })
  }
  lines.push({ text: ']' })
  for (const e of entries.filter((x) => x.kind === 'include')) {
    lines.push({ text: '' }, { text: `# ${e.module}/urls.py` }, { text: 'urlpatterns = [' })
    for (const c of e.children ?? []) {
      lines.push({ id: c.id, text: `    path(${pyStr(c.route)}, views.${c.view}${c.name ? `, name=${pyStr(c.name)}` : ''}),` })
    }
    lines.push({ text: ']' })
  }
  return lines
}
