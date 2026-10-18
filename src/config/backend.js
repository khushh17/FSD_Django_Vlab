// Backend connection, from Vite environment variables (.env.local locally, Vercel settings
// on the server). With no VITE_API_URL the site works as before: nothing is sent anywhere
// and no sign-in is shown.

export const API_URL = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '') || null

export const backendEnabled = API_URL !== null

// OAuth client ID for Google sign-in (the same one the backend checks). TODO: create it.
export const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || null

// Local testing without Google: a plain email form (the backend must have DEV_LOGIN=1).
// Never shown in a production build.
export const DEV_LOGIN = import.meta.env.DEV && import.meta.env.VITE_DEV_LOGIN === '1'

// TODO: confirm the students' Google Workspace domain (must match the backend).
export const EMAIL_DOMAIN = 'somaiya.edu'
