import { useId, useState } from 'react'
import { useStepper } from '../../../components/viz/useStepper.js'
import VizFrame from '../../../components/viz/VizFrame.jsx'
import { middlewareOnion, onionLayers } from '../data/vizSteps.js'
import styles from './MiddlewareOnion.module.css'

// SVG geometry (viewBox units). Layer i is inset 24 on the top and sides and 8 at the bottom.
const OUTER = { x: 10, y: 28, w: 620, h: 330 }
const INSET = 24
const INSET_BOTTOM = 8
const rectFor = (i) => ({
  x: OUTER.x + INSET * i,
  y: OUTER.y + INSET * i,
  w: OUTER.w - 2 * INSET * i,
  h: OUTER.h - (INSET + INSET_BOTTOM) * i,
})
const CORE = rectFor(onionLayers.length)
const LANE_IN = 392
const LANE_OUT = 436
const bandY = (layer) => OUTER.y + INSET * layer + INSET / 2

function markerPosition(step) {
  switch (step.phase) {
    case 'in':
      return { x: LANE_IN, y: bandY(step.layer) }
    case 'resolve':
      return { x: LANE_IN, y: CORE.y + 14 }
    case 'process_view':
      return { x: LANE_IN, y: CORE.y + 38 }
    case 'view':
      return step.viewSkipped ? { x: LANE_OUT, y: CORE.y + 62 } : { x: (LANE_IN + LANE_OUT) / 2, y: CORE.y + 62 }
    case 'out':
      return { x: LANE_OUT, y: bandY(step.layer) }
    default:
      return { x: LANE_OUT, y: 14 }
  }
}

export default function MiddlewareOnion() {
  const [shortCircuit, setShortCircuit] = useState(false)
  const mode = shortCircuit ? middlewareOnion.shortCircuit : middlewareOnion.normal
  const stepper = useStepper(mode.steps.length)
  const step = mode.steps[stepper.index]
  const toggleId = useId()

  const viewSkipped = mode.steps.slice(0, stepper.index + 1).some((s) => s.viewSkipped)
  const activeLayer = ['in', 'out', 'process_view'].includes(step.phase) ? step.layer : null
  const marker = markerPosition(step)
  const coreActive = step.phase === 'view' || step.phase === 'resolve'

  function onToggle(event) {
    setShortCircuit(event.target.checked)
    stepper.reset()
  }

  const toolbar = (
    <label className={styles.toggle} htmlFor={toggleId}>
      <input id={toggleId} type="checkbox" checked={shortCircuit} onChange={onToggle} />
      Short-circuit at CsrfViewMiddleware (POST without token)
    </label>
  )

  return (
    <VizFrame title="Visualization 2. The middleware onion" toolbar={toolbar} stepper={stepper} caption={step.caption}>
      <p className={styles.status}>
        Request <code>{mode.request}</code>
      </p>
      {/* Scrolls sideways on very narrow screens so the labels stay readable. */}
      {/* oxlint-disable-next-line jsx-a11y/no-noninteractive-tabindex */}
      <section className={styles.scroller} tabIndex={0} aria-label="Middleware onion diagram">
        {/* role="img" is the standard way to give an inline SVG an accessible name. */}
        {/* oxlint-disable-next-line jsx-a11y/prefer-tag-over-role */}
        <svg role="img"
          className={styles.svg}
          viewBox={`0 0 640 ${OUTER.y + OUTER.h + 8}`}
          aria-label="The seven default middleware classes drawn as nested layers around the view. The current step is described below the controls."
        >
          <text x={LANE_IN - 8} y={16} className={styles.laneLabel} textAnchor="end">
            request ↓
          </text>
          <text x={LANE_OUT + 14} y={16} className={styles.laneLabel}>
            ↑ response
          </text>

          {onionLayers.map((name, i) => {
            const r = rectFor(i)
            const active = activeLayer === i
            return (
              <g key={name}>
                <rect
                  x={r.x}
                  y={r.y}
                  width={r.w}
                  height={r.h}
                  className={`${styles.layer} ${i % 2 ? styles.layerAlt : ''} ${active ? styles.active : ''}`}
                />
                <text x={r.x + 8} y={r.y + 16} className={styles.layerLabel}>
                  {name}
                </text>
              </g>
            )
          })}

          <rect
            x={CORE.x}
            y={CORE.y}
            width={CORE.w}
            height={CORE.h}
            className={`${styles.core} ${viewSkipped ? styles.coreSkipped : ''} ${coreActive && !viewSkipped ? styles.active : ''}`}
          />
          <text x={CORE.x + 12} y={CORE.y + 30} className={`${styles.coreTitle} ${viewSkipped ? styles.dim : ''}`}>
            View
          </text>
          <text x={CORE.x + 12} y={CORE.y + 52} className={`${styles.coreCode} ${viewSkipped ? styles.dim : ''}`}>
            post_detail(request, pk=42)
          </text>
          <text x={CORE.x + 12} y={CORE.y + 74} className={styles.coreNote}>
            {viewSkipped ? 'not called' : ''}
          </text>

          {/* Lanes */}
          <line x1={LANE_IN} y1={OUTER.y} x2={LANE_IN} y2={CORE.y} className={styles.lane} />
          <line x1={LANE_OUT} y1={OUTER.y} x2={LANE_OUT} y2={CORE.y} className={styles.lane} />

          {/* Marker */}
          <g className={styles.marker} style={{ transform: `translate(${marker.x}px, ${marker.y}px)` }}>
            <circle r={7} className={styles.markerDot} />
            {step.status && (
              <text x={12} y={4} className={styles.markerStatus}>
                {step.status}
              </text>
            )}
          </g>
        </svg>
      </section>
    </VizFrame>
  )
}
