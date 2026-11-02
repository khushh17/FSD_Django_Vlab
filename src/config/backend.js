// Backend connection, from Vite environment variables (.env.local). With no VITE_API_URL
// the site works as a static lab: nothing is sent anywhere and no sign-in is shown.

export const API_URL = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '') || null

export const backendEnabled = API_URL !== null
