import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Download, Upload, Plus, CheckCircle, XCircle, ArrowRight } from 'lucide-react';
import { expatsApi, checklistsApi, documentsApi, transfersApi, clientsApi, dormitoriesApi } from '../../../api/index.js';
import { DocumentUploadDialog } from '../../../components/shared/DocumentUploadDialog.jsx';
import { AssignChecklistDialog } from '../../../components/shared/AssignChecklistDialog.jsx';
import { ChecklistCard } from '../../../components/shared/ChecklistCard.jsx';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../../components/ui/tabs.jsx';
import { Button } from '../../../components/ui/button.jsx';
import { Badge } from '../../../components/ui/badge.jsx';
import { Card, CardContent } from '../../../components/ui/card.jsx';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../../components/ui/dialog.jsx';
import { Input } from '../../../components/ui/input.jsx';
import { Label } from '../../../components/ui/label.jsx';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../../../components/ui/select.jsx';
import { Skeleton } from '../../../components/ui/skeleton.jsx';
import { StatusBadge } from '../../../components/shared/StatusBadge.jsx';
import { useToast } from '../../../components/ui/toast.jsx';
import { useAuthStore } from '../../../store/authStore.js';
import { formatDate, daysUntil } from '../../../lib/utils.js';



export default function ExpatDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const user = useAuthStore(s => s.user);
  const canApprove = user?.role === 'SUPER_ADMIN' || user?.role === 'MANAGER';
  const [showUpload, setShowUpload] = useState(false);
  const [showAssignChecklist, setShowAssignChecklist] = useState(false);
  const [showCreateTransfer, setShowCreateTransfer] = useState(false);
  const [showReject, setShowReject] = useState(false);
  const [rejectTargetId, setRejectTargetId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [transferForm, setTransferForm] = useState({ toDormitoryId: '', toClientId: '', reason: '', effectiveDate: '' });

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

  const { data: dormitories } = useQuery({
    queryKey: ['dorms-all'],
    queryFn: () => dormitoriesApi.list({}),
    enabled: showCreateTransfer,
  });

  const { data: clients } = useQuery({
    queryKey: ['clients-all'],
    queryFn: () => clientsApi.list({}),
    enabled: showCreateTransfer,
  });

  const qc = useQueryClient();

  const approveMutation = useMutation({
    mutationFn: transfersApi.approve,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expat-transfers', id] });
      qc.invalidateQueries({ queryKey: ['transfers'] });
      toast({ title: 'Transfer approved', type: 'success' });
    },
    onError: (err) => toast({ title: 'Error', description: err.response?.data?.error, type: 'error' }),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ tid, reason }) => transfersApi.reject(tid, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expat-transfers', id] });
      qc.invalidateQueries({ queryKey: ['transfers'] });
      setShowReject(false);
      setRejectReason('');
      setRejectTargetId(null);
      toast({ title: 'Transfer rejected', type: 'success' });
    },
    onError: (err) => toast({ title: 'Error', description: err.response?.data?.error, type: 'error' }),
  });

  const createTransferMutation = useMutation({
    mutationFn: (form) => transfersApi.create({ ...form, expatId: id }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expat-transfers', id] });
      qc.invalidateQueries({ queryKey: ['transfers'] });
      setShowCreateTransfer(false);
      setTransferForm({ toDormitoryId: '', toClientId: '', reason: '', effectiveDate: '' });
      toast({ title: 'Transfer request submitted', type: 'success' });
    },
    onError: (err) => toast({ title: 'Error', description: err.response?.data?.error, type: 'error' }),
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', display: 'flex' }}>
          <ArrowLeft size={18} />
        </button>
        <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--accent-light)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 600 }}>
          {(expat.fullName || 'E').split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase()}
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontFamily: "'Instrument Serif', serif", fontSize: 20, color: 'var(--text)' }}>{expat.fullName || 'Expat'}</span>
            {expat.expatNo && (
              <span style={{ fontFamily: 'monospace', fontSize: 11, fontWeight: 600, color: 'var(--text3)', background: 'var(--surface2)', padding: '2px 8px', borderRadius: 4 }}>
                {expat.expatNo}
              </span>
            )}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 3, display: 'flex', gap: 8 }}>
            <span>{expat.nationality}</span>
            <span>·</span>
            <span>Permit expires {formatDate(expat.permitExpiry)}</span>
          </div>
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
          <div className="table-card">
            <div style={{ padding: 0 }}>
              {[
                ['Passport No', expat.passportNo],
                ['Phone', expat.phone],
                ['Date of Birth', expat.dateOfBirth],
                ['Nationality', expat.nationality],
                ['Permit Expiry', formatDate(expat.permitExpiry)],
                ['Client', expat.client?.name],
                ['Dormitory', expat.dormitory?.name],
              ].map(([label, val]) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 16px', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ fontSize: 12, color: 'var(--text3)' }}>{label}</span>
                  <span style={{ fontSize: 12, color: 'var(--text)', fontWeight: 500, textAlign: 'right' }}>{val || '—'}</span>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 16px' }}>
                <span style={{ fontSize: 12, color: 'var(--text3)' }}>Status</span>
                <StatusBadge status={expat.status} />
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="checklists">
          <div className="space-y-4">
            <div className="flex justify-end">
              <Button size="sm" onClick={() => setShowAssignChecklist(true)}>
                <Upload size={14} /> Assign Checklist
              </Button>
            </div>
            {checklistList.map(cl => (
              <ChecklistCard key={cl.id} checklist={cl} queryKey={['checklists', id]} />
            ))}
            {checklistList.length === 0 && (
              <p className="text-sm text-slate-400 py-8 text-center">No checklists found.</p>
            )}
          </div>
          <AssignChecklistDialog
            open={showAssignChecklist}
            onOpenChange={setShowAssignChecklist}
            entityType="EXPAT"
            entityId={id}
            queryKey={['checklists', id]}
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
            <div className="flex justify-end">
              <Button size="sm" onClick={() => setShowCreateTransfer(true)}>
                <Plus size={14} /> Request Transfer
              </Button>
            </div>

            {transferList.map(t => (
              <Card key={t.id}>
                <CardContent className="pt-4 space-y-3">
                  {/* Header row */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{t.reason}</p>
                      <p className="text-xs text-slate-400">Requested {formatDate(t.createdAt)}</p>
                    </div>
                    <StatusBadge status={t.status} />
                  </div>

                  {/* From → To rows */}
                  <div className="grid grid-cols-1 gap-1.5 text-xs text-slate-600">
                    {(t.fromDormitory || t.toDormitory) && (
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-slate-500 w-20 shrink-0">Dormitory</span>
                        <span>{t.fromDormitory?.name || '—'}</span>
                        <ArrowRight size={12} className="text-slate-400 shrink-0" />
                        <span className={t.toDormitory ? 'font-medium text-slate-800' : ''}>{t.toDormitory?.name || '—'}</span>
                      </div>
                    )}
                    {(t.fromClient || t.toClient) && (
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-slate-500 w-20 shrink-0">Client</span>
                        <span>{t.fromClient?.name || '—'}</span>
                        <ArrowRight size={12} className="text-slate-400 shrink-0" />
                        <span className={t.toClient ? 'font-medium text-slate-800' : ''}>{t.toClient?.name || '—'}</span>
                      </div>
                    )}
                    {t.effectiveDate && (
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-slate-500 w-20 shrink-0">Effective</span>
                        <span>{formatDate(t.effectiveDate)}</span>
                      </div>
                    )}
                  </div>

                  {/* Approval / rejection info */}
                  {t.status === 'APPROVED' && t.approvedAt && (
                    <p className="text-xs text-green-600">Approved {formatDate(t.approvedAt)}</p>
                  )}
                  {t.status === 'REJECTED' && (
                    <div className="text-xs text-red-600 space-y-0.5">
                      <p>Rejected: {t.rejectedReason || '—'}</p>
                    </div>
                  )}

                  {/* Approve / Reject actions */}
                  {t.status === 'PENDING' && canApprove && (
                    <div className="flex gap-2 pt-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-green-600 hover:text-green-700 hover:bg-green-50"
                        onClick={() => approveMutation.mutate(t.id)}
                        disabled={approveMutation.isPending}
                      >
                        <CheckCircle size={14} /> Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => { setRejectTargetId(t.id); setShowReject(true); }}
                      >
                        <XCircle size={14} /> Reject
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}

            {transferList.length === 0 && (
              <p className="text-sm text-slate-400 py-8 text-center">No transfers yet.</p>
            )}
          </div>

          {/* Create Transfer Dialog */}
          <Dialog open={showCreateTransfer} onOpenChange={setShowCreateTransfer}>
            <DialogContent className="max-w-md">
              <DialogHeader><DialogTitle>Request Transfer</DialogTitle></DialogHeader>
              <form
                onSubmit={e => { e.preventDefault(); createTransferMutation.mutate(transferForm); }}
                className="px-5 space-y-3"
              >
                <div className="space-y-1">
                  <Label>Transfer To Dormitory</Label>
                  <Select value={transferForm.toDormitoryId} onValueChange={v => setTransferForm(p => ({ ...p, toDormitoryId: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select dormitory (optional)" /></SelectTrigger>
                    <SelectContent>
                      {(dormitories?.data || dormitories || []).map(d => (
                        <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Transfer To Client</Label>
                  <Select value={transferForm.toClientId} onValueChange={v => setTransferForm(p => ({ ...p, toClientId: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select client (optional)" /></SelectTrigger>
                    <SelectContent>
                      {(clients?.data || clients || []).map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Reason <span className="text-red-500">*</span></Label>
                  <Input
                    value={transferForm.reason}
                    onChange={e => setTransferForm(p => ({ ...p, reason: e.target.value }))}
                    placeholder="Reason for transfer"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label>Effective Date</Label>
                  <Input
                    type="date"
                    value={transferForm.effectiveDate}
                    onChange={e => setTransferForm(p => ({ ...p, effectiveDate: e.target.value }))}
                  />
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setShowCreateTransfer(false)}>Cancel</Button>
                  <Button type="submit" disabled={createTransferMutation.isPending}>
                    {createTransferMutation.isPending ? 'Submitting...' : 'Submit Request'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          {/* Reject Dialog */}
          <Dialog open={showReject} onOpenChange={v => { setShowReject(v); if (!v) { setRejectReason(''); setRejectTargetId(null); } }}>
            <DialogContent className="max-w-sm">
              <DialogHeader><DialogTitle>Reject Transfer</DialogTitle></DialogHeader>
              <div className="px-5 space-y-3">
                <Label>Rejection Reason</Label>
                <Input
                  value={rejectReason}
                  onChange={e => setRejectReason(e.target.value)}
                  placeholder="Provide a reason"
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => { setShowReject(false); setRejectReason(''); setRejectTargetId(null); }}>Cancel</Button>
                <Button
                  variant="destructive"
                  onClick={() => rejectMutation.mutate({ tid: rejectTargetId, reason: rejectReason })}
                  disabled={!rejectReason.trim() || rejectMutation.isPending}
                >
                  {rejectMutation.isPending ? 'Rejecting...' : 'Reject'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>
      </Tabs>
    </div>
  );
}
