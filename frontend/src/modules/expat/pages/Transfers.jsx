import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircle, XCircle, Plus } from 'lucide-react';
import { transfersApi, expatsApi, dormitoriesApi } from '../../../api/index.js';
import { DataTable } from '../../../components/shared/DataTable.jsx';
import { PageHeader } from '../../../components/shared/PageHeader.jsx';
import { StatusBadge } from '../../../components/shared/StatusBadge.jsx';
import { Button } from '../../../components/ui/button.jsx';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../../components/ui/dialog.jsx';
import { Input } from '../../../components/ui/input.jsx';
import { Label } from '../../../components/ui/label.jsx';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../../../components/ui/select.jsx';
import { useToast } from '../../../components/ui/toast.jsx';
import { useAuthStore } from '../../../store/authStore.js';
import { formatDate } from '../../../lib/utils.js';

const INITIAL_CREATE = {
  expatId: '',
  fromDormitoryId: '',
  toDormitoryId: '',
  reason: '',
  effectiveDate: '',
};

export default function Transfers() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const user = useAuthStore(s => s.user);
  const canApprove = user?.role === 'SUPER_ADMIN' || user?.role === 'MANAGER';

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showCreate, setShowCreate] = useState(false);
  const [showReject, setShowReject] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [createForm, setCreateForm] = useState(INITIAL_CREATE);

  const { data, isLoading } = useQuery({
    queryKey: ['transfers', page, statusFilter],
    queryFn: () => transfersApi.list({ page, status: statusFilter === 'all' ? undefined : statusFilter }),
  });

  const { data: expats } = useQuery({
    queryKey: ['expats-all'],
    queryFn: () => expatsApi.list({}),
  });

  const { data: dormitories } = useQuery({
    queryKey: ['dorms-all'],
    queryFn: () => dormitoriesApi.list({}),
  });

  const approveMutation = useMutation({
    mutationFn: transfersApi.approve,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transfers'] });
      toast({ title: 'Transfer approved', type: 'success' });
    },
    onError: (err) => toast({ title: 'Error', description: err.response?.data?.error, type: 'error' }),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }) => transfersApi.reject(id, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transfers'] });
      setShowReject(false);
      setRejectReason('');
      setSelectedId(null);
      toast({ title: 'Transfer rejected', type: 'success' });
    },
    onError: (err) => toast({ title: 'Error', description: err.response?.data?.error, type: 'error' }),
  });

  const createMutation = useMutation({
    mutationFn: transfersApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transfers'] });
      setShowCreate(false);
      setCreateForm(INITIAL_CREATE);
      toast({ title: 'Transfer request created', type: 'success' });
    },
    onError: (err) => toast({ title: 'Error', description: err.response?.data?.error, type: 'error' }),
  });

  const allTransfers = data?.data || data || [];
  const total = data?.total || (Array.isArray(allTransfers) ? allTransfers.length : 0);

  const filtered = Array.isArray(allTransfers)
    ? allTransfers.filter(t =>
        !search ||
        t.reason?.toLowerCase().includes(search.toLowerCase()) ||
        t.expat?.fullName?.toLowerCase().includes(search.toLowerCase())
      )
    : [];

  const expatList = expats?.data || expats || [];
  const dormList = dormitories?.data || dormitories || [];

  const columns = [
    {
      key: 'expat',
      header: 'Expat',
      render: (v) => <span className="font-medium text-slate-800">{v?.fullName || '—'}</span>,
    },
    {
      key: 'fromDormitory',
      header: 'From',
      render: (v) => v?.name || '—',
    },
    {
      key: 'toDormitory',
      header: 'To',
      render: (v) => v?.name || '—',
    },
    { key: 'reason', header: 'Reason' },
    {
      key: 'effectiveDate',
      header: 'Effective Date',
      render: (v) => formatDate(v),
    },
    {
      key: 'status',
      header: 'Status',
      render: (v) => <StatusBadge status={v} />,
    },
    ...(canApprove ? [{
      key: 'id',
      header: 'Actions',
      sortable: false,
      render: (_, row) => row.status === 'PENDING' ? (
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="text-green-600 hover:text-green-700 hover:bg-green-50"
            onClick={() => approveMutation.mutate(row.id)}
            disabled={approveMutation.isPending}
          >
            <CheckCircle size={14} /> Approve
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
            onClick={() => { setSelectedId(row.id); setShowReject(true); }}
          >
            <XCircle size={14} /> Reject
          </Button>
        </div>
      ) : null,
    }] : []),
  ];

  return (
    <div>
      <PageHeader
        title="Transfers"
        description="Manage expat dormitory transfers"
        actions={
          <div className="flex gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {['PENDING', 'APPROVED', 'REJECTED'].map(s => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={() => setShowCreate(true)}>
              <Plus size={14} /> New Transfer
            </Button>
          </div>
        }
      />

      <DataTable
        columns={columns}
        data={filtered}
        loading={isLoading}
        total={total}
        page={page}
        pageSize={25}
        onPageChange={setPage}
        onSearch={setSearch}
        searchPlaceholder="Search by expat name or reason..."
        emptyState="No transfers found."
      />

      {/* Create Transfer Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>New Transfer Request</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={e => { e.preventDefault(); createMutation.mutate(createForm); }}
            className="px-5 space-y-3"
          >
            <div className="space-y-1">
              <Label>Expat</Label>
              <Select value={createForm.expatId} onValueChange={v => setCreateForm(p => ({ ...p, expatId: v }))}>
                <SelectTrigger><SelectValue placeholder="Select expat" /></SelectTrigger>
                <SelectContent>
                  {Array.isArray(expatList) && expatList.map(e => (
                    <SelectItem key={e.id} value={e.id}>{e.fullName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>From Dormitory</Label>
              <Select value={createForm.fromDormitoryId} onValueChange={v => setCreateForm(p => ({ ...p, fromDormitoryId: v }))}>
                <SelectTrigger><SelectValue placeholder="Select dormitory" /></SelectTrigger>
                <SelectContent>
                  {Array.isArray(dormList) && dormList.map(d => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>To Dormitory</Label>
              <Select value={createForm.toDormitoryId} onValueChange={v => setCreateForm(p => ({ ...p, toDormitoryId: v }))}>
                <SelectTrigger><SelectValue placeholder="Select dormitory" /></SelectTrigger>
                <SelectContent>
                  {Array.isArray(dormList) && dormList.map(d => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Reason</Label>
              <Input
                value={createForm.reason}
                onChange={e => setCreateForm(p => ({ ...p, reason: e.target.value }))}
                placeholder="Reason for transfer"
                required
              />
            </div>
            <div className="space-y-1">
              <Label>Effective Date</Label>
              <Input
                type="date"
                value={createForm.effectiveDate}
                onChange={e => setCreateForm(p => ({ ...p, effectiveDate: e.target.value }))}
                required
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Submitting...' : 'Submit Request'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={showReject} onOpenChange={v => { setShowReject(v); if (!v) { setRejectReason(''); setSelectedId(null); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Transfer</DialogTitle>
          </DialogHeader>
          <div className="px-5 space-y-3">
            <Label>Rejection Reason</Label>
            <Input
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              placeholder="Provide a reason for rejection"
              required
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowReject(false); setRejectReason(''); setSelectedId(null); }}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => rejectMutation.mutate({ id: selectedId, reason: rejectReason })}
              disabled={!rejectReason.trim() || rejectMutation.isPending}
            >
              {rejectMutation.isPending ? 'Rejecting...' : 'Reject Transfer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
