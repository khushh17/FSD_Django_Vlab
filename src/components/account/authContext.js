import { createContext, useContext } from 'react'

export const AuthContext = createContext(null)

/** The sign-in state and actions; see AuthProvider. */
export function useAuth() {
  return useContext(AuthContext)
}
