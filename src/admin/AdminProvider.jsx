import { useCallback, useMemo, useState } from 'react'
import { apiFetch } from '../lib/api.js'
import { AdminContext } from './adminAuth.js'

// sessionStorage: the admin sign-in ends when the browser tab is closed.
const KEY = 'django-vlab:admin'

function readSession() {
  try {
    return JSON.parse(window.sessionStorage.getItem(KEY))
  } catch {
    return null
  }
}

function writeSession(value) {
  try {
    if (value) window.sessionStorage.setItem(KEY, JSON.stringify(value))
    else window.sessionStorage.removeItem(KEY)
  } catch {
    // Storage unavailable: signed in for this page only.
  }
}

export default function AdminProvider({ children }) {
  const [session, setSession] = useState(readSession) // { token, admin }

  const logout = useCallback(() => {
    writeSession(null)
    setSession(null)
  }, [])

  const login = useCallback(async (username, password) => {
    const result = await apiFetch('/api/admin/login', { method: 'POST', body: { username, password } })
    writeSession(result)
    setSession(result)
  }, [])

  const token = session?.token ?? null

  // Call an admin endpoint (GET, or POST with a body); an expired sign-in signs out
  // (the login page then shows).
  const call = useCallback(
    async (path, body) => {
      try {
        return await apiFetch(path, body === undefined ? { token } : { method: 'POST', token, body })
      } catch (err) {
        if (err.status === 401) logout()
        throw err
      }
    },
    [token, logout],
  )

  const value = useMemo(
    () => ({ admin: session?.admin ?? null, token: session?.token ?? null, login, logout, call }),
    [session, login, logout, call],
  )
  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>
}
