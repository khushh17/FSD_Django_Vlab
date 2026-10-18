import { useId } from 'react'
import Stepper from './Stepper.jsx'
import styles from './VizFrame.module.css'

/**
 * Frame shared by the Theory visualizations: a title, an optional toolbar (e.g. a toggle),
 * the visual itself, then the Stepper controls and the caption for the current step.
 */
export default function VizFrame({ title, toolbar, stepper, caption, children }) {
  const titleId = useId()
  return (
    <section className={styles.frame} aria-labelledby={titleId}>
      <div className={styles.head}>
        <h3 id={titleId} className={styles.title}>
          {title}
        </h3>
        {toolbar}
      </div>
      <div className={styles.stage}>{children}</div>
      <Stepper stepper={stepper} caption={caption} label={title} />
    </section>
  )
}
