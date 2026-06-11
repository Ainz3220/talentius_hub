import { Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuthStore } from './store/authStore.js';
import { useSettingsStore } from './store/settingsStore.js';
import api from './api/axios.js';
import PrivateRoute from './components/shared/PrivateRoute.jsx';
import Layout from './components/shared/Layout.jsx';
import LoginPage from './modules/expat/pages/Login.jsx';
import VerifyEmailPage from './pages/VerifyEmail.jsx';
import Dashboard from './modules/expat/pages/Dashboard.jsx';
import Expats from './modules/expat/pages/Expats.jsx';
import ExpatDetail from './modules/expat/pages/ExpatDetail.jsx';
import Clients from './modules/expat/pages/Clients.jsx';
import ClientDetail from './modules/expat/pages/ClientDetail.jsx';
import Dormitories from './modules/expat/pages/Dormitories.jsx';
import DormitoryDetail from './modules/expat/pages/DormitoryDetail.jsx';
import Transfers from './modules/expat/pages/Transfers.jsx';
import Checklists from './modules/expat/pages/Checklists.jsx';
import AuditTrail from './modules/expat/pages/AuditTrail.jsx';
import Settings from './pages/Settings.jsx';

export default function App() {
  const token = useAuthStore(s => s.token);
  const { loadSettings } = useSettingsStore();

  // Verify session is still valid on every app mount (e.g. after backend restart)
  useEffect(() => {
    if (!useAuthStore.getState().token) return;
    api.get('/auth/me').then(r => {
      useAuthStore.getState().setUser(r.data);
    }).catch(() => {
      // interceptor handles logout + redirect on 401
    });
  }, []);

  useEffect(() => {
    if (token) loadSettings();
  }, [token, loadSettings]);

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/verify-email" element={<VerifyEmailPage />} />
      <Route element={<PrivateRoute />}>
        <Route element={<Layout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/expats" element={<Expats />} />
          <Route path="/expats/:id" element={<ExpatDetail />} />
          <Route path="/clients" element={<Clients />} />
          <Route path="/clients/:id" element={<ClientDetail />} />
          <Route path="/dormitories" element={<Dormitories />} />
          <Route path="/dormitories/:id" element={<DormitoryDetail />} />
          <Route path="/transfers" element={<Transfers />} />
          <Route path="/checklists" element={<Checklists />} />
          <Route path="/audit" element={<AuditTrail />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
