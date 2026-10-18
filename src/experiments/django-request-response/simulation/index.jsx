import { useId, useRef, useState } from 'react'
import MiddlewareLab from './MiddlewareLab.jsx'
import UrlLab from './UrlLab.jsx'
import styles from './Simulation.module.css'

const LABS = [
  { key: 'middleware', label: 'Middleware lab', Component: MiddlewareLab },
  { key: 'urls', label: 'URL resolver lab', Component: UrlLab },
]

/**
 * Simulation tab: two student-driven labs in the reference simulator's three-panel layout
 * (Problem / Step Execute / Result, with Start, Next and Reset). Both run on JS models of
 * Django's request handling (./engine), checked against Django 6.1 by scripts/sim-check.
 */
export default function SimulationPanel() {
  const [active, setActive] = useState(0)
  const baseId = useId()
  const tabRefs = useRef([])

  function onKeyDown(event) {
    const last = LABS.length - 1
    let next = null
    if (event.key === 'ArrowRight') next = active === last ? 0 : active + 1
    if (event.key === 'ArrowLeft') next = active === 0 ? last : active - 1
    if (event.key === 'Home') next = 0
    if (event.key === 'End') next = last
    if (next === null) return
    event.preventDefault()
    setActive(next)
    tabRefs.current[next]?.focus()
  }

  const { Component } = LABS[active]
  return (
    <div className={styles.simulation}>
      <div className={styles.tabs} role="tablist" aria-label="Simulation labs">
        {LABS.map((lab, i) => (
          <button
            key={lab.key}
            ref={(el) => {
              tabRefs.current[i] = el
            }}
            type="button"
            role="tab"
            id={`${baseId}-tab-${i}`}
            aria-selected={active === i}
            aria-controls={`${baseId}-panel`}
            tabIndex={active === i ? 0 : -1}
            className={`${styles.tab} ${active === i ? styles.tabActive : ''}`}
            onClick={() => setActive(i)}
            onKeyDown={onKeyDown}
          >
            {lab.label}
          </button>
        ))}
      </div>
      <div role="tabpanel" id={`${baseId}-panel`} aria-labelledby={`${baseId}-tab-${active}`}>
        <Component key={LABS[active].key} />
      </div>
    </div>
  )
}
