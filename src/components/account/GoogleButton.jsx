import { useEffect, useRef, useState } from 'react'
import { GOOGLE_CLIENT_ID } from '../../config/backend.js'

const SCRIPT_SRC = 'https://accounts.google.com/gsi/client'
let scriptPromise = null
let initialized = false
let currentCallback = null

function loadGoogleScript() {
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script')
      script.src = SCRIPT_SRC
      script.async = true
      script.onload = () => resolve(window.google)
      script.onerror = () => {
        scriptPromise = null
        reject(new Error('Google sign-in could not be loaded.'))
      }
      document.head.appendChild(script)
    })
  }
  return scriptPromise
}

/** Google's own "Sign in with Google" button. Calls onCredential with the ID token. */
export default function GoogleButton({ onCredential }) {
  const slotRef = useRef(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    currentCallback = onCredential
  })

  useEffect(() => {
    let cancelled = false
    loadGoogleScript()
      .then((google) => {
        if (cancelled || !slotRef.current) return
        if (!initialized) {
          google.accounts.id.initialize({
            client_id: GOOGLE_CLIENT_ID,
            callback: (response) => currentCallback?.(response.credential),
            ux_mode: 'popup',
          })
          initialized = true
        }
        google.accounts.id.renderButton(slotRef.current, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          text: 'signin_with',
          shape: 'pill',
          width: Math.min(320, slotRef.current.clientWidth || 320),
        })
      })
      .catch(() => !cancelled && setFailed(true))
    return () => {
      cancelled = true
    }
  }, [])

  if (failed) return <p role="alert">Google sign-in could not be loaded. Check your connection and reload the page.</p>
  return <div ref={slotRef} />
}
