import { useEffect, useState } from 'react'
import { useAdmin } from './adminAuth.js'

/** Fetch an admin endpoint whenever `path` changes. Returns { data, error, loading }. */
export function useAdminData(path) {
  const { call } = useAdmin()
  const [state, setState] = useState({ path: null, data: null, error: null })

  useEffect(() => {
    let cancelled = false
    call(path)
      .then((data) => !cancelled && setState({ path, data, error: null }))
      .catch((error) => !cancelled && setState({ path, data: null, error }))
    return () => {
      cancelled = true
    }
  }, [path, call])

  const current = state.path === path
  return { data: current ? state.data : null, error: current ? state.error : null, loading: !current }
}
