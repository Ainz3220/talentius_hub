import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Building2,
  BedDouble,
  ArrowLeftRight,
  CheckSquare,
  Shield,
  Settings,
  LogOut,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore.js';
import { useSettingsStore } from '../../store/settingsStore.js';

const navSections = [
  {
    label: 'Expat Module',
    items: [
      { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
      { to: '/expats', icon: Users, label: 'Expats' },
      { to: '/clients', icon: Building2, label: 'Clients' },
      { to: '/dormitories', icon: BedDouble, label: 'Dormitories' },
      { to: '/transfers', icon: ArrowLeftRight, label: 'Transfers' },
    ],
  },
  {
    label: 'Operations',
    items: [
      { to: '/checklists', icon: CheckSquare, label: 'Checklists' },
      { to: '/audit', icon: Shield, label: 'Audit Trail', roles: ['SUPER_ADMIN'] },
      { to: '/settings', icon: Settings, label: 'Settings', roles: ['SUPER_ADMIN'] },
    ],
  },
];

export default function Sidebar() {
  const { logout, user } = useAuthStore();
  const settings = useSettingsStore(s => s.settings);
  const initials = user?.email?.slice(0, 2).toUpperCase() ?? 'U';

  return (
    <aside style={{ width: 232, background: 'var(--text)', minHeight: '100vh', display: 'flex', flexDirection: 'column', flexShrink: 0, position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 50 }}>
      {/* Logo */}
      <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <div style={{ width: 32, height: 32, background: 'var(--accent)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg viewBox="0 0 24 24" style={{ width: 18, height: 18, stroke: '#fff', strokeWidth: 2, fill: 'none' }}>
              <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
            </svg>
          </div>
          <div>
            <div style={{ fontFamily: "'Instrument Serif', serif", fontSize: 17, color: '#fff', letterSpacing: '-0.3px' }}>
              {settings?.appName || 'Talentius Hub'}
            </div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', letterSpacing: '1.5px', textTransform: 'uppercase', marginTop: 1 }}>
              Management
            </div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
        {navSections.map(section => (
          <div key={section.label}>
            <div style={{ padding: '16px 12px 6px', fontSize: 10, letterSpacing: '1.8px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.25)' }}>
              {section.label}
            </div>
            {section.items
              .filter(item => !item.roles || item.roles.includes(user?.role))
              .map(item => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  style={({ isActive }) => ({
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '8px 12px',
                    borderRadius: 6,
                    margin: '1px 8px',
                    cursor: 'pointer',
                    transition: 'background 0.15s',
                    color: isActive ? '#fff' : 'rgba(255,255,255,0.55)',
                    background: isActive ? 'var(--accent)' : 'transparent',
                    fontSize: 13,
                    textDecoration: 'none',
                  })}
                  onMouseEnter={e => {
                    if (!e.currentTarget.style.background.includes('var(--accent)')) {
                      e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
                      e.currentTarget.style.color = 'rgba(255,255,255,0.85)';
                    }
                  }}
                  onMouseLeave={e => {
                    const isActive = e.currentTarget.getAttribute('aria-current') === 'page';
                    if (!isActive) {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.color = 'rgba(255,255,255,0.55)';
                    }
                  }}
                >
                  <item.icon size={16} style={{ flexShrink: 0, opacity: 0.8 }} />
                  {item.label}
                </NavLink>
              ))}
          </div>
        ))}
      </nav>

      {/* User */}
      <div style={{ marginTop: 'auto', padding: 12, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 8, borderRadius: 6 }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600, color: '#fff', flexShrink: 0 }}>
            {initials}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user?.role}
            </div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>Talentius Hub</div>
          </div>
          <button
            onClick={logout}
            title="Sign out"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.35)', padding: 4, borderRadius: 4, display: 'flex' }}
          >
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </aside>
  );
}
