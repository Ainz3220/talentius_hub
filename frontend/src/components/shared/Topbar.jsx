import { Bell, Settings } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useLocation, useNavigate } from 'react-router-dom';
import { notificationsApi } from '../../api/index.js';

const routeTitles = {
  '/dashboard': 'Dashboard',
  '/expats': 'Expats',
  '/clients': 'Clients',
  '/dormitories': 'Dormitories',
  '/transfers': 'Transfers',
  '/checklists': 'Checklists',
  '/audit': 'Audit Trail',
  '/settings': 'Settings',
};

export default function Topbar() {
  const { data } = useQuery({
    queryKey: ['notifications'],
    queryFn: notificationsApi.list,
    refetchInterval: 60000,
  });
  const location = useLocation();
  const navigate = useNavigate();

  const unread = data?.unreadCount ?? 0;
  const title = routeTitles[location.pathname] ?? routeTitles[Object.keys(routeTitles).find(k => location.pathname.startsWith(k))] ?? 'Talentius Hub';

  return (
    <header style={{
      background: 'var(--surface)',
      borderBottom: '1px solid var(--border)',
      padding: '0 28px',
      height: 56,
      display: 'flex',
      alignItems: 'center',
      gap: 16,
      position: 'sticky',
      top: 0,
      zIndex: 40,
    }}>
      <div style={{ fontFamily: "'Instrument Serif', serif", fontSize: 19, color: 'var(--text)' }}>
        {title}
      </div>

      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
        <button
          onClick={() => navigate('/settings')}
          style={iconBtnStyle}
          title="Settings"
        >
          <Settings size={16} strokeWidth={1.8} />
        </button>
        <button
          style={{ ...iconBtnStyle, position: 'relative' }}
          title="Notifications"
        >
          <Bell size={16} strokeWidth={1.8} />
          {unread > 0 && (
            <span style={{
              position: 'absolute',
              top: 6,
              right: 6,
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: 'var(--accent2)',
              border: '1.5px solid var(--surface)',
            }} />
          )}
        </button>
      </div>
    </header>
  );
}

const iconBtnStyle = {
  width: 34,
  height: 34,
  borderRadius: 6,
  border: '1px solid var(--border)',
  background: 'transparent',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  color: 'var(--text2)',
};
