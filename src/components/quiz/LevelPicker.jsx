import styles from './Quiz.module.css'

const LABELS = { easy: 'Easy', medium: 'Medium', hard: 'Hard' }

/** Easy / Medium / Hard buttons in the reference's button style, with the last score per level. */
export default function LevelPicker({ levels, current, lastScores, onPick }) {
  return (
    <fieldset className={styles.picker}>
      <legend className={styles.pickerPrompt}>Choose a difficulty level:</legend>
      <div className={styles.levels}>
        {levels.map((level) => {
          const last = lastScores[level]
          return (
            <div key={level} className={styles.levelItem}>
              <button
                type="button"
                className={`${styles.levelButton} ${current === level ? styles.levelActive : ''}`}
                aria-pressed={current === level}
                onClick={() => onPick(level)}
              >
                {LABELS[level] ?? level}
              </button>
              <span className={styles.lastScore}>
                {last ? `Last score: ${last.score} / ${last.total}` : 'Not attempted'}
              </span>
            </div>
          )
        })}
      </div>
    </fieldset>
  )
}
