import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Download, Upload } from 'lucide-react';
import { clientsApi, checklistsApi, documentsApi } from '../../../api/index.js';
import { DocumentUploadDialog } from '../../../components/shared/DocumentUploadDialog.jsx';
import { AssignChecklistDialog } from '../../../components/shared/AssignChecklistDialog.jsx';
import { ChecklistCard } from '../../../components/shared/ChecklistCard.jsx';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../../components/ui/tabs.jsx';
import { Button } from '../../../components/ui/button.jsx';
import { Badge } from '../../../components/ui/badge.jsx';
import { Card, CardContent } from '../../../components/ui/card.jsx';
import { Skeleton } from '../../../components/ui/skeleton.jsx';
import { StatusBadge } from '../../../components/shared/StatusBadge.jsx';
import { DataTable } from '../../../components/shared/DataTable.jsx';
import { useToast } from '../../../components/ui/toast.jsx';
import { formatDate, daysUntil } from '../../../lib/utils.js';


export default function ClientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [showUpload, setShowUpload] = useState(false);
  const [showAssignChecklist, setShowAssignChecklist] = useState(false);

  const { data: client, isLoading } = useQuery({
    queryKey: ['client', id],
    queryFn: () => clientsApi.get(id),
  });

  const { data: expats } = useQuery({
    queryKey: ['client-expats', id],
    queryFn: () => clientsApi.expats(id),
  });

  const { data: checklists } = useQuery({
    queryKey: ['client-checklists', id],
    queryFn: () => checklistsApi.list({ entityType: 'CLIENT', entityId: id }),
  });

  const { data: documents } = useQuery({
    queryKey: ['client-documents', id],
    queryFn: () => documentsApi.list({ entityType: 'CLIENT', entityId: id }),
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!client) return <p className="text-slate-500">Client not found.</p>;

  const expatList = expats?.data || expats || [];
  const checklistList = checklists?.data || (Array.isArray(checklists) ? checklists : []);
  const documentList = documents?.data || (Array.isArray(documents) ? documents : []);

  const expatColumns = [
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
          <h1 className="text-xl font-semibold text-slate-900">{client.name || 'Client'}</h1>
          <p className="text-sm text-slate-500">{client.type}</p>
        </div>
        <StatusBadge status={client.type} />
      </div>

      <Tabs defaultValue="info">
        <TabsList>
          <TabsTrigger value="info">Info</TabsTrigger>
          <TabsTrigger value="expats">Expats ({Array.isArray(expatList) ? expatList.length : 0})</TabsTrigger>
          <TabsTrigger value="checklists">Checklists ({checklistList.length})</TabsTrigger>
          <TabsTrigger value="documents">Documents ({documentList.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="info">
          <Card>
            <CardContent className="pt-4 space-y-3">
              <div className="text-sm">
                <span className="font-medium text-slate-700">Type:</span>
                <span className="ml-2"><StatusBadge status={client.type} /></span>
              </div>
              {[
                ['registrationNo', 'Registration No'],
                ['contactName', 'Contact Person'],
                ['contactEmail', 'Contact Email'],
                ['contactPhone', 'Contact Phone'],
                ['address', 'Address'],
              ].map(([k, l]) => (
                <div key={k} className="text-sm">
                  <span className="font-medium text-slate-700">{l}:</span>
                  <span className="text-slate-600 ml-1">{client[k] || '—'}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="expats">
          <DataTable
            columns={expatColumns}
            data={Array.isArray(expatList) ? expatList : []}
            emptyState="No expats assigned to this client."
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
              <ChecklistCard key={cl.id} checklist={cl} queryKey={['client-checklists', id]} />
            ))}
            {checklistList.length === 0 && (
              <p className="text-sm text-slate-400 py-8 text-center">No checklists found.</p>
            )}
          </div>
          <AssignChecklistDialog
            open={showAssignChecklist}
            onOpenChange={setShowAssignChecklist}
            entityType="CLIENT"
            entityId={id}
            queryKey={['client-checklists', id]}
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
            entityType="CLIENT"
            entityId={id}
            queryKey={['client-documents', id]}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
