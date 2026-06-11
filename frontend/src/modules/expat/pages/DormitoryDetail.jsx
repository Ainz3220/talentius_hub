import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Download, Upload } from 'lucide-react';
import { dormitoriesApi, checklistsApi, documentsApi } from '../../../api/index.js';
import { DocumentUploadDialog } from '../../../components/shared/DocumentUploadDialog.jsx';
import { AssignChecklistDialog } from '../../../components/shared/AssignChecklistDialog.jsx';
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
    <div className="space-y-6">
      <div className="flex items-center gap-3 flex-wrap">
        <button onClick={() => navigate(-1)} className="text-slate-500 hover:text-slate-700">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-xl font-semibold text-slate-900">{dorm.name || 'Dormitory'}</h1>
          <p className="text-sm text-slate-500">{dorm.address}</p>
        </div>
        <Badge variant={pct >= 100 ? 'destructive' : pct >= 80 ? 'warning' : 'success'}>
          {dorm.occupantCount || 0}/{dorm.capacity || 0} occupied
        </Badge>
      </div>

      <Tabs defaultValue="info">
        <TabsList>
          <TabsTrigger value="info">Info</TabsTrigger>
          <TabsTrigger value="occupants">Occupants ({Array.isArray(occupantList) ? occupantList.length : 0})</TabsTrigger>
          <TabsTrigger value="checklists">Checklists ({checklistList.length})</TabsTrigger>
          <TabsTrigger value="documents">Documents ({documentList.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="info">
          <Card>
            <CardContent className="pt-4 space-y-3">
              <div className="space-y-1">
                <p className="text-xs text-slate-500 uppercase tracking-wide">Occupancy</p>
                <div className="flex items-center gap-3">
                  <Progress value={pct} className="flex-1" />
                  <span className="text-sm font-medium">{pct}%</span>
                </div>
                <p className="text-xs text-slate-500">{dorm.occupantCount || 0} of {dorm.capacity || 0} spots filled</p>
              </div>
              {[
                ['address', 'Address'],
                ['contactPerson', 'Contact Person'],
                ['contactPhone', 'Contact Phone'],
                ['notes', 'Notes'],
              ].map(([k, l]) => dorm[k] ? (
                <div key={k} className="text-sm">
                  <span className="font-medium text-slate-700">{l}:</span>
                  <span className="text-slate-600 ml-1">{dorm[k]}</span>
                </div>
              ) : null)}
            </CardContent>
          </Card>
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
              <Card key={cl.id}>
                <CardContent className="pt-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{cl.name}</p>
                    <p className="text-xs text-slate-500">{cl.items?.length || 0} items</p>
                  </div>
                  <StatusBadge status={cl.status} />
                </CardContent>
              </Card>
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
