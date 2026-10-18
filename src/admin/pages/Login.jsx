import { useEffect, useId, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import somaiyaLogo from '../../assets/img/somaiya-logo.png'
import { useAdmin } from '../adminAuth.js'
import styles from '../admin.module.css'

export default function Login() {
  const { token, login } = useAdmin()
  const location = useLocation()
  const ids = { user: useId(), pass: useId() }
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [state, setState] = useState({ busy: false, error: null })

  useEffect(() => {
    document.title = 'Sign in | Admin | Virtual Labs'
  }, [])

  if (token) {
    const from = location.state?.from
    return <Navigate to={from ? `${from.pathname}${from.search}` : '/admin'} replace />
  }

  async function onSubmit(event) {
    event.preventDefault()
    setState({ busy: true, error: null })
    try {
      await login(username.trim(), password)
    } catch (err) {
      setState({ busy: false, error: err.message })
      setPassword('')
    }
  }

  return (
    <main className={styles.loginPage}>
      <form className={styles.loginBox} onSubmit={onSubmit}>
        <img src={somaiyaLogo} alt="Somaiya Vidyavihar University" className={styles.logo} />
        <h1 className={styles.loginTitle}>Virtual Labs admin</h1>
        <label className={styles.field} htmlFor={ids.user}>
          Username
          <input
            id={ids.user}
            autoComplete="username"
            required
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </label>
        <label className={styles.field} htmlFor={ids.pass}>
          Password
          <input
            id={ids.pass}
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        {state.error && (
          <p className={styles.error} role="alert">
            {state.error}
          </p>
        )}
        <button type="submit" className={styles.primaryButton} disabled={state.busy || !username.trim() || !password}>
          {state.busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </main>
  )
}
