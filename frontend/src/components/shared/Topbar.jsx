import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { Bell, Search, X } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { notifications as notifApi, search as searchApi } from '../../api/index.js';
import { formatDate } from '../../lib/utils.js';

const PAGE_TITLES = {
  '/dashboard': 'Dashboard',
  '/expats': 'Expats',
  '/clients': 'Clients',
  '/dormitories': 'Dormitories',
  '/transfers': 'Transfers',
  '/checklists': 'Checklists',
  '/audit': 'Audit Trail',
  '/settings': 'Settings',
};

const DETAIL_TITLES = {
  '/expats': 'Expat Detail',
  '/clients': 'Client Detail',
  '/dormitories': 'Dormitory Detail',
  '/transfers': 'Transfer Detail',
};

export default function Topbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [notifOpen, setNotifOpen] = useState(false);
  const [searchQ, setSearchQ] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const searchTimer = useRef(null);
  const qc = useQueryClient();

  const segments = location.pathname.split('/').filter(Boolean);
  const base = '/' + (segments[0] || '');
  const title = PAGE_TITLES[location.pathname] || (segments.length > 1 ? DETAIL_TITLES[base] : null) || PAGE_TITLES[base] || 'Dashboard';

  const { data: notifData } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notifApi.list().then(r => r.data),
    refetchInterval: 30000,
  });

  const unreadCount = notifData?.unreadCount || 0;

  function handleSearchInput(val) {
    setSearchQ(val);
    clearTimeout(searchTimer.current);
    if (val.length < 2) { setSearchResults([]); return; }
    searchTimer.current = setTimeout(async () => {
      try {
        const { data } = await searchApi.global(val);
        setSearchResults(data);
      } catch {}
    }, 300);
  }

  function handleSearchSelect(item) {
    setSearchQ('');
    setSearchResults([]);
    navigate(`/${item.type}s/${item.id}`);
  }

  async function markAllRead() {
    await notifApi.markAllRead();
    qc.invalidateQueries({ queryKey: ['notifications'] });
  }

  return (
    <>
      <div className="topbar">
        <div style={{ fontFamily: 'Instrument Serif, serif', fontSize: 19, color: 'var(--text)' }}>
          {title}
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Global search */}
          <div className="search-box" style={{ minWidth: 240, position: 'relative' }}>
            <Search size={14} style={{ color: 'var(--text3)', flexShrink: 0 }} />
            <input
              placeholder="Search expats, clients, dorms…"
              value={searchQ}
              onChange={e => handleSearchInput(e.target.value)}
            />
            {searchQ && (
              <button onClick={() => { setSearchQ(''); setSearchResults([]); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', padding: 0 }}>
                <X size={13} />
              </button>
            )}
            {searchResults.length > 0 && (
              <div style={{
                position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4,
                background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r)',
                boxShadow: '0 8px 24px rgba(0,0,0,0.12)', zIndex: 100, overflow: 'hidden',
              }}>
                {searchResults.map((item, i) => (
                  <div key={i} onClick={() => handleSearchSelect(item)}
                    style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: i < searchResults.length - 1 ? '1px solid var(--border)' : 'none', display: 'flex', gap: 10, alignItems: 'center' }}
                    className="hover:bg-surface-2"
                  >
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', flexShrink: 0 }} />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>{item.label}</div>
                      <div style={{ fontSize: 11, color: 'var(--text3)' }}>{item.sub}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Notifications */}
          <button className="icon-btn" onClick={() => setNotifOpen(o => !o)} title="Notifications">
            <Bell size={16} />
            {unreadCount > 0 && (
              <span style={{ position: 'absolute', top: 6, right: 6, width: 6, height: 6, borderRadius: '50%', background: 'var(--accent2)', border: '1.5px solid var(--surface)' }} />
            )}
          </button>
        </div>
      </div>

      {/* Notification drawer */}
      <div className={`notif-drawer${notifOpen ? ' open' : ''}`}>
        <div style={{ padding: '16px 18px', borderBottom: '1px solid var(--border)', fontWeight: 600, fontSize: 14, display: 'flex', alignItems: 'center' }}>
          Notifications
          <button onClick={markAllRead} style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--accent)', cursor: 'pointer', background: 'none', border: 'none', fontFamily: 'inherit' }}>
            Mark all read
          </button>
          <button onClick={() => setNotifOpen(false)} style={{ marginLeft: 8, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)' }}>
            <X size={14} />
          </button>
        </div>
        {notifData?.notifications?.length === 0 && (
          <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--text3)', fontSize: 13 }}>No notifications</div>
        )}
        {notifData?.notifications?.map(n => (
          <div key={n.id}
            style={{
              display: 'flex', gap: 10, padding: '12px 16px',
              borderBottom: '1px solid var(--border)', cursor: 'pointer',
              transition: 'background 0.12s',
              borderLeft: n.isRead ? '3px solid transparent' : '3px solid var(--accent2)',
            }}
            className="hover:bg-surface-2"
          >
            <div style={{ width: 34, height: 34, borderRadius: 'var(--r-sm)', background: n.type?.includes('EXPIRY') ? 'var(--red-light)' : 'var(--amber-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, flexShrink: 0 }}>
              {n.type?.includes('EXPIRY') ? '🚨' : n.type?.includes('TRANSFER') ? '⏳' : '📋'}
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 500 }}>{n.title}</div>
              <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>{n.body}</div>
              <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 3 }}>{formatDate(n.createdAt)}</div>
            </div>
          </div>
        ))}
      </div>
      {notifOpen && (
        <div onClick={() => setNotifOpen(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 89 }}
        />
      )}
    </>
  );
}
