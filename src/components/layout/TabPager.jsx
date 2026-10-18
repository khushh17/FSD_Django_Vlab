import { Link } from 'react-router-dom'
import styles from './TabPager.module.css'

/** "Previous" / "Next" links at the end of each tab, following the sidebar order. */
export default function TabPager({ basePath, tabs, currentSlug }) {
  const index = tabs.findIndex((t) => t.slug === currentSlug)
  if (index === -1) return null
  const previous = tabs[index - 1]
  const next = tabs[index + 1]
  return (
    <nav className={styles.pager} aria-label="Previous and next section">
      {previous ? (
        <Link to={`${basePath}/${previous.slug}`} className={`${styles.link} ${styles.previous}`} rel="prev">
          <span aria-hidden="true">← </span>Previous: {previous.label}
        </Link>
      ) : (
        <span />
      )}
      {next && (
        <Link to={`${basePath}/${next.slug}`} className={`${styles.link} ${styles.next}`} rel="next">
          Next: {next.label}
          <span aria-hidden="true"> →</span>
        </Link>
      )}
    </nav>
  )
}
