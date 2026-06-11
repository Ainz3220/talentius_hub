import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar.jsx';
import Topbar from './Topbar.jsx';
import { ToastProvider } from '../ui/toast.jsx';

export default function Layout() {
  return (
    <ToastProvider>
      <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg)' }}>
        <Sidebar />
        <div style={{ marginLeft: 232, flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
          <Topbar />
          <main style={{ flex: 1, overflowY: 'auto', padding: '24px 28px' }}>
            <Outlet />
          </main>
        </div>
      </div>
    </ToastProvider>
  );
}
