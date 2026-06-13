import { Outlet } from 'react-router';
import Sidebar from './Sidebar.jsx';
import Topbar from './Topbar.jsx';

export default function Layout() {
  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      <div style={{ marginLeft: 232, flex: 1, minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <Topbar />
        <div style={{ padding: '24px 28px', flex: 1 }}>
          <Outlet />
        </div>
      </div>
    </div>
  );
}
