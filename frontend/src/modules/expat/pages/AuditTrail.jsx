import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download } from 'lucide-react';
import { audit as auditLogs } from '../../../api/index.js';
import { formatDate, getInitials, getAvatarColor } from '../../../lib/utils.js';

const TABLE_NAMES = ['', 'Expat', 'Client', 'Dormitory', 'User', 'Transfer', 'Document', 'Checklist', 'Setting'];
const ACTION_COLORS = {
  CREATE: { bg: 'rgba(0,160,90,0.1)', color: 'var(--green)' },
  UPDATE: { bg: 'rgba(31,78,61,0.08)', color: 'var(--accent)' },
  DELETE: { bg: 'rgba(196,82,26,0.1)', color: 'var(--red)' },
  LOGIN: { bg: 'rgba(100,100,200,0.08)', color: '#5555BB' },
  APPROVE: { bg: 'rgba(0,160,90,0.1)', color: 'var(--green)' },
  REJECT: { bg: 'rgba(196,82,26,0.1)', color: 'var(--red)' },
  UPLOAD: { bg: 'rgba(196,82,26,0.08)', color: 'var(--amber)' },
};

export default function AuditTrail() {
  const [filters, setFilters] = useState({ action: '', tableName: '', dateFrom: '', dateTo: '' });
  const [page, setPage] = useState(1);
  const pageSize = 30;

  const { data, isLoading } = useQuery({
    queryKey: ['audit-logs', { ...filters, page }],
    queryFn: () => auditLogs.list({ ...filters, page, pageSize: pageSize }).then(r => r.data),
    keepPreviousData: true,
  });

  function handleExport() {
    const params = new URLSearchParams({ ...filters, format: 'csv' });
    window.open(`/api/audit?${params}`, '_blank');
  }

  function setFilter(key, val) {
    setFilters(f => ({ ...f, [key]: val }));
    setPage(1);
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <select className="form-input" style={{ maxWidth: 160, fontSize: 12 }} value={filters.action} onChange={e => setFilter('action', e.target.value)}>
          <option value="">All Actions</option>
          {Object.keys(ACTION_COLORS).map(a => <option key={a}>{a}</option>)}
        </select>
        <select className="form-input" style={{ maxWidth: 160, fontSize: 12 }} value={filters.tableName} onChange={e => setFilter('tableName', e.target.value)}>
          {TABLE_NAMES.map(t => <option key={t} value={t}>{t || 'All Tables'}</option>)}
        </select>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <input type="date" className="form-input" style={{ maxWidth: 150, fontSize: 12 }} value={filters.dateFrom} onChange={e => setFilter('dateFrom', e.target.value)} />
          <span style={{ fontSize: 12, color: 'var(--text3)' }}>to</span>
          <input type="date" className="form-input" style={{ maxWidth: 150, fontSize: 12 }} value={filters.dateTo} onChange={e => setFilter('dateTo', e.target.value)} />
        </div>
        <div style={{ marginLeft: 'auto' }}>
          <button className="btn btn-outline" onClick={handleExport}><Download size={14} /> Export CSV</button>
        </div>
      </div>

      <div className="table-card">
        <table>
          <thead>
            <tr><th>Time</th><th>User</th><th>Action</th><th>Table</th><th>Record ID</th><th>Changes</th></tr>
          </thead>
          <tbody>
            {isLoading && [1,2,3,4,5].map(i => (
              <tr key={i} style={{ pointerEvents: 'none' }}>
                {[1,2,3,4,5,6].map(j => <td key={j}><div className="skeleton" style={{ height: 14, width: '70%', borderRadius: 4 }} /></td>)}
              </tr>
            ))}
            {!isLoading && !data?.items?.length && (
              <tr><td colSpan={6}><div className="empty-state"><div style={{ fontSize: 32, marginBottom: 12 }}>📋</div><div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text2)' }}>No audit records found</div></div></td></tr>
            )}
            {!isLoading && data?.items?.map(log => {
              const ac = ACTION_COLORS[log.action] || { bg: 'var(--surface2)', color: 'var(--text2)' };
              let changes = null;
              try { changes = log.changes ? JSON.parse(log.changes) : null; } catch {}
              return (
                <tr key={log.id}>
                  <td style={{ fontSize: 11, color: 'var(--text3)', whiteSpace: 'nowrap' }}>{formatDate(log.createdAt, 'dd MMM yyyy HH:mm')}</td>
                  <td>
                    {log.user ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div className={`avatar ${getAvatarColor(log.user?.name)}`} style={{ width: 24, height: 24, fontSize: 9 }}>{getInitials(log.user?.name)}</div>
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 500 }}>{log.user?.name}</div>
                          <div style={{ fontSize: 10, color: 'var(--text3)' }}>{log.user?.role}</div>
                        </div>
                      </div>
                    ) : <span style={{ fontSize: 11, color: 'var(--text3)' }}>System</span>}
                  </td>
                  <td>
                    <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, background: ac.bg, color: ac.color, fontWeight: 600 }}>{log.action}</span>
                  </td>
                  <td style={{ fontSize: 12, color: 'var(--text2)' }}>{log.tableName}</td>
                  <td style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--text3)' }}>{log.recordId?.slice(0, 12)}…</td>
                  <td style={{ maxWidth: 260 }}>
                    {changes && (
                      <div style={{ fontSize: 11, color: 'var(--text3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {Object.entries(changes).slice(0, 3).map(([k, v]) => `${k}: ${JSON.stringify(v)}`).join(', ')}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {(data?.total || 0) > pageSize && (
          <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'flex-end' }}>
            <button className="btn btn-outline btn-sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>‹ Prev</button>
            <span style={{ fontSize: 12, color: 'var(--text2)' }}>Page {page} of {Math.ceil(data.total / pageSize)}</span>
            <button className="btn btn-outline btn-sm" disabled={page * pageSize >= data.total} onClick={() => setPage(p => p + 1)}>Next ›</button>
          </div>
        )}
      </div>
    </div>
  );
}
