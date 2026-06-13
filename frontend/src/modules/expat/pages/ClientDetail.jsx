import { useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Upload, Plus, Download } from 'lucide-react';
import { clients as clientsApi, documents as docsApi, checklists as checklistApi } from '../../../api/index.js';
import StatusBadge from '../../../components/shared/StatusBadge.jsx';
import ChecklistCard from '../../../components/shared/ChecklistCard.jsx';
import DocumentUploadDialog from '../../../components/shared/DocumentUploadDialog.jsx';
import DocumentPreviewModal from '../../../components/shared/DocumentPreviewModal.jsx';
import AssignChecklistDialog from '../../../components/shared/AssignChecklistDialog.jsx';
import { getInitials, getAvatarColor, formatDate, formatFileSize, daysUntil } from '../../../lib/utils.js';

const TABS = ['Overview', 'Expats', 'Documents', 'Checklists'];

export default function ClientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tab, setTab] = useState('Overview');
  const [showUpload, setShowUpload] = useState(false);
  const [previewDoc, setPreviewDoc] = useState(null);
  const [showChecklist, setShowChecklist] = useState(false);

  const { data: client, isLoading } = useQuery({
    queryKey: ['client', id],
    queryFn: () => clientsApi.get(id).then(r => r.data),
  });

  const { data: docs } = useQuery({
    queryKey: ['documents', 'CLIENT', id],
    queryFn: () => docsApi.list({ entityType: 'CLIENT', entityId: id }).then(r => r.data),
    enabled: tab === 'Documents',
  });

  const { data: checklists } = useQuery({
    queryKey: ['checklists', 'CLIENT', id],
    queryFn: () => checklistApi.list({ entityType: 'CLIENT', entityId: id }).then(r => r.data),
    enabled: tab === 'Checklists',
  });

  async function downloadDoc(doc) {
    const { data } = await docsApi.download(doc.id);
    const url = URL.createObjectURL(new Blob([data]));
    const a = document.createElement('a');
    a.href = url; a.download = doc.originalName; a.click();
    URL.revokeObjectURL(url);
  }

  if (isLoading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text3)' }}>Loading…</div>;
  if (!client) return <div style={{ padding: 40 }}>Client not found.</div>;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
        <button className="btn btn-outline btn-sm" onClick={() => navigate('/clients')} style={{ padding: '5px 10px' }}>
          <ArrowLeft size={14} /> Back
        </button>
        <div className={`avatar ${getAvatarColor(client.name)}`} style={{ width: 44, height: 44, fontSize: 16 }}>{getInitials(client.name)}</div>
        <div>
          <div style={{ fontFamily: 'Instrument Serif, serif', fontSize: 22 }}>{client.name}</div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 3 }}>
            <StatusBadge status={client.type} />
            <StatusBadge status={client.status} />
            <span style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--text3)' }}>Client #{client.clientNo}</span>
          </div>
        </div>
      </div>

      <div className="tab-group" style={{ marginBottom: 20 }}>
        {TABS.map(t => <button key={t} className={`tab-item${tab===t?' active':''}`} onClick={() => setTab(t)}>{t}{t==='Expats'?` (${client.expats?.length||0})`:''}</button>)}
      </div>

      {tab === 'Overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: '20px 24px' }}>
            <div className="detail-section-title">Client Information</div>
            <div className="detail-row"><span className="detail-label">Name</span><span className="detail-val">{client.name}</span></div>
            <div className="detail-row"><span className="detail-label">Type</span><span className="detail-val"><StatusBadge status={client.type} /></span></div>
            <div className="detail-row"><span className="detail-label">Status</span><span className="detail-val"><StatusBadge status={client.status} /></span></div>
            <div className="detail-row"><span className="detail-label">Registration No.</span><span className="detail-val" style={{ fontFamily: 'monospace' }}>{client.registrationNo || '—'}</span></div>
            <div className="detail-row"><span className="detail-label">Contact</span><span className="detail-val">{client.contactName || '—'}</span></div>
            <div className="detail-row"><span className="detail-label">Address</span><span className="detail-val" style={{ textAlign: 'right', maxWidth: 200 }}>{client.address || '—'}</span></div>
          </div>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: '20px 24px' }}>
            <div className="detail-section-title">Assigned Dormitories</div>
            {!client.dormAssignments?.length && <div style={{ fontSize: 13, color: 'var(--text3)' }}>No dormitories assigned.</div>}
            {client.dormAssignments?.map(a => (
              <div key={a.id} className="detail-row">
                <span className="detail-label">{a.dormitory?.name}</span>
                <span style={{ fontSize: 11, color: 'var(--text3)' }}>Since {formatDate(a.assignedAt)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'Expats' && (
        <div className="table-card">
          <table>
            <thead><tr><th>Name</th><th>Nationality</th><th>Status</th><th>Dormitory</th></tr></thead>
            <tbody>
              {!client.expats?.length && <tr><td colSpan={4}><div className="empty-state"><div style={{ fontSize: 32, marginBottom: 12 }}>👤</div><div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text2)' }}>No expats for this client</div></div></td></tr>}
              {client.expats?.map(e => (
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
                  <td><StatusBadge status={e.status} /></td>
                  <td style={{ color: 'var(--text2)', fontSize: 12 }}>{e.dormitory?.name || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

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
            <button className="btn btn-primary" onClick={() => setShowUpload(true)}><Upload size={14} /> Upload</button>
          </div>
          <div className="table-card">
            {!docs?.length && <div style={{ padding: 32, textAlign: 'center', color: 'var(--text3)' }}>No documents uploaded.</div>}
            {docs?.map((doc, i) => (
              <div key={doc.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: i < docs.length - 1 ? '1px solid var(--border)' : 'none' }}>
                <div style={{ width: 36, height: 36, background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>
                  {doc.mimeType?.includes('pdf') ? '📄' : '🖼️'}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{doc.originalName}</div>
                  <div style={{ fontSize: 11, color: 'var(--text3)' }}>{doc.documentType} · {formatFileSize(doc.fileSizeBytes)}{doc.expiryDate ? ` · Expires ${formatDate(doc.expiryDate)}` : ''}</div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="btn btn-outline btn-sm" onClick={() => setPreviewDoc(doc)}>View</button>
                  <button className="btn btn-outline btn-sm" onClick={() => downloadDoc(doc)}>Download</button>
                </div>
              </div>
            ))}
          </div>
          {showUpload && <DocumentUploadDialog entityType="CLIENT" entityId={id} onClose={() => setShowUpload(false)} />}
          {previewDoc && <DocumentPreviewModal doc={previewDoc} onClose={() => setPreviewDoc(null)} />}
        </div>
      )}

      {tab === 'Checklists' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
            <button className="btn btn-primary" onClick={() => setShowChecklist(true)}><Plus size={14} /> Assign Checklist</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {!checklists?.length && <div style={{ textAlign: 'center', padding: 32, color: 'var(--text3)' }}>No checklists assigned.</div>}
            {checklists?.map(cl => <ChecklistCard key={cl.id} checklist={cl} entityType="CLIENT" entityId={id} />)}
          </div>
          {showChecklist && <AssignChecklistDialog entityType="CLIENT" entityId={id} onClose={() => setShowChecklist(false)} />}
        </div>
      )}
    </div>
  );
}
