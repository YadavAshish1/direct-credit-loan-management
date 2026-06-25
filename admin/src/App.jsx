import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AdminAuthProvider, useAdminAuth } from './context/AdminAuthContext';
import AdminLoginPage from './pages/AdminLoginPage';
import AdminLayout from './components/AdminLayout';
import AdminDashboard from './pages/AdminDashboard';
import ApplicationsListPage from './pages/ApplicationsListPage';
import ApplicationReviewPage from './pages/ApplicationReviewPage';
import UsersPage from './pages/UsersPage';
import AuditLogsPage from './pages/AuditLogsPage';
import './index.css';

function Protected({ children }) {
  const { admin, loading } = useAdminAuth();
  if (loading) return <div className="loading-center"><div className="spinner" /></div>;
  return admin ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <AdminAuthProvider>
      <BrowserRouter>
        <Toaster position="top-right" toastOptions={{
          style: { background: '#101d38', color: '#f1f5f9', border: '1px solid #1a2a45' },
        }} />
        <Routes>
          <Route path="/login" element={<AdminLoginPage />} />
          <Route path="/" element={<Protected><AdminLayout /></Protected>}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="applications" element={<ApplicationsListPage />} />
            <Route path="applications/:id" element={<ApplicationReviewPage />} />
            <Route path="users" element={<UsersPage />} />
            <Route path="audit-logs" element={<AuditLogsPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AdminAuthProvider>
  );
}
