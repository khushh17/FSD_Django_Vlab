import { useStepper } from '../../../components/viz/useStepper.js'
import VizFrame from '../../../components/viz/VizFrame.jsx'
import { urlMatching } from '../data/vizSteps.js'
import styles from './UrlMatcher.module.css'

const STATUS_TEXT = {
  untested: 'not tested yet',
  'no-match': 'no match',
  prefix: 'match (prefix, include)',
  match: 'match',
  never: 'never tested',
}

export default function UrlMatcher() {
  const stepper = useStepper(urlMatching.steps.length)
  const step = urlMatching.steps[stepper.index]

  return (
    <VizFrame title="Visualization 3. URL matching" stepper={stepper} caption={step.caption}>
      <p className={styles.path}>
        Request path <code>{urlMatching.requestPath}</code>
        <span className={styles.matching}>
          Matching{' '}
          <code>
            {step.consumed && <span className={styles.consumed}>{step.consumed}</span>}
            <span className={styles.remaining}>{step.remaining}</span>
          </code>
        </span>
      </p>

      <div className={styles.layout}>
        <div className={styles.files}>
          {urlMatching.files.map((file) => (
            <div key={file.name} className={styles.file}>
              <div className={styles.fileHead}>
                <code>{file.name}</code> <span className={styles.note}>{file.note}</span>
              </div>
              <ol className={styles.patterns}>
                {file.patterns.map((pattern) => {
                  const status = step.status[pattern.id] ?? 'untested'
                  const testing = step.testing === pattern.id
                  return (
                    <li
                      key={pattern.id}
                      className={`${styles.pattern} ${testing ? styles.testing : ''}`}
                      aria-current={testing ? 'step' : undefined}
                    >
                      <code className={styles.code}>{pattern.code}</code>
                      <span className={`${styles.tag} ${styles[status] ?? ''}`}>{STATUS_TEXT[status]}</span>
                    </li>
                  )
                })}
              </ol>
            </div>
          ))}
        </div>

        <div className={styles.result} aria-live="polite">
          <div className={styles.fileHead}>Result</div>
          {step.resolved ? (
            <dl className={styles.resolved}>
              <dt>View</dt>
              <dd>
                <code>{step.resolved.view}</code>
              </dd>
              <dt>kwargs</dt>
              <dd>
                <code>{step.resolved.kwargs}</code>
              </dd>
              <dt>url_name</dt>
              <dd>
                <code>{step.resolved.urlName}</code>
              </dd>
              <dt>route</dt>
              <dd>
                <code>{step.resolved.route}</code>
              </dd>
            </dl>
          ) : (
            <p className={styles.pending}>No view chosen yet.</p>
          )}
        </div>
      </div>
    </VizFrame>
  )
}
