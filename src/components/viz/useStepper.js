import { useEffect, useState } from 'react'
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion.js'

/**
 * Step state for a visualization with `total` steps.
 * Play advances one step every `interval` ms and stops on the last step.
 * With prefers-reduced-motion, Play is unavailable (manual stepping only).
 */
export function useStepper(total, { interval = 2200 } = {}) {
  const reducedMotion = usePrefersReducedMotion()
  const [rawIndex, setIndex] = useState(0)
  const [playRequested, setPlayRequested] = useState(false)

  const index = Math.min(rawIndex, total - 1)
  const atEnd = index >= total - 1
  const playing = playRequested && !atEnd && !reducedMotion

  useEffect(() => {
    if (!playing) return undefined
    const timer = setTimeout(() => setIndex((i) => Math.min(i + 1, total - 1)), interval)
    return () => clearTimeout(timer)
  }, [playing, index, interval, total])

  return {
    index,
    total,
    playing,
    canPlay: !reducedMotion,
    play() {
      if (reducedMotion) return
      if (atEnd) setIndex(0)
      setPlayRequested(true)
    },
    pause() {
      setPlayRequested(false)
    },
    // Functional updates, so several quick clicks each count.
    next() {
      setPlayRequested(false)
      setIndex((i) => Math.min(Math.min(i, total - 1) + 1, total - 1))
    },
    back() {
      setPlayRequested(false)
      setIndex((i) => Math.max(Math.min(i, total - 1) - 1, 0))
    },
    reset() {
      setPlayRequested(false)
      setIndex(0)
    },
  }
}
