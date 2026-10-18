import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { backendEnabled } from '../config/backend.js'
import AdminLayout from './AdminLayout.jsx'
import AdminProvider from './AdminProvider.jsx'
import { useAdmin } from './adminAuth.js'
import BugReports from './pages/BugReports.jsx'
import Export from './pages/Export.jsx'
import FeedbackInbox from './pages/FeedbackInbox.jsx'
import Login from './pages/Login.jsx'
import Overview from './pages/Overview.jsx'
import QuizAnalysis from './pages/QuizAnalysis.jsx'
import SimulationAnalysis from './pages/SimulationAnalysis.jsx'
import StudentDetail from './pages/StudentDetail.jsx'
import Students from './pages/Students.jsx'
import styles from './admin.module.css'

/** Admin pages, under #/admin. Loaded only when an admin page is opened. */
export default function AdminApp() {
  if (!backendEnabled) {
    return (
      <main className={styles.loginPage}>
        <div className={styles.loginBox}>
          <h1 className={styles.loginTitle}>Virtual Labs admin</h1>
          <p>The admin pages need the backend. Set VITE_API_URL and reload.</p>
        </div>
      </main>
    )
  }
  return (
    <AdminProvider>
      <Routes>
        <Route path="login" element={<Login />} />
        <Route
          element={
            <RequireAdmin>
              <AdminLayout />
            </RequireAdmin>
          }
        >
          <Route index element={<Overview />} />
          <Route path="students" element={<Students />} />
          <Route path="students/:id" element={<StudentDetail />} />
          <Route path="quiz" element={<QuizAnalysis />} />
          <Route path="simulation" element={<SimulationAnalysis />} />
          <Route path="feedback" element={<FeedbackInbox />} />
          <Route path="bugs" element={<BugReports />} />
          <Route path="export" element={<Export />} />
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Route>
      </Routes>
    </AdminProvider>
  )
}

function RequireAdmin({ children }) {
  const { token } = useAdmin()
  const location = useLocation()
  if (!token) return <Navigate to="/admin/login" replace state={{ from: location }} />
  return children
}
