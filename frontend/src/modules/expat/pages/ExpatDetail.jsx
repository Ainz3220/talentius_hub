import { useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Download, Upload, Plus } from 'lucide-react';
import { expats as expatsApi, documents as docsApi, checklists as checklistApi, clients as clientsApi, dormitories as dormsApi, transfers as transfersApi, settings as settingsApi } from '../../../api/index.js';
import StatusBadge from '../../../components/shared/StatusBadge.jsx';
import ChecklistCard from '../../../components/shared/ChecklistCard.jsx';
import DocumentUploadDialog from '../../../components/shared/DocumentUploadDialog.jsx';
import DocumentPreviewModal from '../../../components/shared/DocumentPreviewModal.jsx';
import AssignChecklistDialog from '../../../components/shared/AssignChecklistDialog.jsx';
import { formatDate, daysUntil, getExpiryClass, getInitials, getAvatarColor, formatFileSize } from '../../../lib/utils.js';
import { useAuthStore } from '../../../store/authStore.js';

const TABS = ['Overview', 'Documents', 'Checklists', 'Transfers'];

export default function ExpatDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = useAuthStore();
  const isManager = user?.role === 'MANAGER' || user?.role === 'SUPER_ADMIN';

  const [tab, setTab] = useState('Overview');
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [showChecklist, setShowChecklist] = useState(false);
  const [previewDoc, setPreviewDoc] = useState(null);
  const [showTransfer, setShowTransfer] = useState(false);
  const [transferForm, setTransferForm] = useState({ toDormitoryId: '', toClientId: '', reason: '', effectiveDate: '' });
  const [transferSaving, setTransferSaving] = useState(false);
  const [confirmTransfer, setConfirmTransfer] = useState(false);

  const { data: expat, isLoading } = useQuery({
    queryKey: ['expat', id],
    queryFn: () => expatsApi.get(id).then(r => r.data),
  });

  const { data: docs } = useQuery({
    queryKey: ['documents', 'EXPAT', id],
    queryFn: () => docsApi.list({ entityType: 'EXPAT', entityId: id }).then(r => r.data),
    enabled: tab === 'Documents',
  });

  const { data: checklists } = useQuery({
    queryKey: ['checklists', 'EXPAT', id],
    queryFn: () => checklistApi.list({ entityType: 'EXPAT', entityId: id }).then(r => r.data),
    enabled: tab === 'Checklists',
  });

  const { data: clientList } = useQuery({ queryKey: ['clients-list'], queryFn: () => clientsApi.list({ pageSize: 100 }).then(r => r.data.items), enabled: editing || showTransfer });
  const { data: dormList } = useQuery({ queryKey: ['dorms-list'], queryFn: () => dormsApi.list().then(r => r.data), enabled: editing || showTransfer });
  const { data: appSettings } = useQuery({ queryKey: ['settings'], queryFn: () => settingsApi.get().then(r => r.data), staleTime: 60000 });
  const requiresApproval = appSettings?.transferRequiresApproval ?? true;

  function startEdit() {
    setEditForm({
      fullName: expat.fullName,
      nationality: expat.nationality,
      status: expat.status,
      clientId: expat.clientId,
      dormitoryId: expat.dormitoryId || '',
      permitExpiry: expat.permitExpiry ? expat.permitExpiry.slice(0, 10) : '',
    });
    setEditing(true);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const payload = { ...editForm };
      if (!isManager) {
        delete payload.clientId;
        delete payload.dormitoryId;
      }
      await expatsApi.update(id, payload);
      qc.invalidateQueries({ queryKey: ['expat', id] });
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  async function downloadDoc(doc) {
    const { data } = await docsApi.download(doc.id);
    const url = URL.createObjectURL(new Blob([data]));
    const a = document.createElement('a');
    a.href = url; a.download = doc.originalName; a.click();
    URL.revokeObjectURL(url);
  }

  async function handleTransfer(e) {
    e.preventDefault();
    if (!requiresApproval) { setConfirmTransfer(true); return; }
    await submitTransfer();
  }

  async function submitTransfer() {
    setConfirmTransfer(false);
    setTransferSaving(true);
    try {
      const tf = Object.fromEntries(Object.entries(transferForm).filter(([, v]) => v !== '' && v !== null));
      await transfersApi.create({ expatId: id, ...tf, fromDormitoryId: expat.dormitoryId || undefined, fromClientId: expat.clientId || undefined });
      qc.invalidateQueries({ queryKey: ['expat', id] });
      setShowTransfer(false);
      setTransferForm({ toDormitoryId: '', toClientId: '', reason: '', effectiveDate: '' });
    } finally {
      setTransferSaving(false);
    }
  }

  if (isLoading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text3)' }}>Loading…</div>;
  if (!expat) return <div style={{ padding: 40 }}>Expat not found.</div>;

  const permitDays = daysUntil(expat.permitExpiry);

  return (
    <div>
      {/* Back + Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
        <button className="btn btn-outline btn-sm" onClick={() => navigate('/expats')} style={{ padding: '5px 10px' }}>
          <ArrowLeft size={14} /> Back
        </button>
        <div className={`avatar ${getAvatarColor(expat.fullName)}`} style={{ width: 44, height: 44, fontSize: 16 }}>
          {getInitials(expat.fullName)}
        </div>
        <div>
          <div style={{ fontFamily: 'Instrument Serif, serif', fontSize: 22 }}>{expat.fullName}</div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 3 }}>
            <StatusBadge status={expat.status} />
            <span style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--text3)' }}>{expat.expatNo}</span>
          </div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          {!editing && <button className="btn btn-outline" onClick={startEdit}>Edit Profile</button>}
          {editing && <>
            <button className="btn btn-outline" onClick={() => setEditing(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
          </>}
          <button className="btn btn-primary" onClick={() => setShowTransfer(true)}>Request Transfer</button>
        </div>
      </div>

      {/* Tabs */}
      <div className="tab-group" style={{ marginBottom: 20 }}>
        {TABS.map(t => <button key={t} className={`tab-item${tab === t ? ' active' : ''}`} onClick={() => setTab(t)}>{t}</button>)}
      </div>

      {/* ── Overview ── */}
      {tab === 'Overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {/* Personal Info */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: '20px 24px' }}>
            <div className="detail-section-title">Personal Information</div>
            {editing ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div><label className="form-label">Full Name</label><input className="form-input" value={editForm.fullName} onChange={e => setEditForm(f => ({ ...f, fullName: e.target.value }))} /></div>
                <div><label className="form-label">Nationality</label><input className="form-input" value={editForm.nationality} onChange={e => setEditForm(f => ({ ...f, nationality: e.target.value }))} /></div>
                <div><label className="form-label">Permit Expiry</label><input type="date" className="form-input" value={editForm.permitExpiry} onChange={e => setEditForm(f => ({ ...f, permitExpiry: e.target.value }))} /></div>
                <div><label className="form-label">Status</label>
                  <select className="form-input" value={editForm.status} onChange={e => setEditForm(f => ({ ...f, status: e.target.value }))}>
                    {['PENDING','ACTIVE','TRANSFERRED','EXPIRED','REPATRIATED'].map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>
            ) : (
              <>
                <div className="detail-row"><span className="detail-label">Passport No.</span><span className="detail-val" style={{ fontFamily: 'monospace' }}>{expat.passportNo}</span></div>
                <div className="detail-row"><span className="detail-label">Nationality</span><span className="detail-val">{expat.nationality}</span></div>
                <div className="detail-row"><span className="detail-label">Date of Birth</span><span className="detail-val">{expat.dateOfBirth || '—'}</span></div>
                <div className="detail-row"><span className="detail-label">Phone</span><span className="detail-val">{expat.phone || '—'}</span></div>
              </>
            )}
          </div>
          {/* Assignment */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: '20px 24px' }}>
            <div className="detail-section-title">Current Assignment</div>
            {editing ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {isManager ? (
                  <>
                    <div><label className="form-label">Client</label>
                      <select className="form-input" value={editForm.clientId || ''} onChange={e => setEditForm(f => ({ ...f, clientId: e.target.value }))}>
                        <option value="">— Unassigned —</option>
                        {clientList?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                    <div><label className="form-label">Dormitory</label>
                      <select className="form-input" value={editForm.dormitoryId} onChange={e => setEditForm(f => ({ ...f, dormitoryId: e.target.value }))}>
                        <option value="">— None —</option>
                        {dormList?.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                      </select>
                    </div>
                  </>
                ) : (
                  <div style={{ padding: '10px 12px', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', fontSize: 12, color: 'var(--text3)' }}>
                    To change Client or Dormitory, use <strong>Request Transfer</strong>.
                  </div>
                )}
              </div>
            ) : (
              <>
                <div className="detail-row"><span className="detail-label">Client</span><span className="detail-val">{expat.client?.name || '—'}</span></div>
                <div className="detail-row"><span className="detail-label">Dormitory</span><span className="detail-val">{expat.dormitory?.name || '—'}</span></div>
                <div className="detail-row"><span className="detail-label">Permit Expiry</span>
                  <span className={`detail-val ${getExpiryClass(permitDays, appSettings?.docAlertDays1 ?? 30, appSettings?.docAlertDays2 ?? 7)}`}>
                    {expat.permitExpiry ? formatDate(expat.permitExpiry) : '—'}
                    {permitDays !== null && permitDays <= (appSettings?.docAlertDays1 ?? 30) && ` (${permitDays <= 0 ? 'expired' : `${permitDays}d`})`}
                  </span>
                </div>
                <div className="detail-row"><span className="detail-label">Expat No.</span><span className="detail-val" style={{ fontFamily: 'monospace', fontSize: 12 }}>{expat.expatNo}</span></div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Documents ── */}
      {tab === 'Documents' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginBottom: 12 }}>
            <button className="btn btn-outline" onClick={() => {
              if (docs?.length) {
                docsApi.bulkDownload(docs.map(d => d.id)).then(({ data }) => {
                  const url = URL.createObjectURL(new Blob([data], { type: 'application/zip' }));
                  const a = document.createElement('a'); a.href = url; a.download = 'documents.zip'; a.click();
                  URL.revokeObjectURL(url);
                });
              }
            }}>
              <Download size={14} /> Download All (ZIP)
            </button>
            <button className="btn btn-primary" onClick={() => setShowUpload(true)}>
              <Upload size={14} /> Upload Document
            </button>
          </div>
          <div className="table-card">
            {!docs?.length && <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text3)' }}>No documents uploaded yet.</div>}
            {docs?.map((doc, i) => {
              const days = daysUntil(doc.expiryDate);
              return (
                <div key={doc.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: i < docs.length - 1 ? '1px solid var(--border)' : 'none' }}>
                  <div style={{ width: 36, height: 36, background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>
                    {doc.mimeType?.includes('pdf') ? '📄' : '🖼️'}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{doc.originalName}</div>
                    <div style={{ fontSize: 11, color: days !== null && days <= (appSettings?.docAlertDays1 ?? 30) ? (days <= (appSettings?.docAlertDays2 ?? 7) ? 'var(--red)' : 'var(--accent2)') : 'var(--text3)', marginTop: 2 }}>
                      {doc.documentType} · {formatFileSize(doc.fileSizeBytes)}
                      {doc.expiryDate && ` · Expires ${formatDate(doc.expiryDate)}`}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="btn btn-outline btn-sm" onClick={() => setPreviewDoc(doc)}>View</button>
                    <button className="btn btn-outline btn-sm" onClick={() => downloadDoc(doc)}>Download</button>
                  </div>
                </div>
              );
            })}
          </div>
          {showUpload && <DocumentUploadDialog entityType="EXPAT" entityId={id} onClose={() => setShowUpload(false)} />}
          {previewDoc && <DocumentPreviewModal doc={previewDoc} onClose={() => setPreviewDoc(null)} />}
        </div>
      )}

      {/* ── Checklists ── */}
      {tab === 'Checklists' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
            <button className="btn btn-primary" onClick={() => setShowChecklist(true)}>
              <Plus size={14} /> Assign Checklist
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {!checklists?.length && <div style={{ textAlign: 'center', padding: 32, color: 'var(--text3)' }}>No checklists assigned.</div>}
            {checklists?.map(cl => <ChecklistCard key={cl.id} checklist={cl} entityType="EXPAT" entityId={id} />)}
          </div>
          {showChecklist && <AssignChecklistDialog entityType="EXPAT" entityId={id} onClose={() => setShowChecklist(false)} />}
        </div>
      )}

      {/* ── Transfers ── */}
      {tab === 'Transfers' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
            <button className="btn btn-primary" onClick={() => setShowTransfer(true)}>
              <Plus size={14} /> Request Transfer
            </button>
          </div>
          <div style={{ borderLeft: '2px solid var(--border)', paddingLeft: 14 }}>
            {!expat.transfers?.length && <div style={{ color: 'var(--text3)', fontSize: 13, padding: '8px 0' }}>No transfer history.</div>}
            {expat.transfers?.map(t => (
              <div key={t.id} className="transfer-item">
                <div style={{ fontSize: 10, color: 'var(--text3)', marginBottom: 3 }}>{formatDate(t.createdAt)} · <StatusBadge status={t.status} /></div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>
                  {[t.fromDormitory?.name, t.toDormitory?.name].filter(Boolean).join(' → ') ||
                   [t.fromClient?.name, t.toClient?.name].filter(Boolean).join(' → ')}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 1 }}>{t.reason}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Transfer Modal */}
      {showTransfer && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowTransfer(false)}>
          <div className="modal">
            <div className="modal-header">
              <h3 style={{ fontFamily: 'Instrument Serif, serif', fontSize: 18 }}>Request Transfer</h3>
              <button onClick={() => setShowTransfer(false)} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: 'var(--text3)' }}>×</button>
            </div>
            <form onSubmit={handleTransfer}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {requiresApproval ? (
                  <div style={{ background: 'var(--amber-light)', border: '1px solid rgba(138,98,0,0.2)', borderRadius: 'var(--r-sm)', padding: '10px 12px', fontSize: 12, color: 'var(--amber)' }}>
                    ⚠ Transfer requires Manager approval before taking effect
                  </div>
                ) : (
                  <div style={{ background: 'rgba(0,160,90,0.07)', border: '1px solid rgba(0,160,90,0.2)', borderRadius: 'var(--r-sm)', padding: '10px 12px', fontSize: 12, color: 'var(--green)' }}>
                    ✓ Transfers are set to auto-approve — this will take effect immediately
                  </div>
                )}
                <div>
                  <label className="form-label">New Client</label>
                  <select className="form-input" value={transferForm.toClientId} onChange={e => setTransferForm(f => ({ ...f, toClientId: e.target.value }))}>
                    <option value="">— No change —</option>
                    {clientList?.filter(c => c.id !== expat.clientId).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="form-label">New Dormitory</label>
                  <select className="form-input" value={transferForm.toDormitoryId} onChange={e => setTransferForm(f => ({ ...f, toDormitoryId: e.target.value }))}>
                    <option value="">— No change —</option>
                    {dormList?.filter(d => d.id !== expat.dormitoryId).map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="form-label">Reason <span style={{ color: 'var(--accent2)' }}>*</span></label>
                  <textarea className="form-input" rows={3} required placeholder="Reason for transfer…"
                    value={transferForm.reason} onChange={e => setTransferForm(f => ({ ...f, reason: e.target.value }))} />
                </div>
                <div>
                  <label className="form-label">Effective Date</label>
                  <input type="date" className="form-input" value={transferForm.effectiveDate} onChange={e => setTransferForm(f => ({ ...f, effectiveDate: e.target.value }))} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowTransfer(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={transferSaving}>
                  {transferSaving ? 'Applying…' : requiresApproval ? 'Submit for Approval' : 'Apply Transfer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {confirmTransfer && (
        <div className="modal-overlay" onClick={() => setConfirmTransfer(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 380 }}>
            <div className="modal-header">
              <h3 style={{ fontFamily: 'Instrument Serif, serif', fontSize: 17 }}>Confirm Transfer</h3>
              <button onClick={() => setConfirmTransfer(false)} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: 'var(--text3)' }}>×</button>
            </div>
            <div className="modal-body" style={{ fontSize: 13, color: 'var(--text2)', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <p>This transfer will be <strong>applied immediately</strong> without requiring approval.</p>
              <p>Are you sure you want to proceed?</p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setConfirmTransfer(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={submitTransfer} disabled={transferSaving}>
                {transferSaving ? 'Applying…' : 'Yes, Apply Now'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
