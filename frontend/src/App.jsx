import { BrowserRouter, Routes, Route, Navigate } from 'react-router';
import { useEffect } from 'react';
import { useSettingsStore } from './store/settingsStore.js';
import { useAuthStore } from './store/authStore.js';
import PrivateRoute from './components/shared/PrivateRoute.jsx';
import Layout from './components/shared/Layout.jsx';
import Login from './modules/expat/pages/Login.jsx';
import VerifyEmail from './modules/expat/pages/VerifyEmail.jsx';
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
import Settings from './modules/expat/pages/Settings.jsx';

function AppInit() {
  const { loadSettings, settings } = useSettingsStore();
  const { token } = useAuthStore();

  useEffect(() => {
    if (token) loadSettings();
  }, [token]);

  useEffect(() => {
    if (settings?.accentColor) {
      document.documentElement.style.setProperty('--accent', settings.accentColor);
    }
  }, [settings?.accentColor]);

  return null;
}

export default function App() {
  return (
    <BrowserRouter>
      <AppInit />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route element={<PrivateRoute />}>
          <Route element={<Layout />}>
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
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Route>
        </Route>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
