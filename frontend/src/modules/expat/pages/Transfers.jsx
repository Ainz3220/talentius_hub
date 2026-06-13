import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { Check, X, Plus } from 'lucide-react';
import { transfers as transfersApi, expats as expatsApi, clients as clientsApi, dormitories as dormsApi } from '../../../api/index.js';
import StatusBadge from '../../../components/shared/StatusBadge.jsx';
import { useAuthStore } from '../../../store/authStore.js';
import { formatDate, getInitials, getAvatarColor } from '../../../lib/utils.js';

const TABS = [{ key: 'PENDING', label: 'Pending Approval' }, { key: '', label: 'All Transfers' }];

export default function Transfers() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { hasRole } = useAuthStore();
  const isManager = hasRole('MANAGER');
  const [tab, setTab] = useState('PENDING');
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ expatId: '', transferType: 'DORMITORY', toDormitoryId: '', toClientId: '', reason: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(null);
  const pageSize = 20;

  const { data, isLoading } = useQuery({
    queryKey: ['transfers', { status: tab, page }],
    queryFn: () => transfersApi.list({ status: tab, page, pageSize }).then(r => r.data),
    keepPreviousData: true,
  });

  const { data: expatList } = useQuery({ queryKey: ['expats-list'], queryFn: () => expatsApi.list({ status: 'ACTIVE', pageSize: 200 }).then(r => r.data.items), enabled: showCreate });
  const { data: dormList } = useQuery({ queryKey: ['dorms-list'], queryFn: () => dormsApi.list().then(r => r.data), enabled: showCreate });
  const { data: clientList } = useQuery({ queryKey: ['clients-list'], queryFn: () => clientsApi.list({ pageSize: 100 }).then(r => r.data.items), enabled: showCreate });

  async function handleApprove(id) {
    setActionLoading(id);
    try {
      await transfersApi.approve(id);
      qc.invalidateQueries({ queryKey: ['transfers'] });
    } finally {
      setActionLoading(null);
    }
  }

  async function handleReject(id) {
    const reason = window.prompt('Rejection reason (optional):');
    if (reason === null) return;
    setActionLoading(id);
    try {
      await transfersApi.reject(id, { reason });
      qc.invalidateQueries({ queryKey: ['transfers'] });
    } finally {
      setActionLoading(null);
    }
  }

  async function handleCreate(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload = { expatId: form.expatId, reason: form.reason };
      if (form.transferType === 'DORMITORY') payload.toDormitoryId = form.toDormitoryId;
      else payload.toClientId = form.toClientId;
      await transfersApi.create(payload);
      qc.invalidateQueries({ queryKey: ['transfers'] });
      setShowCreate(false);
      setForm({ expatId: '', transferType: 'DORMITORY', toDormitoryId: '', toClientId: '', reason: '' });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create transfer');
    } finally {
      setSaving(false);
    }
  }

  const pendingCount = tab === 'PENDING' ? data?.total || 0 : 0;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <div className="tab-group">
          {TABS.map(t => (
            <button key={t.key} className={`tab-item${tab===t.key?' active':''}`} onClick={() => { setTab(t.key); setPage(1); }}>
              {t.label}
              {t.key === 'PENDING' && pendingCount > 0 && (
                <span style={{ marginLeft: 6, background: 'var(--amber)', color: '#fff', borderRadius: 10, padding: '1px 6px', fontSize: 10, fontWeight: 700 }}>{pendingCount}</span>
              )}
            </button>
          ))}
        </div>
        <div style={{ marginLeft: 'auto' }}>
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}><Plus size={14} /> Request Transfer</button>
        </div>
      </div>

      {tab === 'PENDING' && pendingCount > 0 && (
        <div style={{ background: '#FFFBEB', border: '1px solid rgba(196,82,26,0.25)', borderRadius: 'var(--r)', padding: '10px 14px', marginBottom: 14, fontSize: 13, color: 'var(--amber)', display: 'flex', alignItems: 'center', gap: 8 }}>
          ⏳ <strong>{pendingCount} transfer{pendingCount > 1 ? 's' : ''}</strong> awaiting approval{isManager ? '' : ' — requires Manager approval'}
        </div>
      )}

      <div className="table-card">
        <table>
          <thead>
            <tr>
              <th>Expat</th>
              <th>From</th>
              <th>To</th>
              <th>Type</th>
              <th>Requested</th>
              <th>Status</th>
              {isManager && tab === 'PENDING' && <th style={{ width: 120 }}>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {isLoading && [1,2,3].map(i => (
              <tr key={i} style={{ pointerEvents: 'none' }}>
                {[1,2,3,4,5,6].map(j => <td key={j}><div className="skeleton" style={{ height: 14, width: '70%', borderRadius: 4 }} /></td>)}
              </tr>
            ))}
            {!isLoading && !data?.items?.length && (
              <tr><td colSpan={isManager && tab === 'PENDING' ? 7 : 6}><div className="empty-state"><div style={{ fontSize: 32, marginBottom: 12 }}>🔄</div><div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text2)' }}>{tab === 'PENDING' ? 'No pending transfers' : 'No transfers found'}</div></div></td></tr>
            )}
            {!isLoading && data?.items?.map(t => (
              <tr key={t.id}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div className={`avatar ${getAvatarColor(t.expat?.fullName)}`}>{getInitials(t.expat?.fullName)}</div>
                    <div>
                      <div style={{ fontWeight: 500, fontSize: 13, cursor: 'pointer', color: 'var(--accent)' }}
                        onClick={() => navigate(`/expats/${t.expatId}`)}>{t.expat?.fullName}</div>
                      <div style={{ fontSize: 11, color: 'var(--text3)' }}>{t.expat?.expatNo}</div>
                    </div>
                  </div>
                </td>
                <td style={{ fontSize: 12, color: 'var(--text2)' }}>
                  {t.fromDormitory?.name || t.fromClient?.name || <span style={{ color: 'var(--text3)' }}>—</span>}
                </td>
                <td style={{ fontSize: 12, color: 'var(--text2)', fontWeight: 500 }}>
                  {t.toDormitory?.name || t.toClient?.name || <span style={{ color: 'var(--text3)' }}>—</span>}
                </td>
                <td>
                  <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 'var(--r-sm)', background: t.toDormitory ? 'rgba(31,78,61,0.08)' : 'rgba(196,82,26,0.08)', color: t.toDormitory ? 'var(--accent)' : 'var(--accent2)' }}>
                    {t.toDormitory ? 'Dormitory' : 'Client'}
                  </span>
                </td>
                <td style={{ fontSize: 12, color: 'var(--text3)' }}>{formatDate(t.createdAt)}</td>
                <td><StatusBadge status={t.status} /></td>
                {isManager && tab === 'PENDING' && (
                  <td>
                    {t.status === 'PENDING' && (
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          className="btn btn-outline btn-sm"
                          disabled={actionLoading === t.id}
                          onClick={() => handleApprove(t.id)}
                          style={{ padding: '4px 8px', color: 'var(--green)', borderColor: 'var(--green)' }}>
                          <Check size={12} />
                        </button>
                        <button
                          className="btn btn-outline btn-sm"
                          disabled={actionLoading === t.id}
                          onClick={() => handleReject(t.id)}
                          style={{ padding: '4px 8px', color: 'var(--red)', borderColor: 'var(--red)' }}>
                          <X size={12} />
                        </button>
                      </div>
                    )}
                  </td>
                )}
              </tr>
            ))}
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

      {showCreate && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowCreate(false)}>
          <div className="modal">
            <div className="modal-header">
              <h3 style={{ fontFamily: 'Instrument Serif, serif', fontSize: 18 }}>Request Transfer</h3>
              <button onClick={() => setShowCreate(false)} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: 'var(--text3)' }}>×</button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {error && <div style={{ padding: '8px 12px', background: 'var(--red-light)', color: 'var(--red)', borderRadius: 'var(--r-sm)', fontSize: 13 }}>{error}</div>}
                <div>
                  <label className="form-label">Expat <span style={{ color: 'var(--accent2)' }}>*</span></label>
                  <select className="form-input" required value={form.expatId} onChange={e => setForm(f => ({ ...f, expatId: e.target.value }))}>
                    <option value="">Select expat…</option>
                    {expatList?.map(e => <option key={e.id} value={e.id}>{e.fullName} ({e.expatNo})</option>)}
                  </select>
                </div>
                <div>
                  <label className="form-label">Transfer Type</label>
                  <div style={{ display: 'flex', gap: 12 }}>
                    {[{v:'DORMITORY',l:'Change Dormitory'},{v:'CLIENT',l:'Change Client'}].map(opt => (
                      <label key={opt.v} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13 }}>
                        <input type="radio" name="ttype" value={opt.v} checked={form.transferType === opt.v} onChange={() => setForm(f => ({ ...f, transferType: opt.v, toDormitoryId: '', toClientId: '' }))} />
                        {opt.l}
                      </label>
                    ))}
                  </div>
                </div>
                {form.transferType === 'DORMITORY' && (
                  <div>
                    <label className="form-label">New Dormitory <span style={{ color: 'var(--accent2)' }}>*</span></label>
                    <select className="form-input" required value={form.toDormitoryId} onChange={e => setForm(f => ({ ...f, toDormitoryId: e.target.value }))}>
                      <option value="">Select dormitory…</option>
                      {dormList?.map(d => <option key={d.id} value={d.id}>{d.name} ({d._count?.expats || 0}/{d.capacity})</option>)}
                    </select>
                  </div>
                )}
                {form.transferType === 'CLIENT' && (
                  <div>
                    <label className="form-label">New Client <span style={{ color: 'var(--accent2)' }}>*</span></label>
                    <select className="form-input" required value={form.toClientId} onChange={e => setForm(f => ({ ...f, toClientId: e.target.value }))}>
                      <option value="">Select client…</option>
                      {clientList?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                )}
                <div>
                  <label className="form-label">Reason</label>
                  <textarea className="form-input" rows={2} value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} placeholder="Reason for transfer…" />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowCreate(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Requesting…' : 'Request Transfer'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
