import { useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Upload, Plus, UserMinus } from 'lucide-react';
import { dormitories as dormsApi, documents as docsApi, checklists as checklistApi } from '../../../api/index.js';
import StatusBadge from '../../../components/shared/StatusBadge.jsx';
import ChecklistCard from '../../../components/shared/ChecklistCard.jsx';
import DocumentUploadDialog from '../../../components/shared/DocumentUploadDialog.jsx';
import AssignChecklistDialog from '../../../components/shared/AssignChecklistDialog.jsx';
import { getInitials, getAvatarColor, formatDate, formatFileSize } from '../../../lib/utils.js';

const TABS = ['Overview', 'Occupants', 'Documents', 'Checklists'];

export default function DormitoryDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [tab, setTab] = useState('Overview');
  const [showUpload, setShowUpload] = useState(false);
  const [showChecklist, setShowChecklist] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({});

  const { data: dorm, isLoading } = useQuery({
    queryKey: ['dormitory', id],
    queryFn: () => dormsApi.get(id).then(r => r.data),
    onSuccess: d => setForm({ name: d.name, address: d.address || '', state: d.state || '', capacity: d.capacity || '', amenities: d.amenities || '' }),
  });

  const { data: docs } = useQuery({
    queryKey: ['documents', 'DORMITORY', id],
    queryFn: () => docsApi.list({ entityType: 'DORMITORY', entityId: id }).then(r => r.data),
    enabled: tab === 'Documents',
  });

  const { data: checklists } = useQuery({
    queryKey: ['checklists', 'DORMITORY', id],
    queryFn: () => checklistApi.list({ entityType: 'DORMITORY', entityId: id }).then(r => r.data),
    enabled: tab === 'Checklists',
  });

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await dormsApi.update(id, { ...form, capacity: Number(form.capacity) });
      qc.invalidateQueries({ queryKey: ['dormitory', id] });
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  if (isLoading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text3)' }}>Loading…</div>;
  if (!dorm) return <div style={{ padding: 40 }}>Dormitory not found.</div>;

  const occ = dorm._count?.expats || 0;
  const pct = dorm.capacity ? Math.round((occ / dorm.capacity) * 100) : 0;
  const nearFull = pct >= 90;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
        <button className="btn btn-outline btn-sm" onClick={() => navigate('/dormitories')} style={{ padding: '5px 10px' }}>
          <ArrowLeft size={14} /> Back
        </button>
        <div style={{ width: 44, height: 44, background: 'var(--accent-light)', border: '1px solid rgba(31,78,61,0.2)', borderRadius: 'var(--r)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>🏠</div>
        <div>
          <div style={{ fontFamily: 'Instrument Serif, serif', fontSize: 22 }}>{dorm.name}</div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 3 }}>
            <StatusBadge status={dorm.status} />
            <span style={{ fontSize: 12, color: 'var(--text3)' }}>{dorm.state}</span>
            <span style={{ fontSize: 12, color: nearFull ? 'var(--accent2)' : 'var(--text3)', fontWeight: 600 }}>{occ}/{dorm.capacity} occupied</span>
          </div>
        </div>
        <div style={{ marginLeft: 'auto' }}>
          {!editing
            ? <button className="btn btn-outline" onClick={() => { setEditing(true); setForm({ name: dorm.name, address: dorm.address||'', state: dorm.state||'', capacity: dorm.capacity||'', amenities: dorm.amenities||'' }); }}>Edit</button>
            : <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-outline" onClick={() => setEditing(false)}>Cancel</button>
                <button className="btn btn-primary" disabled={saving} onClick={handleSave}>{saving ? 'Saving…' : 'Save'}</button>
              </div>
          }
        </div>
      </div>

      <div className="tab-group" style={{ marginBottom: 20 }}>
        {TABS.map(t => <button key={t} className={`tab-item${tab===t?' active':''}`} onClick={() => setTab(t)}>{t}{t==='Occupants'?` (${occ})`:''}</button>)}
      </div>

      {tab === 'Overview' && !editing && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: '20px 24px' }}>
            <div className="detail-section-title">Dormitory Information</div>
            <div className="detail-row"><span className="detail-label">Name</span><span className="detail-val">{dorm.name}</span></div>
            <div className="detail-row"><span className="detail-label">State</span><span className="detail-val">{dorm.state || '—'}</span></div>
            <div className="detail-row"><span className="detail-label">Capacity</span><span className="detail-val">{dorm.capacity || '—'}</span></div>
            <div className="detail-row"><span className="detail-label">Amenities</span><span className="detail-val">{dorm.amenities || '—'}</span></div>
            <div className="detail-row" style={{ alignItems: 'flex-start' }}><span className="detail-label">Address</span><span className="detail-val" style={{ textAlign: 'right', maxWidth: 220 }}>{dorm.address || '—'}</span></div>
          </div>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: '20px 24px' }}>
            <div className="detail-section-title">Occupancy</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 8 }}>
              <span style={{ fontFamily: 'Instrument Serif, serif', fontSize: 32, color: nearFull ? 'var(--accent2)' : 'var(--accent)' }}>{occ}</span>
              <span style={{ fontSize: 13, color: 'var(--text3)' }}>/ {dorm.capacity} beds</span>
            </div>
            <div className="occ-bar" style={{ marginBottom: 10 }}>
              <div className="occ-fill" style={{ width: `${pct}%`, background: nearFull ? 'var(--accent2)' : 'var(--accent)' }} />
            </div>
            <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
              <div style={{ flex: 1, background: 'var(--surface2)', borderRadius: 'var(--r-sm)', padding: '10px', textAlign: 'center' }}>
                <div style={{ fontFamily: 'Instrument Serif, serif', fontSize: 24, color: 'var(--accent)' }}>{occ}</div>
                <div style={{ fontSize: 11, color: 'var(--text3)' }}>Occupied</div>
              </div>
              <div style={{ flex: 1, background: 'var(--surface2)', borderRadius: 'var(--r-sm)', padding: '10px', textAlign: 'center' }}>
                <div style={{ fontFamily: 'Instrument Serif, serif', fontSize: 24, color: (dorm.capacity - occ) > 0 ? 'var(--green)' : 'var(--red)' }}>{(dorm.capacity || 0) - occ}</div>
                <div style={{ fontSize: 11, color: 'var(--text3)' }}>Available</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'Overview' && editing && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: '20px 24px', maxWidth: 560 }}>
          <div className="detail-section-title">Edit Dormitory</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div><label className="form-label">Name</label><input className="form-input" value={form.name || ''} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div><label className="form-label">State</label><input className="form-input" value={form.state || ''} onChange={e => setForm(f => ({ ...f, state: e.target.value }))} /></div>
              <div><label className="form-label">Capacity</label><input type="number" className="form-input" value={form.capacity || ''} onChange={e => setForm(f => ({ ...f, capacity: e.target.value }))} /></div>
            </div>
            <div><label className="form-label">Amenities</label><input className="form-input" value={form.amenities || ''} onChange={e => setForm(f => ({ ...f, amenities: e.target.value }))} /></div>
            <div><label className="form-label">Address</label><textarea className="form-input" rows={3} value={form.address || ''} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} /></div>
          </div>
        </div>
      )}

      {tab === 'Occupants' && (
        <div className="table-card">
          <table>
            <thead><tr><th>Name</th><th>Nationality</th><th>Client</th><th>Status</th><th>Permit Expiry</th></tr></thead>
            <tbody>
              {!dorm.expats?.length && <tr><td colSpan={5}><div className="empty-state"><div style={{ fontSize: 32, marginBottom: 12 }}>🛏</div><div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text2)' }}>No current occupants</div></div></td></tr>}
              {dorm.expats?.map(e => (
                <tr key={e.id} onClick={() => navigate(`/expats/${e.id}`)}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div className={`avatar ${getAvatarColor(e.fullName)}`}>{getInitials(e.fullName)}</div>
                      <div>
                        <div style={{ fontWeight: 500 }}>{e.fullName}</div>
                        <div style={{ fontSize: 11, color: 'var(--text3)' }}>{e.expatNo}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ color: 'var(--text2)' }}>{e.nationality}</td>
                  <td style={{ color: 'var(--text2)', fontSize: 12 }}>{e.client?.name || '—'}</td>
                  <td><StatusBadge status={e.status} /></td>
                  <td style={{ fontSize: 12, color: 'var(--text2)' }}>{e.permitExpiry ? formatDate(e.permitExpiry) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'Documents' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
            <button className="btn btn-primary" onClick={() => setShowUpload(true)}><Upload size={14} /> Upload</button>
          </div>
          <div className="table-card">
            {!docs?.length && <div style={{ padding: 32, textAlign: 'center', color: 'var(--text3)' }}>No documents uploaded.</div>}
            {docs?.map((doc, i) => (
              <div key={doc.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: i < docs.length - 1 ? '1px solid var(--border)' : 'none' }}>
                <div style={{ width: 36, height: 36, background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>📄</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{doc.originalName}</div>
                  <div style={{ fontSize: 11, color: 'var(--text3)' }}>{doc.documentType} · {formatFileSize(doc.fileSizeBytes)}{doc.expiryDate ? ` · Expires ${formatDate(doc.expiryDate)}` : ''}</div>
                </div>
              </div>
            ))}
          </div>
          {showUpload && <DocumentUploadDialog entityType="DORMITORY" entityId={id} onClose={() => setShowUpload(false)} />}
        </div>
      )}

      {tab === 'Checklists' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
            <button className="btn btn-primary" onClick={() => setShowChecklist(true)}><Plus size={14} /> Assign Checklist</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {!checklists?.length && <div style={{ textAlign: 'center', padding: 32, color: 'var(--text3)' }}>No checklists assigned.</div>}
            {checklists?.map(cl => <ChecklistCard key={cl.id} checklist={cl} entityType="DORMITORY" entityId={id} />)}
          </div>
          {showChecklist && <AssignChecklistDialog entityType="DORMITORY" entityId={id} onClose={() => setShowChecklist(false)} />}
        </div>
      )}
    </div>
  );
}
