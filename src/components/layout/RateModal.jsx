import { useEffect, useId, useRef, useState } from 'react'
import somaiyaLogo from '../../assets/img/somaiya-logo.png'
import styles from './RateModal.module.css'

/**
 * "Rate Me" popup, matching the reference's rating-submit widget.
 * Mount it only while open; it opens as a modal dialog on mount.
 * anchor: { right, top } in viewport px, or null to centre the dialog.
 */
export default function RateModal({ anchor, initialRating, busy = false, error = null, onSubmit, onClose }) {
  const dialogRef = useRef(null)
  const [selected, setSelected] = useState(initialRating ?? 0)
  const name = useId()

  // Keep the latest onClose without re-running the mount effect.
  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onCloseRef.current = onClose
  })

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return undefined
    if (!dialog.open) dialog.showModal()
    // Native listener: React 18 does not dispatch onClose for <dialog>. Escape closes the dialog natively.
    const handleClose = () => onCloseRef.current()
    dialog.addEventListener('close', handleClose)
    return () => dialog.removeEventListener('close', handleClose)
  }, [])

  function handleSubmit(event) {
    event.preventDefault()
    if (!selected) {
      // Nothing chosen yet: move focus to the stars instead of submitting.
      event.currentTarget.querySelector('input[type="radio"]')?.focus()
      return
    }
    onSubmit(selected)
  }

  const position = anchor
    ? { top: `${anchor.top}px`, right: `${anchor.right}px`, left: 'auto', bottom: 'auto' }
    : undefined

  return (
    <dialog
      ref={dialogRef}
      className={styles.dialog}
      style={position}
      aria-labelledby={`${name}-title`}
    >
      <form className={styles.content} onSubmit={handleSubmit}>
        <div className={styles.header}>
          <img src={somaiyaLogo} alt="Somaiya Vidyavihar University" className={styles.logo} />
          <button type="button" className={styles.close} aria-label="Close" onClick={onClose}>
            ×
          </button>
        </div>
        <h2 id={`${name}-title`} className={styles.title}>
          Rate
        </h2>
        <fieldset className={styles.stars}>
          <legend className="visually-hidden">Rate this experiment from 1 to 5 stars</legend>
          {[1, 2, 3, 4, 5].map((value) => (
            <label key={value} className={styles.star}>
              <input
                type="radio"
                name={name}
                value={value}
                checked={selected === value}
                onChange={() => setSelected(value)}
                className={styles.radio}
              />
              <span aria-hidden="true">{value <= selected ? '★' : '☆'}</span>
              <span className="visually-hidden">
                {value} {value === 1 ? 'star' : 'stars'}
              </span>
            </label>
          ))}
        </fieldset>
        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}
        <div className={styles.buttons}>
          <button type="submit" className={styles.submit} disabled={busy}>
            Submit
          </button>
          <button type="button" className={styles.cancel} onClick={onClose}>
            Cancel
          </button>
        </div>
      </form>
    </dialog>
  )
}
