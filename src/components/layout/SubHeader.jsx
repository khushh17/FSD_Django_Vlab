import { Link } from 'react-router-dom'
import styles from './SubHeader.module.css'

function Chevron() {
  return (
    <svg className={styles.sep} viewBox="0 0 11 19" aria-hidden="true">
      <path d="M2 2l7 7.5L2 17" />
    </svg>
  )
}

/**
 * items: [{ label, href?, to? }]. `href` is an external link, `to` a router path.
 * The last item is the current page.
 */
export default function SubHeader({ items }) {
  return (
    <nav className={styles.subheader} aria-label="Breadcrumb">
      <ol className={styles.crumbs}>
        {items.map((item, i) => {
          const last = i === items.length - 1
          let content = item.label
          if (last) {
            content = <span aria-current="page">{item.label}</span>
          } else if (item.to) {
            content = <Link to={item.to}>{item.label}</Link>
          } else if (item.href) {
            content = <a href={item.href}>{item.label}</a>
          }
          return (
            <li key={item.label} className={styles.item}>
              {content}
              {!last && <Chevron />}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
