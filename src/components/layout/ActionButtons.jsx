import styles from './ActionButtons.module.css'

export default function ActionButtons({ onRate, onReportBug, bugReportUrl, stacked = false }) {
  const bugClass = `${styles.vButton} ${styles.bug}`
  return (
    <div className={stacked ? styles.stacked : styles.inline}>
      <button
        type="button"
        className={`${styles.vButton} ${styles.rate}`}
        aria-haspopup="dialog"
        onClick={(event) => onRate(event.currentTarget)}
      >
        Rate Me
      </button>
      {bugReportUrl ? (
        <a href={bugReportUrl} className={bugClass} target="_blank" rel="noopener noreferrer">
          Report a Bug
        </a>
      ) : onReportBug ? (
        <button type="button" className={bugClass} aria-haspopup="dialog" onClick={onReportBug}>
          Report a Bug
        </button>
      ) : (
        // No bug report URL and no backend: inert.
        <button type="button" className={bugClass}>
          Report a Bug
        </button>
      )}
    </div>
  )
}
