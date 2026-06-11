import { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Eye, EyeOff, Download, Check, X, Upload } from 'lucide-react';
import { expatsApi, checklistsApi, documentsApi } from '../../../api/index.js';
import { DocumentUploadDialog } from '../../../components/shared/DocumentUploadDialog.jsx';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../../components/ui/tabs.jsx';
import { Button } from '../../../components/ui/button.jsx';
import { Badge } from '../../../components/ui/badge.jsx';
import { Progress } from '../../../components/ui/progress.jsx';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card.jsx';
import { Skeleton } from '../../../components/ui/skeleton.jsx';
import { StatusBadge } from '../../../components/shared/StatusBadge.jsx';
import { useToast } from '../../../components/ui/toast.jsx';
import { formatDate, daysUntil } from '../../../lib/utils.js';

function RevealField({ expatId, fieldName, label }) {
  const { toast } = useToast();
  const [value, setValue] = useState(null);
  const timerRef = useRef(null);

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  function hide() {
    setValue(null);
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
  }

  async function reveal() {
    try {
      const res = await expatsApi.revealField(expatId, fieldName);
      if (!res.value) return;
      setValue(res.value);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(hide, 10000);
    } catch {
      toast({ title: 'Failed to reveal field', type: 'error' });
    }
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-sm font-medium text-slate-700">{label}:</span>
      {value ? (
        <span className="text-sm font-mono bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
          {value} <span className="text-xs text-amber-600">(hides in 10s)</span>
        </span>
      ) : (
        <span className="text-sm text-slate-400 font-mono">locked ••••••••</span>
      )}
      <button
        onClick={value ? hide : reveal}
        className="text-xs text-[var(--accent)] hover:underline flex items-center gap-1"
      >
        {value ? <EyeOff size={12} /> : <Eye size={12} />}
        {value ? 'Hide' : 'Reveal'}
      </button>
    </div>
  );
}

