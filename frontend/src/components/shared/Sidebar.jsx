import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Building2,
  BedDouble,
  ArrowLeftRight,
  CheckSquare,
  FileText,
  Settings,
  LogOut,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore.js';
import { useSettingsStore } from '../../store/settingsStore.js';
import { cn } from '../../lib/utils.js';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/expats', icon: Users, label: 'Expats' },
  { to: '/clients', icon: Building2, label: 'Clients' },
  { to: '/dormitories', icon: BedDouble, label: 'Dormitories' },
  { to: '/transfers', icon: ArrowLeftRight, label: 'Transfers' },
  { to: '/checklists', icon: CheckSquare, label: 'Checklists' },
  { to: '/audit', icon: FileText, label: 'Audit Trail', roles: ['SUPER_ADMIN'] },
  { to: '/settings', icon: Settings, label: 'Settings', roles: ['SUPER_ADMIN'] },
];

export default function Sidebar() {
  const { logout, user } = useAuthStore();
  const settings = useSettingsStore(s => s.settings);

  return (
    <aside className="flex w-56 flex-col border-r border-slate-200 bg-white">
      <div className="flex h-14 items-center gap-2 border-b border-slate-200 px-4">
        <div className="h-7 w-7 rounded-md bg-[var(--accent)] flex items-center justify-center text-white text-xs font-bold">
          EF
        </div>
        <span className="font-semibold text-slate-900 text-sm">
          {settings?.appName || 'ExpatFlow'}
        </span>
      </div>

      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {navItems
          .filter(item => !item.roles || item.roles.includes(user?.role))
          .map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors',
                  isActive
                    ? 'bg-[var(--accent)] text-white'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                )
              }
            >
              <item.icon size={16} />
              {item.label}
            </NavLink>
          ))}
      </nav>

      <div className="border-t border-slate-200 p-3">
        <div className="mb-2 px-2 text-xs text-slate-500 truncate">{user?.role}</div>
        <button
          onClick={logout}
          className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-slate-600 hover:bg-slate-100"
        >
          <LogOut size={16} /> Sign out
        </button>
      </div>
    </aside>
  );
}
