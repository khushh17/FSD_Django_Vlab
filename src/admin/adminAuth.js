import { createContext, useContext } from 'react'

export const AdminContext = createContext(null)

/** { admin, token, login(username, password), logout(), call(path, body?), download(path) } */
export function useAdmin() {
  return useContext(AdminContext)
}
