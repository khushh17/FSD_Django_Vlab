import { forwardRef } from 'react'
import styles from './Quiz.module.css'

/** Score after submit, in the reference's "N out of M" form, with a Retake button. */
const ResultSummary = forwardRef(function ResultSummary({ score, total, onRetake, children }, ref) {
  return (
    <section className={styles.result} ref={ref} tabIndex={-1} aria-label="Quiz result">
      <p className={styles.score}>
        {score} out of {total}
      </p>
      <p className={styles.resultHint}>
        Each answer is marked above, with an explanation. Retake shuffles the questions and the options.
      </p>
      {children}
      <button type="button" className={styles.primaryButton} onClick={onRetake}>
        Retake
      </button>
    </section>
  )
})

export default ResultSummary
