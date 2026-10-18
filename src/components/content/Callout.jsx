import styles from './Callout.module.css'

/** A short note set apart from the running text. */
export default function Callout({ title = 'Note', children }) {
  return (
    <aside className={styles.callout}>
      <strong className={styles.title}>{title}</strong>
      <div>{children}</div>
    </aside>
  )
}
