import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Download, Upload } from 'lucide-react';
import { dormitoriesApi, checklistsApi, documentsApi } from '../../../api/index.js';
import { DocumentUploadDialog } from '../../../components/shared/DocumentUploadDialog.jsx';
import { AssignChecklistDialog } from '../../../components/shared/AssignChecklistDialog.jsx';
import { ChecklistCard } from '../../../components/shared/ChecklistCard.jsx';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../../components/ui/tabs.jsx';
import { Button } from '../../../components/ui/button.jsx';
import { Badge } from '../../../components/ui/badge.jsx';
import { Card, CardContent } from '../../../components/ui/card.jsx';
import { Progress } from '../../../components/ui/progress.jsx';
import { Skeleton } from '../../../components/ui/skeleton.jsx';
import { StatusBadge } from '../../../components/shared/StatusBadge.jsx';
import { DataTable } from '../../../components/shared/DataTable.jsx';
import { useToast } from '../../../components/ui/toast.jsx';
import { formatDate, daysUntil } from '../../../lib/utils.js';

export default function DormitoryDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [showUpload, setShowUpload] = useState(false);
  const [showAssignChecklist, setShowAssignChecklist] = useState(false);

  const { data: dorm, isLoading } = useQuery({
    queryKey: ['dormitory', id],
    queryFn: () => dormitoriesApi.get(id),
  });

  const { data: occupants } = useQuery({
    queryKey: ['dorm-occupants', id],
    queryFn: () => dormitoriesApi.occupants(id),
  });

  const { data: checklists } = useQuery({
    queryKey: ['dorm-checklists', id],
    queryFn: () => checklistsApi.list({ entityType: 'DORMITORY', entityId: id }),
  });

  const { data: documents } = useQuery({
    queryKey: ['dorm-documents', id],
    queryFn: () => documentsApi.list({ entityType: 'DORMITORY', entityId: id }),
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!dorm) return <p className="text-slate-500">Dormitory not found.</p>;

  const occupantList = occupants?.data || occupants || [];
  const checklistList = checklists?.data || (Array.isArray(checklists) ? checklists : []);
  const documentList = documents?.data || (Array.isArray(documents) ? documents : []);

  const pct = dorm.capacity
    ? Math.round(((dorm.occupantCount || 0) / dorm.capacity) * 100)
    : 0;

  const occupantColumns = [
    {
      key: 'fullName',
      header: 'Name',
      render: (v) => <span className="font-medium text-slate-800">{v || '—'}</span>,
    },
    { key: 'nationality', header: 'Nationality' },
    { key: 'status', header: 'Status', render: (v) => <StatusBadge status={v} /> },
    { key: 'permitExpiry', header: 'Permit Expiry', render: (v) => formatDate(v) },
  ];

  async function downloadDoc(doc) {
    try {
      const blob = await documentsApi.download(doc.id);
      const url = URL.createObjectURL(blob);
      const a = Object.assign(document.createElement('a'), { href: url, download: doc.documentType });
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast({ title: 'Download failed', type: 'error' });
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', display: 'flex' }}>
          <ArrowLeft size={18} />
        </button>
        <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--accent2-light)', color: 'var(--accent2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 600 }}>
          {(dorm.name || 'D').split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase()}
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontFamily: "'Instrument Serif', serif", fontSize: 20, color: 'var(--text)' }}>{dorm.name || 'Dormitory'}</span>
            {dorm.dormitoryNo && (
              <span style={{ fontFamily: 'monospace', fontSize: 11, fontWeight: 600, color: 'var(--text3)', background: 'var(--surface2)', padding: '2px 8px', borderRadius: 4 }}>
                {dorm.dormitoryNo}
              </span>
            )}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 3 }}>{dorm.address}</div>
        </div>
        <span className={`badge-dot ${pct >= 100 ? 'badge-expired' : pct >= 80 ? 'badge-pending' : 'badge-active'}`}>
          {dorm.occupantCount || 0}/{dorm.capacity || 0} occupied
        </span>
      </div>

      <Tabs defaultValue="info">
        <TabsList>
          <TabsTrigger value="info">Info</TabsTrigger>
          <TabsTrigger value="occupants">Occupants ({Array.isArray(occupantList) ? occupantList.length : 0})</TabsTrigger>
          <TabsTrigger value="checklists">Checklists ({checklistList.length})</TabsTrigger>
          <TabsTrigger value="documents">Documents ({documentList.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="info">
          <div className="table-card">
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--text3)', marginBottom: 8 }}>Occupancy</div>
              <div style={{ background: 'var(--surface3)', borderRadius: 4, height: 5, marginBottom: 6 }}>
                <div style={{ width: `${pct}%`, height: 5, borderRadius: 4, background: pct >= 90 ? 'var(--accent2)' : 'var(--accent)', transition: 'width 0.4s' }} />
              </div>
              <div style={{ fontSize: 11, color: 'var(--text3)' }}>{dorm.occupantCount || 0} of {dorm.capacity || 0} spots filled ({pct}%)</div>
            </div>
            {[
              ['Address', dorm.address],
              ['Contact Person', dorm.contactPerson || dorm.pic],
              ['Contact Phone', dorm.contactPhone],
              ['State', dorm.state],
              ['Notes', dorm.notes],
            ].map(([label, val]) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 16px', borderBottom: '1px solid var(--border)' }}>
                <span style={{ fontSize: 12, color: 'var(--text3)' }}>{label}</span>
                <span style={{ fontSize: 12, color: 'var(--text)', fontWeight: 500 }}>{val || '—'}</span>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="occupants">
          <DataTable
            columns={occupantColumns}
            data={Array.isArray(occupantList) ? occupantList : []}
            emptyState="No occupants in this dormitory."
          />
        </TabsContent>

        <TabsContent value="checklists">
          <div className="space-y-3">
            <div className="flex justify-end">
              <Button size="sm" onClick={() => setShowAssignChecklist(true)}>
                <Upload size={14} /> Assign Checklist
              </Button>
            </div>
            {checklistList.map(cl => (
              <ChecklistCard key={cl.id} checklist={cl} queryKey={['dorm-checklists', id]} />
            ))}
            {checklistList.length === 0 && (
              <p className="text-sm text-slate-400 py-8 text-center">No checklists found.</p>
            )}
          </div>
          <AssignChecklistDialog
            open={showAssignChecklist}
            onOpenChange={setShowAssignChecklist}
            entityType="DORMITORY"
            entityId={id}
            queryKey={['dorm-checklists', id]}
          />
        </TabsContent>

        <TabsContent value="documents">
          <div className="space-y-3">
            <div className="flex justify-end">
              <Button size="sm" onClick={() => setShowUpload(true)}>
                <Upload size={14} /> Upload Document
              </Button>
            </div>
            {documentList.map(doc => {
              const days = daysUntil(doc.expiryDate);
              return (
                <Card key={doc.id}>
                  <CardContent className="pt-4 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-800">{doc.documentType}</p>
                      <p className="text-xs text-slate-500 flex items-center gap-1">
                        Expires {formatDate(doc.expiryDate)}
                        {days !== null && days <= 30 && (
                          <Badge variant={days <= 0 ? 'destructive' : 'warning'}>
                            {days <= 0 ? 'Expired' : `${days}d`}
                          </Badge>
                        )}
                      </p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => downloadDoc(doc)}>
                      <Download size={14} />
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
            {documentList.length === 0 && (
              <p className="text-sm text-slate-400 py-8 text-center">No documents uploaded yet.</p>
            )}
          </div>
          <DocumentUploadDialog
            open={showUpload}
            onOpenChange={setShowUpload}
            entityType="DORMITORY"
            entityId={id}
            queryKey={['dorm-documents', id]}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
