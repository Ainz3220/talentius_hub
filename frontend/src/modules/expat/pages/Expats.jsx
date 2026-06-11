import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { expatsApi, clientsApi, dormitoriesApi } from '../../../api/index.js';
import { DataTable } from '../../../components/shared/DataTable.jsx';
import { PageHeader } from '../../../components/shared/PageHeader.jsx';
import { StatusBadge } from '../../../components/shared/StatusBadge.jsx';
import { Button } from '../../../components/ui/button.jsx';
import { Badge } from '../../../components/ui/badge.jsx';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../../components/ui/dialog.jsx';
import { Input } from '../../../components/ui/input.jsx';
import { Label } from '../../../components/ui/label.jsx';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../../../components/ui/select.jsx';
import { useToast } from '../../../components/ui/toast.jsx';
import { formatDate, daysUntil, expiryStatus } from '../../../lib/utils.js';

function ExpiryCell({ date }) {
  const days = daysUntil(date);
  const status = expiryStatus(date);
  const color = status === 'expired' || status === 'critical' ? 'destructive' : status === 'warning' ? 'warning' : 'default';
  if (!date) return <span className="text-slate-400">—</span>;
  return (
    <Badge variant={color}>
      {days <= 0 ? 'Expired' : days <= 30 ? `${days}d` : formatDate(date)}
    </Badge>
  );
}

const INITIAL_FORM = {
  fullName: '', passportNo: '', nationality: '', dateOfBirth: '',
  phone: '', clientId: '', dormitoryId: '', permitExpiry: '', status: 'PENDING',
};

export default function Expats() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(INITIAL_FORM);

  const { data, isLoading } = useQuery({
    queryKey: ['expats', page, statusFilter],
    queryFn: () => expatsApi.list({ page, status: statusFilter === 'all' ? undefined : statusFilter }),
  });

  const { data: clients } = useQuery({
    queryKey: ['clients-all'],
    queryFn: () => clientsApi.list({}),
  });

  const { data: dormitories } = useQuery({
    queryKey: ['dorms-all'],
    queryFn: () => dormitoriesApi.list({}),
  });

  const createMutation = useMutation({
    mutationFn: expatsApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expats'] });
      setShowCreate(false);
      setForm(INITIAL_FORM);
      toast({ title: 'Expat created', type: 'success' });
    },
    onError: (err) => toast({ title: 'Error', description: err.response?.data?.error || 'Failed to create', type: 'error' }),
  });

  const allExpats = data?.data || data || [];
  const total = data?.total || (Array.isArray(allExpats) ? allExpats.length : 0);

  const filtered = Array.isArray(allExpats)
    ? allExpats.filter(e =>
        !search ||
        e.fullName?.toLowerCase().includes(search.toLowerCase()) ||
        e.nationality?.toLowerCase().includes(search.toLowerCase())
      )
    : [];

  const clientList = clients?.data || clients || [];
  const dormList = dormitories?.data || dormitories || [];

  const columns = [
    {
      key: 'fullName',
      header: 'Name',
      render: (v) => <span className="font-medium text-slate-800">{v || '—'}</span>,
    },
    { key: 'nationality', header: 'Nationality' },
    {
      key: 'status',
      header: 'Status',
      render: (v) => <StatusBadge status={v} />,
    },
    {
      key: 'permitExpiry',
      header: 'Permit Expiry',
      render: (v) => <ExpiryCell date={v} />,
    },
    {
      key: 'id',
      header: '',
      sortable: false,
      render: (_, row) => (
        <Button variant="ghost" size="sm" onClick={() => navigate(`/expats/${row.id}`)}>
          <Eye size={14} /> View
        </Button>
      ),
    },
  ];

  function setField(k) {
    return (e) => setForm(p => ({ ...p, [k]: e.target.value }));
  }

  return (
    <div>
      <PageHeader
        title="Expats"
        description="Manage your foreign workers"
        actions={
          <div className="flex gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {['PENDING', 'ACTIVE', 'TRANSFERRED', 'EXPIRED', 'REPATRIATED'].map(s => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={() => setShowCreate(true)}>
              <Plus size={14} /> Add Expat
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
        searchPlaceholder="Search by name or nationality..."
        emptyState="No expats found. Add one to get started."
      />

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add New Expat</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={e => { e.preventDefault(); createMutation.mutate(form); }}
            className="px-5 space-y-3"
          >
            {[
              ['fullName', 'Full Name', 'text'],
              ['passportNo', 'Passport No', 'text'],
              ['nationality', 'Nationality', 'text'],
              ['dateOfBirth', 'Date of Birth', 'date'],
              ['phone', 'Phone', 'tel'],
              ['permitExpiry', 'Permit Expiry Date', 'date'],
            ].map(([k, l, t]) => (
              <div key={k} className="space-y-1">
                <Label>{l}</Label>
                <Input type={t} value={form[k]} onChange={setField(k)} required />
              </div>
            ))}

            <div className="space-y-1">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => setForm(p => ({ ...p, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['PENDING', 'ACTIVE', 'TRANSFERRED', 'EXPIRED', 'REPATRIATED'].map(s => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Client</Label>
              <Select value={form.clientId} onValueChange={v => setForm(p => ({ ...p, clientId: v }))}>
                <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
                <SelectContent>
                  {Array.isArray(clientList) && clientList.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Dormitory</Label>
              <Select value={form.dormitoryId} onValueChange={v => setForm(p => ({ ...p, dormitoryId: v }))}>
                <SelectTrigger><SelectValue placeholder="Select dormitory" /></SelectTrigger>
                <SelectContent>
                  {Array.isArray(dormList) && dormList.map(d => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Creating...' : 'Create Expat'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
