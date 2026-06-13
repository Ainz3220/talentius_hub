import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { dormitories as dormsApi } from '../../../api/index.js';
import StatusBadge from '../../../components/shared/StatusBadge.jsx';

const STATES = ['Selangor', 'Kuala Lumpur', 'Johor', 'Penang', 'Pahang', 'Perak', 'Kedah', 'Kelantan', 'Terengganu', 'Melaka', 'Negeri Sembilan', 'Sabah', 'Sarawak', 'Perlis'];

export default function Dormitories() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', address: '', state: 'Selangor', capacity: '', amenities: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const { data: dorms, isLoading } = useQuery({
    queryKey: ['dormitories'],
    queryFn: () => dormsApi.list().then(r => r.data),
  });

  async function handleCreate(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await dormsApi.create({ ...form, capacity: Number(form.capacity) });
      qc.invalidateQueries({ queryKey: ['dormitories'] });
      setShowCreate(false);
      setForm({ name: '', address: '', state: 'Selangor', capacity: '', amenities: '' });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create dormitory');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}><Plus size={14} /> Add Dormitory</button>
      </div>

      {isLoading && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height: 180, borderRadius: 'var(--r-lg)' }} />)}
        </div>
      )}

      {!isLoading && !dorms?.length && (
        <div className="empty-state" style={{ padding: 60 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🏠</div>
          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text2)' }}>No dormitories yet</div>
          <div style={{ fontSize: 13, color: 'var(--text3)', marginTop: 4 }}>Add the first dormitory to get started</div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
        {dorms?.map(d => {
          const occ = d._count?.expats || 0;
          const pct = d.capacity ? Math.round((occ / d.capacity) * 100) : 0;
          const nearFull = pct >= 90;
          const available = (d.capacity || 0) - occ;
          return (
            <div key={d.id}
              style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: 20, cursor: 'pointer', transition: 'box-shadow 0.15s' }}
              onClick={() => navigate(`/dormitories/${d.id}`)}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div>
                  <div style={{ fontFamily: 'Instrument Serif, serif', fontSize: 17, fontWeight: 500 }}>{d.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>{d.state}</div>
                </div>
                <StatusBadge status={d.status} />
              </div>
              {d.address && (
                <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 12, lineHeight: 1.5 }}>{d.address}</div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, marginBottom: 8 }}>
                <span style={{ color: 'var(--text2)' }}>Occupancy</span>
                <span style={{ fontWeight: 700, color: nearFull ? 'var(--accent2)' : 'var(--accent)', fontSize: 15 }}>
                  {occ} <span style={{ color: 'var(--text3)', fontSize: 12, fontWeight: 400 }}>/ {d.capacity}</span>
                </span>
              </div>
              <div className="occ-bar" style={{ marginBottom: 10 }}>
                <div className="occ-fill" style={{ width: `${pct}%`, background: nearFull ? 'var(--accent2)' : 'var(--accent)' }} />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <div style={{ flex: 1, background: 'var(--surface2)', borderRadius: 'var(--r-sm)', padding: '8px 10px', textAlign: 'center' }}>
                  <div style={{ fontSize: 18, fontWeight: 700, fontFamily: 'Instrument Serif, serif', color: 'var(--accent)' }}>{occ}</div>
                  <div style={{ fontSize: 10, color: 'var(--text3)' }}>Occupied</div>
                </div>
                <div style={{ flex: 1, background: 'var(--surface2)', borderRadius: 'var(--r-sm)', padding: '8px 10px', textAlign: 'center' }}>
                  <div style={{ fontSize: 18, fontWeight: 700, fontFamily: 'Instrument Serif, serif', color: available > 0 ? 'var(--green)' : 'var(--red)' }}>{available}</div>
                  <div style={{ fontSize: 10, color: 'var(--text3)' }}>Available</div>
                </div>
                <div style={{ flex: 1, background: 'var(--surface2)', borderRadius: 'var(--r-sm)', padding: '8px 10px', textAlign: 'center' }}>
                  <div style={{ fontSize: 18, fontWeight: 700, fontFamily: 'Instrument Serif, serif' }}>{pct}%</div>
                  <div style={{ fontSize: 10, color: 'var(--text3)' }}>Full</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {showCreate && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowCreate(false)}>
          <div className="modal">
            <div className="modal-header">
              <h3 style={{ fontFamily: 'Instrument Serif, serif', fontSize: 18 }}>Add New Dormitory</h3>
              <button onClick={() => setShowCreate(false)} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: 'var(--text3)' }}>×</button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {error && <div style={{ padding: '8px 12px', background: 'var(--red-light)', color: 'var(--red)', borderRadius: 'var(--r-sm)', fontSize: 13 }}>{error}</div>}
                <div>
                  <label className="form-label">Dormitory Name <span style={{ color: 'var(--accent2)' }}>*</span></label>
                  <input className="form-input" required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Block A Selayang" />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label className="form-label">State <span style={{ color: 'var(--accent2)' }}>*</span></label>
                    <select className="form-input" value={form.state} onChange={e => setForm(f => ({ ...f, state: e.target.value }))}>
                      {STATES.map(s => <option key={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="form-label">Capacity <span style={{ color: 'var(--accent2)' }}>*</span></label>
                    <input type="number" min="1" className="form-input" required value={form.capacity} onChange={e => setForm(f => ({ ...f, capacity: e.target.value }))} placeholder="100" />
                  </div>
                </div>
                <div>
                  <label className="form-label">Address</label>
                  <textarea className="form-input" rows={2} value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="Full address…" />
                </div>
                <div>
                  <label className="form-label">Amenities</label>
                  <input className="form-input" value={form.amenities} onChange={e => setForm(f => ({ ...f, amenities: e.target.value }))} placeholder="e.g. WiFi, Canteen, Laundry" />
                </div>
                <div style={{ background: 'var(--accent-light)', border: '1px solid rgba(31,78,61,0.15)', borderRadius: 'var(--r-sm)', padding: '10px 12px', fontSize: 12, color: 'var(--accent)' }}>
                  ✓ Dormitory onboarding checklist will be auto-created
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowCreate(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Creating…' : 'Create Dormitory'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
