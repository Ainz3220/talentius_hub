import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Download, Search } from 'lucide-react';
import { expats as expatsApi, clients as clientsApi, dormitories as dormsApi } from '../../../api/index.js';
import StatusBadge from '../../../components/shared/StatusBadge.jsx';
import { formatDate, daysUntil, getExpiryClass, getInitials, getAvatarColor } from '../../../lib/utils.js';

const STATUS_TABS = [
  { key: '', label: 'All' },
  { key: 'ACTIVE', label: 'Active' },
  { key: 'PENDING', label: 'Pending' },
  { key: 'TRANSFERRED', label: 'Transferred' },
  { key: 'EXPIRED', label: 'Expiring Soon' },
];

const NATIONALITIES = ['Bangladesh', 'India', 'Vietnam', 'Indonesia', 'China', 'Nepal', 'Myanmar', 'Pakistan', 'Philippines', 'Sri Lanka'];

export default function Expats() {
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ fullName: '', passportNo: '', nationality: 'Bangladesh', dateOfBirth: '', phone: '', permitExpiry: '', status: 'PENDING', clientId: '', dormitoryId: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const pageSize = 25;

  const { data, isLoading } = useQuery({
    queryKey: ['expats', { status: statusFilter, search, page }],
    queryFn: () => expatsApi.list({ status: statusFilter, search, page, pageSize }).then(r => r.data),
    keepPreviousData: true,
  });

  const { data: clientList } = useQuery({ queryKey: ['clients-list'], queryFn: () => clientsApi.list({ pageSize: 100 }).then(r => r.data.items) });
  const { data: dormList } = useQuery({ queryKey: ['dorms-list'], queryFn: () => dormsApi.list().then(r => r.data) });

  async function handleCreate(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await expatsApi.create(form);
      qc.invalidateQueries({ queryKey: ['expats'] });
      setShowCreate(false);
      setForm({ fullName: '', passportNo: '', nationality: 'Bangladesh', dateOfBirth: '', phone: '', permitExpiry: '', status: 'PENDING', clientId: '', dormitoryId: '' });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create expat');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      {/* Status tabs */}
      <div className="tab-group" style={{ marginBottom: 16 }}>
        {STATUS_TABS.map(t => (
          <button key={t.key} className={`tab-item${statusFilter === t.key ? ' active' : ''}`}
            onClick={() => { setStatusFilter(t.key); setPage(1); }}>
            {t.label} {data && t.key === statusFilter ? `(${data.total})` : ''}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="table-card">
        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600 }}>Expats</h3>
          <div className="search-box" style={{ minWidth: 220 }}>
            <Search size={14} style={{ color: 'var(--text3)' }} />
            <input placeholder="Search by name, nationality…" value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }} />
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            <button className="btn btn-outline" onClick={() => {}}>
              <Download size={14} />
              Bulk Export
            </button>
            <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
              <Plus size={14} />
              Add Expat
            </button>
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th>Name</th><th>Passport</th><th>Client</th><th>Dormitory</th>
              <th>Status</th><th>Permit Expiry</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && [1,2,3,4,5].map(i => (
              <tr key={i} style={{ pointerEvents: 'none' }}>
                {[1,2,3,4,5,6].map(j => (
                  <td key={j}><div className="skeleton" style={{ height: 14, width: '70%', borderRadius: 4 }} /></td>
                ))}
              </tr>
            ))}
            {!isLoading && data?.items?.map(expat => {
              const days = daysUntil(expat.permitExpiry);
              return (
                <tr key={expat.id} onClick={() => navigate(`/expats/${expat.id}`)}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div className={`avatar ${getAvatarColor(expat.fullName)}`}>{getInitials(expat.fullName)}</div>
                      <div>
                        <div style={{ fontWeight: 500, fontSize: 13 }}>{expat.fullName}</div>
                        <div style={{ fontSize: 11, color: 'var(--text3)' }}>{expat.nationality}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--text2)' }}>
                    {expat.passportNo}
                  </td>
                  <td style={{ fontSize: 13, color: 'var(--text2)' }}>{expat.client?.name || '—'}</td>
                  <td style={{ fontSize: 13, color: 'var(--text2)' }}>{expat.dormitory?.name || '—'}</td>
                  <td><StatusBadge status={expat.status} /></td>
                  <td>
                    <span className={getExpiryClass(days)}>
                      {expat.permitExpiry ? formatDate(expat.permitExpiry) : '—'}
                      {days !== null && days <= 30 && days > 0 ? ` ⚠` : ''}
                      {days !== null && days <= 0 ? ' 🚨' : ''}
                    </span>
                  </td>
                </tr>
              );
            })}
            {!isLoading && !data?.items?.length && (
              <tr><td colSpan={6}><div className="empty-state"><div style={{ fontSize: 32, marginBottom: 12 }}>👤</div><div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text2)' }}>No expats found</div></div></td></tr>
            )}
          </tbody>
        </table>
        {/* Pagination */}
        {(data?.total || 0) > pageSize && (
          <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'flex-end' }}>
            <button className="btn btn-outline btn-sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>‹ Prev</button>
            <span style={{ fontSize: 12, color: 'var(--text2)' }}>Page {page} of {Math.ceil(data.total / pageSize)}</span>
            <button className="btn btn-outline btn-sm" disabled={page * pageSize >= data.total} onClick={() => setPage(p => p + 1)}>Next ›</button>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowCreate(false)}>
          <div className="modal">
            <div className="modal-header">
              <h3 style={{ fontFamily: 'Instrument Serif, serif', fontSize: 18 }}>Add New Expat</h3>
              <button onClick={() => setShowCreate(false)} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', fontSize: 18 }}>×</button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {error && <div style={{ padding: '8px 12px', background: 'var(--red-light)', color: 'var(--red)', borderRadius: 'var(--r-sm)', fontSize: 13 }}>{error}</div>}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label className="form-label">Full Name <span style={{ color: 'var(--accent2)' }}>*</span></label>
                    <input className="form-input" placeholder="As per passport" required value={form.fullName} onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))} />
                  </div>
                  <div>
                    <label className="form-label">Nationality <span style={{ color: 'var(--accent2)' }}>*</span></label>
                    <select className="form-input" value={form.nationality} onChange={e => setForm(f => ({ ...f, nationality: e.target.value }))}>
                      {NATIONALITIES.map(n => <option key={n}>{n}</option>)}
                    </select>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label className="form-label">Passport Number <span style={{ color: 'var(--accent2)' }}>*</span></label>
                    <input className="form-input" placeholder="Passport no." required value={form.passportNo} onChange={e => setForm(f => ({ ...f, passportNo: e.target.value }))} />
                    <div className="enc-hint">Stored encrypted</div>
                  </div>
                  <div>
                    <label className="form-label">Date of Birth</label>
                    <input type="date" className="form-input" value={form.dateOfBirth} onChange={e => setForm(f => ({ ...f, dateOfBirth: e.target.value }))} />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label className="form-label">Phone</label>
                    <input className="form-input" placeholder="+60 12 345 6789" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
                  </div>
                  <div>
                    <label className="form-label">Permit Expiry</label>
                    <input type="date" className="form-input" value={form.permitExpiry} onChange={e => setForm(f => ({ ...f, permitExpiry: e.target.value }))} />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label className="form-label">Assign to Client</label>
                    <select className="form-input" value={form.clientId} onChange={e => setForm(f => ({ ...f, clientId: e.target.value }))}>
                      <option value="">— Unassigned —</option>
                      {clientList?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="form-label">Assign to Dormitory</label>
                    <select className="form-input" value={form.dormitoryId} onChange={e => setForm(f => ({ ...f, dormitoryId: e.target.value }))}>
                      <option value="">— None —</option>
                      {dormList?.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="form-label">Initial Status</label>
                  <select className="form-input" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                    <option value="PENDING">Pending</option>
                    <option value="ACTIVE">Active</option>
                  </select>
                </div>
                <div style={{ background: 'var(--accent-light)', border: '1px solid rgba(31,78,61,0.15)', borderRadius: 'var(--r-sm)', padding: '10px 12px', fontSize: 12, color: 'var(--accent)' }}>
                  ✓ Onboarding checklist will be auto-created from current templates
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowCreate(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Creating…' : 'Create Expat'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
