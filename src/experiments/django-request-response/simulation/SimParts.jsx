import { useEffect, useRef } from 'react'
import { usePrefersReducedMotion } from '../../../hooks/usePrefersReducedMotion.js'
import styles from './Simulation.module.css'

/** A panel in the reference simulator's style: grey header bar, 1px grey border. */
export function Panel({ title, children, className = '', headingLevel = 2 }) {
  const Heading = `h${headingLevel}`
  return (
    <section className={`${styles.panel} ${className}`} aria-label={title}>
      <Heading className={styles.panelHead}>{title}</Heading>
      <div className={styles.panelBody}>{children}</div>
    </section>
  )
}

/**
 * Start / Next / Run to end / Reset with the step counter, as in the reference simulator
 * (Start, Next, Reset). Sits outside the scrolling step log so it never moves.
 */
export function SimControls({ running, finished, canStart, onStart, onNext, onFinish, onReset, index, total, startHint }) {
  return (
    <div className={styles.controlBar}>
      <div className={styles.controls}>
        <button type="button" className={styles.startButton} onClick={onStart} disabled={running || !canStart}>
          Start
        </button>
        <button type="button" className={styles.primary} onClick={onNext} disabled={!running || finished}>
          Next
        </button>
        <button type="button" className={styles.primary} onClick={onFinish} disabled={!running || finished}>
          Run to end
        </button>
        <button type="button" className={styles.primary} onClick={onReset} disabled={!running}>
          Reset
        </button>
        <span className={styles.stepCounter}>
          {running ? `Step ${index + 1} of ${total}${finished ? ' (done)' : ''}` : 'Not started'}
        </span>
      </div>
      {startHint && <p className={styles.hint}>{startHint}</p>}
    </div>
  )
}

/**
 * Every step shown so far, oldest first, in a fixed-height scrolling box. The newest step is
 * highlighted and scrolled into view; earlier steps stay above it.
 * steps: [{ title, detail, status?, depth?, prints? }]
 */
export function StepLog({ steps, total, emptyText }) {
  const boxRef = useRef(null)
  const reducedMotion = usePrefersReducedMotion()

  useEffect(() => {
    const box = boxRef.current
    if (box) box.scrollTo({ top: box.scrollHeight, behavior: reducedMotion ? 'auto' : 'smooth' })
  }, [steps.length, reducedMotion])

  const last = steps[steps.length - 1]
  return (
    <>
      {/* oxlint-disable-next-line jsx-a11y/no-noninteractive-tabindex */}
      <section className={styles.logBox} ref={boxRef} tabIndex={0} aria-label="Steps so far">
        {steps.length === 0 ? (
          <p className={styles.note}>{emptyText}</p>
        ) : (
          <ol className={styles.log}>
            {steps.map((s, i) => {
              const current = i === steps.length - 1
              return (
                <li
                  key={i}
                  className={`${styles.stepCard} ${current ? styles.stepCurrent : ''}`}
                  style={{ '--depth': s.depth ?? 0 }}
                  aria-current={current ? 'step' : undefined}
                >
                  <div className={styles.stepHead}>
                    <span className={styles.stepNo}>
                      {i + 1}/{total}
                    </span>
                    <span className={styles.stepTitle}>{s.title}</span>
                    {s.status != null && <span className={styles.stepStatus}>{s.status}</span>}
                  </div>
                  <p className={styles.stepDetail}>{s.detail}</p>
                  {s.prints?.length > 0 && <pre className={styles.stepPrint}>{s.prints.join('\n')}</pre>}
                </li>
              )
            })}
          </ol>
        )}
      </section>
      {/* Announce only the newest step to screen readers */}
      <p className="visually-hidden" aria-live="polite">
        {last ? `Step ${steps.length} of ${total}. ${last.title}. ${last.detail}` : ''}
      </p>
    </>
  )
}

/** Shows how the student's prediction compares with the real outcome. */
export function PredictionCheck({ items }) {
  const asked = items.filter((i) => i.predicted !== '')
  if (asked.length === 0) return null
  return (
    <div className={styles.prediction}>
      <h3 className={styles.subhead}>Your prediction</h3>
      <ul className={styles.plainList}>
        {asked.map((i) => {
          const right = i.predicted === i.actual
          return (
            <li key={i.label} className={right ? styles.right : styles.wrong}>
              {i.label}: you said <strong>{i.predictedText ?? i.predicted}</strong>,{' '}
              {right ? 'correct.' : <>actually <strong>{i.actualText ?? i.actual}</strong>.</>}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
