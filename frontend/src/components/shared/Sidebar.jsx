import { NavLink, useNavigate } from 'react-router';
import { useAuthStore } from '../../store/authStore.js';
import { auth as authApi } from '../../api/index.js';
import { getInitials } from '../../lib/utils.js';
import {
  LayoutDashboard, Users, Briefcase, Home, ArrowLeftRight,
  ClipboardList, Shield, Settings, LogOut
} from 'lucide-react';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/expats', icon: Users, label: 'Expats' },
  { to: '/clients', icon: Briefcase, label: 'Clients' },
  { to: '/dormitories', icon: Home, label: 'Dormitories' },
  { to: '/transfers', icon: ArrowLeftRight, label: 'Transfers' },
];

const opsItems = [
  { to: '/checklists', icon: ClipboardList, label: 'Checklists' },
  { to: '/audit', icon: Shield, label: 'Audit Trail', adminOnly: true },
];

export default function Sidebar() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const isManager = user?.role === 'MANAGER' || isSuperAdmin;

  async function handleLogout() {
    await authApi.logout().catch(() => {});
    logout();
    navigate('/login');
  }

  return (
    <div className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <div className="logo-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
              <path d="M12 2L2 7l10 5 10-5-10-5z"/>
              <path d="M2 17l10 5 10-5"/>
              <path d="M2 12l10 5 10-5"/>
            </svg>
          </div>
          <div>
            <div style={{ fontFamily: 'Instrument Serif, serif', fontSize: 17, color: '#fff', letterSpacing: '-0.3px' }}>
              Talentius Hub
            </div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', letterSpacing: '1.5px', textTransform: 'uppercase', marginTop: 1 }}>
              Management
            </div>
          </div>
        </div>
      </div>

      {/* Expat Module */}
      <div className="sidebar-section">Expat Module</div>
      {navItems.map(item => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
        >
          <item.icon className="nav-icon" size={16} />
          {item.label}
        </NavLink>
      ))}

      {/* Operations */}
      <div className="sidebar-section">Operations</div>
      {opsItems.map(item => {
        if (item.adminOnly && !isSuperAdmin) return null;
        return (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
          >
            <item.icon className="nav-icon" size={16} />
            {item.label}
          </NavLink>
        );
      })}

      {/* Settings */}
      {isSuperAdmin && (
        <>
          <div className="sidebar-section">System</div>
          <NavLink to="/settings" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
            <Settings className="nav-icon" size={16} />
            Settings
          </NavLink>
        </>
      )}

      {/* Other modules (Phase 2/3 — disabled) */}
      <div className="sidebar-section" style={{ marginTop: 8 }}>Other Modules</div>
      {[{ label: 'Employees', phase: 'Phase 2' }, { label: 'Leave', phase: 'Phase 3' }].map(item => (
        <div key={item.label} className="nav-item" style={{ opacity: 0.4, pointerEvents: 'none' }}>
          <Users className="nav-icon" size={16} />
          {item.label}
          <span style={{ fontSize: 9, background: 'rgba(255,255,255,0.1)', padding: '1px 6px', borderRadius: 8, marginLeft: 'auto', color: 'rgba(255,255,255,0.4)' }}>
            {item.phase}
          </span>
        </div>
      ))}

      {/* User row */}
      <div style={{ marginTop: 'auto', padding: 12, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 8, borderRadius: 'var(--r-sm)', cursor: 'pointer' }}
          className="hover:bg-white/5"
        >
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600, color: '#fff', flexShrink: 0 }}>
            {getInitials(user?.email?.split('@')[0] || 'User')}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)', fontWeight: 500 }}>
              {user?.email?.split('@')[0] || 'User'}
            </div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>{user?.role}</div>
          </div>
          <button onClick={handleLogout} title="Logout"
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.35)', padding: 4, borderRadius: 4 }}
          >
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
