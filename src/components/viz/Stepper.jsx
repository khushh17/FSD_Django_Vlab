import styles from './Stepper.module.css'

/**
 * Controls shared by every visualization: Play/Pause, Step back, Step forward, Reset,
 * a "3 / 9" counter, and the caption for the current step (announced politely).
 * `stepper` is the object returned by useStepper().
 */
export default function Stepper({ stepper, caption, label }) {
  const { index, total, playing, canPlay } = stepper
  return (
    <div className={styles.stepper}>
      <fieldset className={styles.controls}>
        <legend className="visually-hidden">{label} controls</legend>
        {playing ? (
          <button type="button" className={styles.button} onClick={stepper.pause}>
            Pause
          </button>
        ) : (
          <button
            type="button"
            className={styles.button}
            onClick={stepper.play}
            disabled={!canPlay}
            title={canPlay ? undefined : 'Autoplay is off because reduced motion is enabled'}
          >
            Play
          </button>
        )}
        <button type="button" className={styles.button} onClick={stepper.back} disabled={index === 0}>
          Step back
        </button>
        <button
          type="button"
          className={styles.button}
          onClick={stepper.next}
          disabled={index === total - 1}
        >
          Step forward
        </button>
        <button type="button" className={styles.button} onClick={stepper.reset}>
          Reset
        </button>
        <span className={styles.counter}>
          <span aria-hidden="true">
            {index + 1} / {total}
          </span>
          <span className="visually-hidden">
            Step {index + 1} of {total}
          </span>
        </span>
      </fieldset>
      <p className={styles.caption} aria-live="polite">
        {caption}
      </p>
    </div>
  )
}
