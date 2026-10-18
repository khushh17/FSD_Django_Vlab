import { useEffect, useRef } from 'react'
import ActionButtons from './ActionButtons.jsx'
import { TabLinks } from './Sidebar.jsx'
import styles from './MenuDrawer.module.css'

/** Mobile menu (below 768px), opened by the header hamburger. Rendered inside the sticky header. */
export default function MenuDrawer({ id, open, onClose, basePath, tabs, onRate, onReportBug, bugReportUrl }) {
  const panelRef = useRef(null)
  const firstLinkRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    firstLinkRef.current?.focus()
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    function onKeyDown(event) {
      if (event.key === 'Escape') {
        onClose()
        return
      }
      if (event.key !== 'Tab' || !panelRef.current) return
      const focusable = panelRef.current.querySelectorAll('a[href], button:not([disabled])')
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
    }
  }, [open, onClose])

  return (
    <div className={styles.root} hidden={!open}>
      <div className={styles.backdrop} onClick={onClose} aria-hidden="true" />
      <nav id={id} ref={panelRef} className={styles.panel} aria-label="Experiment sections">
        <TabLinks basePath={basePath} tabs={tabs} onNavigate={onClose} firstLinkRef={firstLinkRef} />
        <div className={styles.actions}>
          <ActionButtons onRate={onRate} onReportBug={onReportBug} bugReportUrl={bugReportUrl} stacked />
        </div>
      </nav>
    </div>
  )
}
