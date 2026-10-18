import { useEffect, useId, useRef } from 'react'
import somaiyaLogo from '../../assets/img/somaiya-logo.png'
import styles from './Dialog.module.css'

/**
 * Centred modal dialog in the Rate Me popup's style. Mount it only while open; it opens
 * on mount. Escape and the × button call onClose. Focus returns to `returnFocus` (or the
 * element focused before opening) when it unmounts.
 */
export default function Dialog({ title, onClose, children }) {
  const dialogRef = useRef(null)
  const titleId = useId()
  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onCloseRef.current = onClose
  })

  useEffect(() => {
    const dialog = dialogRef.current
    const opener = document.activeElement
    if (!dialog.open) dialog.showModal()
    // Native listener: React 18 does not dispatch onClose for <dialog>.
    const handleClose = () => onCloseRef.current()
    dialog.addEventListener('close', handleClose)
    return () => {
      dialog.removeEventListener('close', handleClose)
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus()
    }
  }, [])

  return (
    <dialog ref={dialogRef} className={styles.dialog} aria-labelledby={titleId}>
      <div className={styles.content}>
        <div className={styles.header}>
          <img src={somaiyaLogo} alt="Somaiya Vidyavihar University" className={styles.logo} />
          <button type="button" className={styles.close} aria-label="Close" onClick={onClose}>
            ×
          </button>
        </div>
        <h2 id={titleId} className={styles.title}>
          {title}
        </h2>
        {children}
      </div>
    </dialog>
  )
}
