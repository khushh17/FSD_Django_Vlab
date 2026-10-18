import styles from './admin.module.css'

/** Loading and error states for a page's data. Returns null once the data is there. */
export function LoadState({ loading, error }) {
  if (error) {
    return (
      <p className={styles.error} role="alert">
        Could not load this page: {error.message}
      </p>
    )
  }
  if (loading) return <p className={styles.muted}>Loading…</p>
  return null
}

/** Headline numbers in a row of boxes. items: [{ label, value, note? }] */
export function Stats({ items }) {
  return (
    <dl className={styles.stats}>
      {items.map((item) => (
        <div key={item.label} className={styles.stat}>
          <dt>{item.label}</dt>
          <dd>
            <span className={styles.statValue}>{item.value}</span>
            {item.note && <span className={styles.statNote}>{item.note}</span>}
          </dd>
        </div>
      ))}
    </dl>
  )
}

/** A table that scrolls sideways on narrow screens (focusable, so keyboards can scroll it). */
export function DataTable({ caption, children }) {
  return (
    // oxlint-disable-next-line jsx-a11y/no-noninteractive-tabindex
    <section className={styles.tableScroll} tabIndex={0} aria-label={caption}>
      <table className={styles.table}>
        <caption>{caption}</caption>
        {children}
      </table>
    </section>
  )
}
