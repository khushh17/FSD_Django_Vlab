import { NavLink } from 'react-router-dom'
import styles from './Sidebar.module.css'

export function TabLinks({ basePath, tabs, onNavigate, firstLinkRef }) {
  return (
    <ul className={styles.list}>
      {tabs.map((tab, i) => (
        <li key={tab.slug}>
          <NavLink
            ref={i === 0 ? firstLinkRef : undefined}
            to={`${basePath}/${tab.slug}`}
            className={({ isActive }) => (isActive ? `${styles.link} ${styles.active}` : styles.link)}
            onClick={onNavigate}
          >
            {tab.label}
          </NavLink>
        </li>
      ))}
    </ul>
  )
}

export default function Sidebar({ id, basePath, tabs, hidden }) {
  return (
    <nav id={id} className={styles.sidebar} aria-label="Experiment sections" hidden={hidden}>
      <TabLinks basePath={basePath} tabs={tabs} />
    </nav>
  )
}
