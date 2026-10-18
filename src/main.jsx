import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// The reference loads only weight 400 of each family (Google Fonts, no weight axis).
import '@fontsource/open-sans/400.css'
import '@fontsource/raleway/400.css'
import './styles/global.css'
import App from './App.jsx'
import { AuthProvider } from './components/account/AuthProvider.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>,
)
