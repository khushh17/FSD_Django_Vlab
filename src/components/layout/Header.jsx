import { forwardRef } from 'react'
import { Link } from 'react-router-dom'
import somaiyaLogo from '../../assets/img/somaiya-logo.png'
import ActionButtons from './ActionButtons.jsx'
import OrangeBar from './OrangeBar.jsx'
import StarRating from './StarRating.jsx'
import styles from './Header.module.css'

const Header = forwardRef(function Header(
  { menuExpanded, menuControls, onMenuToggle, rating, ratingIsOwn, onRate, onReportBug, bugReportUrl, children },
  togglerRef,
) {
  return (
    <header className={styles.header}>
      <div className={styles.bar}>
        <button
          ref={togglerRef}
          type="button"
          className={styles.toggler}
          aria-label="Experiment menu"
          aria-expanded={menuExpanded}
          aria-controls={menuControls}
          onClick={onMenuToggle}
        >
          <svg className={styles.togglerIcon} viewBox="0 0 30 30" aria-hidden="true">
            <path d="M4 7h22M4 15h22M4 23h22" />
          </svg>
        </button>

        <div className={styles.brands}>
          <Link to="/" className={styles.brand}>
            <img src={somaiyaLogo} alt="Somaiya Vidyavihar University home" className={styles.somaiya} />
          </Link>
        </div>

        <div className={styles.right}>
          <StarRating rating={rating} isOwn={ratingIsOwn} className={styles.rating} />
          <ActionButtons onRate={onRate} onReportBug={onReportBug} bugReportUrl={bugReportUrl} />
        </div>
      </div>
      <OrangeBar />
      {children}
    </header>
  )
})

export default Header
