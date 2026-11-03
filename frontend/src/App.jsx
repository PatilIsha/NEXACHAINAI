import { Suspense, lazy } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import { Spinner } from './components/ui/index.jsx';
import AppLayout from './components/layout/AppLayout.jsx';
// Route-level code splitting: each page (and recharts, used only by the dashboard) loads on demand.
const LoginPage = lazy(() => import('./pages/LoginPage.jsx'));
const RegisterPage = lazy(() => import('./pages/RegisterPage.jsx'));
const DashboardPage = lazy(() => import('./pages/DashboardPage.jsx'));
const InvestmentsPage = lazy(() => import('./pages/InvestmentsPage.jsx'));
const RoiHistoryPage = lazy(() => import('./pages/RoiHistoryPage.jsx'));
const ReferralsPage = lazy(() => import('./pages/ReferralsPage.jsx'));

const FullPageSpinner = () => (
  <div className="fullpage">
    <Spinner size="lg" />
  </div>
);

/** Redirects unauthenticated visitors to /login (remembering where they were going). */
function RequireAuth({ children }) {
  const { isAuthenticated, initialising } = useAuth();
  const location = useLocation();
  if (initialising) return <FullPageSpinner />;
  if (!isAuthenticated) return <Navigate to="/login" replace state={{ from: location }} />;
  return children;
}

/** Keeps logged-in users away from the auth pages. */
function PublicOnly({ children }) {
  const { isAuthenticated, initialising } = useAuth();
  if (initialising) return <FullPageSpinner />;
  if (isAuthenticated) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <Suspense fallback={<FullPageSpinner />}>
      <Routes>
      <Route path="/login" element={<PublicOnly><LoginPage /></PublicOnly>} />
      <Route path="/register" element={<PublicOnly><RegisterPage /></PublicOnly>} />
      <Route element={<RequireAuth><AppLayout /></RequireAuth>}>
        <Route index element={<DashboardPage />} />
        <Route path="investments" element={<InvestmentsPage />} />
        <Route path="roi" element={<RoiHistoryPage />} />
        <Route path="referrals" element={<ReferralsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
