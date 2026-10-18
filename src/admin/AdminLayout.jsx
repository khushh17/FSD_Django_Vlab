import { useEffect, useRef } from 'react'
import { Link, NavLink, Outlet, useLocation, useSearchParams } from 'react-router-dom'
import somaiyaLogo from '../assets/img/somaiya-logo.png'
import OrangeBar from '../components/layout/OrangeBar.jsx'
import { API_URL } from '../config/backend.js'
import { experiments } from '../experiments/registry.js'
import { useAdmin } from './adminAuth.js'
import { useExperiment } from './useExperiment.js'
import styles from './admin.module.css'

const PAGES = [
  { to: '/admin', label: 'Overview', end: true },
  { to: '/admin/students', label: 'Students' },
  { to: '/admin/quiz', label: 'Quiz analysis' },
  { to: '/admin/simulation', label: 'Simulation analysis' },
  { to: '/admin/feedback', label: 'Feedback' },
  { to: '/admin/bugs', label: 'Bug reports' },
]

export default function AdminLayout() {
  const { admin, logout } = useAdmin()
  const experiment = useExperiment()
  const [params, setParams] = useSearchParams()
  const { pathname } = useLocation()
  const mainRef = useRef(null)
  const query = params.get('exp') ? `?exp=${encodeURIComponent(params.get('exp'))}` : ''

  useEffect(() => {
    const page = PAGES.find((p) => (p.end ? pathname === p.to : pathname.startsWith(p.to)))
    document.title = `${page?.label ?? 'Admin'} | Admin | Virtual Labs`
    window.scrollTo(0, 0)
  }, [pathname])

  function skipToContent(event) {
    // A plain #admin-content href would be read by HashRouter as a route.
    event.preventDefault()
    mainRef.current?.focus()
  }

  return (
    <div className={styles.page}>
      <a href="#admin-content" className={styles.skip} onClick={skipToContent}>
        Skip to content
      </a>
      <header className={styles.header}>
        <div className={styles.headerBar}>
          <Link to="/" className={styles.brand}>
            <img src={somaiyaLogo} alt="Somaiya Vidyavihar University: back to the labs" className={styles.logo} />
          </Link>
          <span className={styles.siteName}>Virtual Labs admin</span>
          <div className={styles.account}>
            <span>{admin?.name}</span>
            <a href={`${API_URL}/admin/`} target="_blank" rel="noopener noreferrer">
              Raw data<span className="visually-hidden"> (Django admin, opens in a new tab)</span>
            </a>
            <button type="button" className={styles.outlineButton} onClick={logout}>
              Sign out
            </button>
          </div>
        </div>
        <OrangeBar />
        <nav className={styles.nav} aria-label="Admin pages">
          <ul>
            {PAGES.map((p) => (
              <li key={p.to}>
                <NavLink
                  to={`${p.to}${query}`}
                  end={p.end}
                  className={({ isActive }) => (isActive ? styles.navActive : undefined)}
                >
                  {p.label}
                </NavLink>
              </li>
            ))}
          </ul>
          {experiments.length > 1 ? (
            <label className={styles.expPicker}>
              Experiment
              <select
                value={experiment.slug}
                onChange={(e) => setParams((prev) => ({ ...Object.fromEntries(prev), exp: e.target.value }))}
              >
                {experiments.map((e) => (
                  <option key={e.slug} value={e.slug}>
                    {e.title}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <p className={styles.expPicker}>
              Experiment: <strong>{experiment.title}</strong>
            </p>
          )}
        </nav>
      </header>
      <main id="admin-content" ref={mainRef} tabIndex={-1} className={styles.main}>
        <Outlet />
      </main>
    </div>
  )
}
