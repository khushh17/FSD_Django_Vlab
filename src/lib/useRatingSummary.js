import { useCallback, useEffect, useState } from 'react'
import { backendEnabled } from '../config/backend.js'
import { apiFetch } from './api.js'

/**
 * The experiment's average rating from the backend: { average, count } or null (no backend,
 * offline, or still loading). `refresh()` fetches it again, bypassing the browser cache.
 */
export function useRatingSummary(experiment) {
  const [summary, setSummary] = useState(null)
  const [request, setRequest] = useState({ fresh: false })

  useEffect(() => {
    if (!backendEnabled) return undefined
    let cancelled = false
    apiFetch(`/api/ratings/summary?experiment=${encodeURIComponent(experiment)}`, {
      cache: request.fresh ? 'no-store' : undefined,
    })
      .then((data) => !cancelled && setSummary({ average: data.average, count: data.count }))
      .catch(() => {
        // Not shown when unavailable: the header falls back to meta.rating.
      })
    return () => {
      cancelled = true
    }
  }, [experiment, request])

  const refresh = useCallback(() => setRequest({ fresh: true }), [])
  return { summary, refresh }
}
