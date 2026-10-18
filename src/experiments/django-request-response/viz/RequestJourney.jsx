import { useCallback, useLayoutEffect, useRef } from 'react'
import { useStepper } from '../../../components/viz/useStepper.js'
import VizFrame from '../../../components/viz/VizFrame.jsx'
import { requestJourney } from '../data/vizSteps.js'
import styles from './RequestJourney.module.css'

// Group nodes into columns: nodes sharing a `group` stack in one column.
const columns = requestJourney.nodes.reduce((cols, node) => {
  const last = cols[cols.length - 1]
  if (node.group && last && last[0].group === node.group) last.push(node)
  else cols.push([node])
  return cols
}, [])

export default function RequestJourney() {
  const stepper = useStepper(requestJourney.steps.length)
  const step = requestJourney.steps[stepper.index]
  const isLast = stepper.index === requestJourney.steps.length - 1
  const lanesRef = useRef(null)
  const markerRef = useRef(null)

  // The marker is moved by writing its transform directly; CSS animates the change.
  const placeMarker = useCallback(() => {
    const lanes = lanesRef.current
    const marker = markerRef.current
    const box = lanes?.querySelector(`[data-node="${step.node}"]`)
    if (!lanes || !marker || !box) return
    const stacked = getComputedStyle(box.closest('ol')).flexDirection === 'column'
    const lane = lanes.getBoundingClientRect()
    const rect = box.getBoundingClientRect()
    const size = marker.offsetWidth
    const inward = step.direction === 'request'
    let x
    let y
    if (stacked) {
      x = inward ? rect.left - lane.left - size - 8 : rect.right - lane.left + 8
      y = rect.top - lane.top + rect.height / 2 - size / 2
    } else {
      x = rect.left - lane.left + rect.width / 2 - size / 2
      y = inward ? rect.top - lane.top - size - 8 : rect.bottom - lane.top + 8
    }
    marker.style.transform = `translate(${x}px, ${y}px)`
    if (!marker.dataset.placed) {
      // Enable the transition only after the first placement, so the marker does not slide in on load.
      requestAnimationFrame(() => {
        marker.dataset.placed = 'true'
      })
    }
  }, [step.node, step.direction])

  useLayoutEffect(() => {
    placeMarker()
    const observer = new ResizeObserver(placeMarker)
    observer.observe(lanesRef.current)
    return () => observer.disconnect()
  }, [placeMarker])

  const inward = step.direction === 'request'

  return (
    <VizFrame title="Visualization 1. The request journey" stepper={stepper} caption={step.caption}>
      <p className={styles.status}>
        {inward ? (
          <>
            Request <code>{requestJourney.request}</code>, travelling inwards
          </>
        ) : (
          <>
            Response {isLast ? <strong>{requestJourney.response}</strong> : <code>200</code>}, travelling
            back out
          </>
        )}
      </p>
      <div className={styles.lanes} ref={lanesRef}>
        <ol className={styles.pipeline} aria-label="Stages of the request–response cycle">
          {columns.map((column) => (
            <li key={column[0].id} className={column[0].group ? `${styles.column} ${styles.group}` : styles.column}>
              {column.map((node) => {
                const active = node.id === step.node
                return (
                  <div
                    key={node.id}
                    data-node={node.id}
                    className={active ? `${styles.box} ${styles.active}` : styles.box}
                    aria-current={active ? 'step' : undefined}
                  >
                    <span className={styles.label}>{node.label}</span>
                    {node.detail && <span className={styles.detail}>{node.detail}</span>}
                  </div>
                )
              })}
            </li>
          ))}
        </ol>
        <span ref={markerRef} className={styles.marker} aria-hidden="true" />
      </div>
    </VizFrame>
  )
}
