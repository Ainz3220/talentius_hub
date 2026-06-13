import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Search } from 'lucide-react';
import { clients as clientsApi } from '../../../api/index.js';
import StatusBadge from '../../../components/shared/StatusBadge.jsx';
import { getInitials, getAvatarColor } from '../../../lib/utils.js';

export default function Clients() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [typeFilter, setTypeFilter] = useState('');
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ type: 'COMPANY', name: '', registrationNo: '', contactName: '', contactPhone: '', contactEmail: '', address: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['clients', { type: typeFilter, search }],
    queryFn: () => clientsApi.list({ type: typeFilter, search, pageSize: 100 }).then(r => r.data),
  });

  async function handleCreate(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await clientsApi.create(form);
      qc.invalidateQueries({ queryKey: ['clients'] });
      setShowCreate(false);
      setForm({ type: 'COMPANY', name: '', registrationNo: '', contactName: '', contactPhone: '', contactEmail: '', address: '' });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create client');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="table-card">
        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600 }}>Clients</h3>
          <div className="tab-group" style={{ marginLeft: 16 }}>
            {[{k:'',l:'All'},{k:'COMPANY',l:'Companies'},{k:'INDIVIDUAL',l:'Individual'}].map(t => (
              <button key={t.k} className={`tab-item${typeFilter===t.k?' active':''}`} style={{ padding: '5px 12px', fontSize: 12 }} onClick={() => setTypeFilter(t.k)}>{t.l}</button>
            ))}
          </div>
          <div className="search-box" style={{ minWidth: 200 }}>
            <Search size={14} style={{ color: 'var(--text3)' }} />
            <input placeholder="Search clients…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div style={{ marginLeft: 'auto' }}>
            <button className="btn btn-primary" onClick={() => setShowCreate(true)}><Plus size={14} /> Add Client</button>
          </div>
        </div>
        <table>
          <thead>
            <tr><th>Client</th><th>Type</th><th>Reg. No.</th><th>Expats</th><th>Status</th></tr>
          </thead>
          <tbody>
            {isLoading && [1,2,3].map(i => (
              <tr key={i} style={{ pointerEvents: 'none' }}>{[1,2,3,4,5].map(j => <td key={j}><div className="skeleton" style={{ height: 14, width: '70%', borderRadius: 4 }} /></td>)}</tr>
            ))}
            {!isLoading && data?.items?.map(client => (
              <tr key={client.id} onClick={() => navigate(`/clients/${client.id}`)}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div className={`avatar ${getAvatarColor(client.name)}`}>{getInitials(client.name)}</div>
                    <div>
                      <div style={{ fontWeight: 500, fontSize: 13 }}>{client.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text3)' }}>Client #{client.clientNo}</div>
                    </div>
                  </div>
                </td>
                <td><StatusBadge status={client.type} /></td>
                <td style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--text2)' }}>
                  {client.registrationNo || '—'}
                </td>
                <td style={{ fontWeight: 600 }}>{client._count?.expats ?? 0}</td>
                <td><StatusBadge status={client.status} /></td>
              </tr>
            ))}
            {!isLoading && !data?.items?.length && (
              <tr><td colSpan={5}><div className="empty-state"><div style={{ fontSize: 32, marginBottom: 12 }}>🏢</div><div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text2)' }}>No clients found</div></div></td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowCreate(false)}>
          <div className="modal">
            <div className="modal-header">
              <h3 style={{ fontFamily: 'Instrument Serif, serif', fontSize: 18 }}>Add New Client</h3>
              <button onClick={() => setShowCreate(false)} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: 'var(--text3)' }}>×</button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {error && <div style={{ padding: '8px 12px', background: 'var(--red-light)', color: 'var(--red)', borderRadius: 'var(--r-sm)', fontSize: 13 }}>{error}</div>}
                <div>
                  <label className="form-label">Client Type <span style={{ color: 'var(--accent2)' }}>*</span></label>
                  <select className="form-input" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                    <option value="COMPANY">Company</option>
                    <option value="INDIVIDUAL">Individual</option>
                  </select>
                </div>
                <div>
                  <label className="form-label">{form.type === 'COMPANY' ? 'Company Name' : 'Full Name'} <span style={{ color: 'var(--accent2)' }}>*</span></label>
                  <input className="form-input" required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder={form.type === 'COMPANY' ? 'Company Sdn Bhd' : 'Full legal name'} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label className="form-label">Registration No.</label>
                    <input className="form-input" value={form.registrationNo} onChange={e => setForm(f => ({ ...f, registrationNo: e.target.value }))} placeholder="SSM number" />
                    <div className="enc-hint">Stored encrypted</div>
                  </div>
                  <div>
                    <label className="form-label">Contact Person</label>
                    <input className="form-input" value={form.contactName} onChange={e => setForm(f => ({ ...f, contactName: e.target.value }))} placeholder="Full name" />
                    <div className="enc-hint">Stored encrypted</div>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label className="form-label">Contact Phone</label>
                    <input className="form-input" value={form.contactPhone} onChange={e => setForm(f => ({ ...f, contactPhone: e.target.value }))} placeholder="+60 …" />
                  </div>
                  <div>
                    <label className="form-label">Contact Email</label>
                    <input type="email" className="form-input" value={form.contactEmail} onChange={e => setForm(f => ({ ...f, contactEmail: e.target.value }))} placeholder="email@company.com" />
                  </div>
                </div>
                <div>
                  <label className="form-label">Address</label>
                  <textarea className="form-input" rows={2} value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="Business address" />
                </div>
                <div style={{ background: 'var(--accent-light)', border: '1px solid rgba(31,78,61,0.15)', borderRadius: 'var(--r-sm)', padding: '10px 12px', fontSize: 12, color: 'var(--accent)' }}>
                  ✓ Client onboarding checklist will be auto-created
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowCreate(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Creating…' : 'Create Client'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
