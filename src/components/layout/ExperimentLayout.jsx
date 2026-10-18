import { useCallback, useEffect, useRef, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { MOBILE_QUERY, useMediaQuery } from '../../hooks/useMediaQuery.js'
import AccountBar from '../account/AccountBar.jsx'
import { useAuth } from '../account/authContext.js'
import BugReportDialog from '../account/BugReportDialog.jsx'
import ExperimentTitle from './ExperimentTitle.jsx'
import Footer from './Footer.jsx'
import Header from './Header.jsx'
import MenuDrawer from './MenuDrawer.jsx'
import RateModal from './RateModal.jsx'
import Sidebar from './Sidebar.jsx'
import SubHeader from './SubHeader.jsx'
import TabPager from './TabPager.jsx'
import styles from './ExperimentLayout.module.css'

const SIDEBAR_ID = 'experiment-sidebar'
const DRAWER_ID = 'experiment-menu'

export default function ExperimentLayout({ meta, basePath }) {
  const { pathname } = useLocation()
  const auth = useAuth()
  const isMobile = useMediaQuery(MOBILE_QUERY)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [sidebarHidden, setSidebarHidden] = useState(false)
  const togglerRef = useRef(null)
  const mainRef = useRef(null)

  const currentTab = meta.tabs.find((tab) => pathname === `${basePath}/${tab.slug}`)

  // New tab: start at the top of the page and update the document title.
  useEffect(() => {
    window.scrollTo(0, 0)
    document.title = currentTab
      ? `${currentTab.label} | ${meta.title} | Virtual Labs`
      : `${meta.title} | Virtual Labs`
  }, [currentTab, meta.title])

  // The drawer only exists on narrow screens: close it whenever the breakpoint changes.
  const [prevIsMobile, setPrevIsMobile] = useState(isMobile)
  if (prevIsMobile !== isMobile) {
    setPrevIsMobile(isMobile)
    setDrawerOpen(false)
  }

  const closeDrawer = useCallback(() => {
    setDrawerOpen(false)
    togglerRef.current?.focus()
  }, [])

  function onMenuToggle() {
    if (isMobile) setDrawerOpen((open) => !open)
    else setSidebarHidden((hidden) => !hidden)
  }

  // Rate Me popup. Desktop: anchored left of the header buttons, as on the reference. Mobile: centred.
  const [rateDialog, setRateDialog] = useState(null) // { anchor } while open
  const [rateState, setRateState] = useState({ busy: false, error: null })
  // With a backend the rating is the signed-in student's saved one; without, it is kept on this page only.
  const [pageRating, setPageRating] = useState(null)
  const userRating = auth.status === 'disabled' ? pageRating : (auth.ratings[meta.slug] ?? null)
  const rateReturnFocus = useRef(null)

  function openRate(trigger) {
    if (auth.status === 'signed-out') {
      setDrawerOpen(false)
      auth.requestSignIn('Sign in to rate this experiment.')
      return
    }
    setRateState({ busy: false, error: null })
    if (isMobile) {
      setDrawerOpen(false)
      rateReturnFocus.current = togglerRef.current
      setRateDialog({ anchor: null })
    } else {
      const rect = trigger.getBoundingClientRect()
      rateReturnFocus.current = trigger
      setRateDialog({
        anchor: { top: 8, right: document.documentElement.clientWidth - rect.left + 12 },
      })
    }
  }

  function closeRate() {
    setRateDialog(null)
  }

  // Return focus once the dialog has left the DOM (while it is modal, the page is inert).
  useEffect(() => {
    if (rateDialog === null && rateReturnFocus.current) {
      rateReturnFocus.current.focus()
      rateReturnFocus.current = null
    }
  }, [rateDialog])

  async function handleRateSubmit(value) {
    if (auth.status === 'disabled') {
      setPageRating(value)
      closeRate()
      return
    }
    setRateState({ busy: true, error: null })
    try {
      await auth.rate(meta.slug, value)
      closeRate()
    } catch (err) {
      setRateState({ busy: false, error: err.message })
    }
  }

  // Report a Bug popup (when there is a backend and no external bug report URL).
  const [bugOpen, setBugOpen] = useState(false)
  const reportBug =
    !meta.bugReportUrl && auth.status !== 'disabled'
      ? () => {
          setDrawerOpen(false)
          setBugOpen(true)
        }
      : undefined

  function skipToContent(event) {
    // A plain #main-content href would be read by HashRouter as a route.
    event.preventDefault()
    mainRef.current?.focus()
  }

  const breadcrumb = [
    ...meta.breadcrumb,
    { label: meta.breadcrumbLabel, to: `${basePath}/${meta.tabs[0].slug}` },
    ...(currentTab ? [{ label: currentTab.label }] : []),
  ]

  return (
    <div className={styles.page}>
      <a href="#main-content" className={styles.skip} onClick={skipToContent}>
        Skip to content
      </a>

      <Header
        ref={togglerRef}
        menuExpanded={isMobile ? drawerOpen : !sidebarHidden}
        menuControls={isMobile ? DRAWER_ID : SIDEBAR_ID}
        onMenuToggle={onMenuToggle}
        rating={userRating ?? meta.rating}
        ratingIsOwn={userRating != null}
        onRate={openRate}
        onReportBug={reportBug}
        bugReportUrl={meta.bugReportUrl}
      >
        <MenuDrawer
          id={DRAWER_ID}
          open={isMobile && drawerOpen}
          onClose={closeDrawer}
          basePath={basePath}
          tabs={meta.tabs}
          onRate={openRate}
          onReportBug={reportBug}
          bugReportUrl={meta.bugReportUrl}
        />
      </Header>

      {rateDialog && (
        <RateModal
          anchor={rateDialog.anchor}
          initialRating={userRating}
          busy={rateState.busy}
          error={rateState.error}
          onSubmit={handleRateSubmit}
          onClose={closeRate}
        />
      )}
      {bugOpen && (
        <BugReportDialog
          experiment={meta.slug}
          page={currentTab?.slug ?? ''}
          pageLabel={currentTab?.label}
          onClose={() => setBugOpen(false)}
        />
      )}
      <p className="visually-hidden" aria-live="polite">
        {userRating ? `Thank you. You rated this experiment ${userRating} out of 5.` : ''}
      </p>

      <div className={styles.body}>
        <div className={styles.topRow}>
          <SubHeader items={breadcrumb} />
          <AccountBar />
        </div>
        <div className={styles.row}>
          <Sidebar id={SIDEBAR_ID} basePath={basePath} tabs={meta.tabs} hidden={sidebarHidden} />
          <main id="main-content" ref={mainRef} tabIndex={-1} className={`${styles.content} lab-content`}>
            <ExperimentTitle title={meta.title} />
            <Outlet />
            <TabPager basePath={basePath} tabs={meta.tabs} currentSlug={currentTab?.slug} />
          </main>
        </div>
      </div>

      <Footer />
    </div>
  )
}