function ChecklistCard({ checklist, expatId }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const done = checklist.items?.filter(i => i.status === 'DONE' || i.status === 'WAIVED').length ?? 0;
  const total = checklist.items?.length ?? 0;
  const pct = total ? Math.round((done / total) * 100) : 0;

  const updateItem = useMutation({
    mutationFn: ({ itemId, data }) => checklistsApi.updateItem(checklist.id, itemId, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['checklists', expatId] }); },
    onError: (err) => toast({ title: 'Error', description: err.response?.data?.error, type: 'error' }),
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">{checklist.name}</CardTitle>
          <StatusBadge status={checklist.status} />
        </div>
        <div className="space-y-1">
          <Progress value={pct} />
          <p className="text-xs text-slate-500">{done}/{total} items complete</p>
        </div>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {checklist.items?.map(item => (
            <li
              key={item.id}
              className={`flex items-start gap-3 rounded-md p-2 ${
                item.overdueSince && item.status === 'PENDING'
                  ? 'bg-amber-50 border border-amber-200'
                  : 'bg-slate-50'
              }`}
            >
              <div className="flex-1">
                <p className={`text-sm ${item.status === 'DONE' ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                  {item.itemText}
                </p>
                {item.notes && (
                  <p className="text-xs italic text-slate-400 mt-0.5">{item.notes}</p>
                )}
                {item.overdueSince && item.status === 'PENDING' && (
                  <p className="text-xs text-amber-600 mt-0.5">
                    Overdue since {formatDate(item.overdueSince)}
                  </p>
                )}
                {item.completedAt && (
                  <p className="text-xs text-slate-400 mt-0.5">
                    Completed {formatDate(item.completedAt)}
                  </p>
                )}
              </div>
              {item.status === 'PENDING' && (
                <div className="flex gap-1 shrink-0">
                  <button
                    onClick={() => updateItem.mutate({ itemId: item.id, data: { status: 'DONE' } })}
                    className="h-7 w-7 rounded bg-green-100 text-green-700 hover:bg-green-200 flex items-center justify-center"
                  >
                    <Check size={12} />
                  </button>
                  <button
                    onClick={() => updateItem.mutate({ itemId: item.id, data: { status: 'WAIVED', waivedReason: 'Waived by user' } })}
                    className="h-7 w-7 rounded bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center"
                  >
                    <X size={12} />
                  </button>
                </div>
              )}
            </li>
          ))}
          {(!checklist.items || checklist.items.length === 0) && (
            <li className="text-sm text-slate-400 text-center py-4">No items in this checklist.</li>
          )}
        </ul>
      </CardContent>
    </Card>
  );
}

export default function ExpatDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [showUpload, setShowUpload] = useState(false);

  const { data: expat, isLoading } = useQuery({
    queryKey: ['expat', id],
    queryFn: () => expatsApi.get(id),
  });

  const { data: checklists } = useQuery({
    queryKey: ['checklists', id],
    queryFn: () => checklistsApi.list({ entityType: 'EXPAT', entityId: id }),
  });

  const { data: documents } = useQuery({
    queryKey: ['documents', id],
    queryFn: () => documentsApi.list({ entityType: 'EXPAT', entityId: id }),
  });

  const { data: transfers } = useQuery({
    queryKey: ['expat-transfers', id],
    queryFn: () => expatsApi.transfers(id),
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!expat) return <p className="text-slate-500">Expat not found.</p>;

  const checklistList = checklists?.data || (Array.isArray(checklists) ? checklists : []);
  const documentList = documents?.data || (Array.isArray(documents) ? documents : []);
  const transferList = transfers?.data || (Array.isArray(transfers) ? transfers : []);

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
          <h1 className="text-xl font-semibold text-slate-900">{expat.fullName || 'Expat'}</h1>
          <p className="text-sm text-slate-500">
            {expat.nationality} · Permit expires {formatDate(expat.permitExpiry)}
          </p>
        </div>
        <StatusBadge status={expat.status} />
      </div>

      <Tabs defaultValue="info">
        <TabsList>
          <TabsTrigger value="info">Info</TabsTrigger>
          <TabsTrigger value="checklists">Checklists ({checklistList.length})</TabsTrigger>
          <TabsTrigger value="documents">Documents ({documentList.length})</TabsTrigger>
          <TabsTrigger value="transfers">Transfers ({transferList.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="info">
          <Card>
            <CardContent className="pt-4 space-y-3">
              <RevealField expatId={id} fieldName="passportNo" label="Passport No" />
              <RevealField expatId={id} fieldName="phone" label="Phone" />
              <RevealField expatId={id} fieldName="dateOfBirth" label="Date of Birth" />
              <div className="text-sm">
                <span className="font-medium text-slate-700">Nationality:</span>
                <span className="text-slate-600 ml-1">{expat.nationality || '—'}</span>
              </div>
              <div className="text-sm">
                <span className="font-medium text-slate-700">Permit Expiry:</span>
                <span className="text-slate-600 ml-1">{formatDate(expat.permitExpiry)}</span>
              </div>
              <div className="text-sm flex items-center gap-2">
                <span className="font-medium text-slate-700">Status:</span>
                <StatusBadge status={expat.status} />
              </div>
              {expat.client && (
                <div className="text-sm">
                  <span className="font-medium text-slate-700">Client:</span>
                  <span className="text-slate-600 ml-1">{expat.client.name}</span>
                </div>
              )}
              {expat.dormitory && (
                <div className="text-sm">
                  <span className="font-medium text-slate-700">Dormitory:</span>
                  <span className="text-slate-600 ml-1">{expat.dormitory.name}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="checklists">
          <div className="space-y-4">
            {checklistList.map(cl => (
              <ChecklistCard key={cl.id} checklist={cl} expatId={id} />
            ))}
            {checklistList.length === 0 && (
              <p className="text-sm text-slate-400 py-8 text-center">No checklists found.</p>
            )}
          </div>
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
                          <Badge variant={days <= 0 ? 'destructive' : days <= 7 ? 'destructive' : 'warning'}>
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
            entityType="EXPAT"
            entityId={id}
            queryKey={['documents', id]}
          />
        </TabsContent>

        <TabsContent value="transfers">
          <div className="space-y-3">
            {transferList.map(t => (
              <Card key={t.id}>
                <CardContent className="pt-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{t.reason || 'Transfer'}</p>
                    <p className="text-xs text-slate-500">{formatDate(t.createdAt)}</p>
                  </div>
                  <StatusBadge status={t.status} />
                </CardContent>
              </Card>
            ))}
            {transferList.length === 0 && (
              <p className="text-sm text-slate-400 py-8 text-center">No transfers.</p>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
