import { lazy, Suspense } from 'react'
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import ExperimentLayout from './components/layout/ExperimentLayout.jsx'
import { basePath, meta } from './experiments/django-request-response/meta.js'
import { tabComponents } from './experiments/django-request-response/tabs/index.js'

const firstTab = `${basePath}/${meta.tabs[0].slug}`

// Separate bundle: students never download the admin pages.
const AdminApp = lazy(() => import('./admin/AdminApp.jsx'))

export default function App() {
  return (
    <HashRouter>
      <Routes>
        {/* No landing page yet: experiments from other students will be merged later. */}
        <Route path="/" element={<Navigate to={firstTab} replace />} />
        <Route path={basePath} element={<ExperimentLayout meta={meta} basePath={basePath} />}>
          <Route index element={<Navigate to={firstTab} replace />} />
          {meta.tabs.map((tab) => {
            const Tab = tabComponents[tab.slug]
            return <Route key={tab.slug} path={tab.slug} element={<Tab />} />
          })}
          <Route path="*" element={<Navigate to={firstTab} replace />} />
        </Route>
        <Route
          path="/admin/*"
          element={
            <Suspense fallback={<p style={{ padding: 24 }}>Loading…</p>}>
              <AdminApp />
            </Suspense>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  )
}
