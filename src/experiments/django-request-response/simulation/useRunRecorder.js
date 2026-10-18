import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../../../components/account/authContext.js'
import { meta } from '../meta.js'

/**
 * Saves each simulation run to the signed-in student's record once, when it reaches its
 * last step. `run` is { sim, index, jumpedFrom? } (jumpedFrom: the step Run to end was
 * pressed on). `describe()` returns { lab, config, prediction, outcome, predictionCorrect }.
 * Returns whether the current run was recorded (null until it finishes).
 */
export function useRunRecorder(run, finished, describe) {
  const { record } = useAuth()
  const [done, setDone] = useState(null) // { sim, recorded }
  const describeRef = useRef(describe)
  useEffect(() => {
    describeRef.current = describe
  })

  useEffect(() => {
    if (!finished || done?.sim === run.sim) return
    const total = run.sim.steps.length
    const jumped = run.jumpedFrom != null && run.jumpedFrom < total - 1
    const recorded = record('simulation_run', meta.slug, {
      ...describeRef.current(),
      stepsTotal: total,
      stepsViewed: jumped ? run.jumpedFrom + 1 : total,
      usedRunToEnd: jumped,
    })
    setDone({ sim: run.sim, recorded })
  }, [finished, run, done, record])

  return finished && done?.sim === run?.sim ? done.recorded : null
}

/** Prediction check: null when nothing was predicted, else whether every prediction was right. */
export function predictionResult(items) {
  const asked = items.filter((i) => i.predicted !== '')
  return asked.length ? asked.every((i) => i.predicted === i.actual) : null
}
