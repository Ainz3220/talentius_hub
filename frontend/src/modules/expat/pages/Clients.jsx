import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { clientsApi } from '../../../api/index.js';
import { DataTable } from '../../../components/shared/DataTable.jsx';
import { PageHeader } from '../../../components/shared/PageHeader.jsx';
import { StatusBadge } from '../../../components/shared/StatusBadge.jsx';
import { Button } from '../../../components/ui/button.jsx';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../../components/ui/dialog.jsx';
import { Input } from '../../../components/ui/input.jsx';
import { Label } from '../../../components/ui/label.jsx';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../../../components/ui/select.jsx';
import { useToast } from '../../../components/ui/toast.jsx';

const INITIAL_FORM = {
  name: '',
  type: 'COMPANY',
  registrationNo: '',
  contactName: '',
  contactEmail: '',
  contactPhone: '',
  address: '',
};

export default function Clients() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(INITIAL_FORM);

  const { data, isLoading } = useQuery({
    queryKey: ['clients', page, typeFilter],
    queryFn: () => clientsApi.list({ page, type: typeFilter === 'all' ? undefined : typeFilter }),
  });

  const createMutation = useMutation({
    mutationFn: clientsApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['clients'] });
      setShowCreate(false);
      setForm(INITIAL_FORM);
      toast({ title: 'Client created', type: 'success' });
    },
    onError: (err) => toast({ title: 'Error', description: err.response?.data?.error || 'Failed to create', type: 'error' }),
  });

  const allClients = data?.data || data || [];
  const total = data?.total || (Array.isArray(allClients) ? allClients.length : 0);

  const filtered = Array.isArray(allClients)
    ? allClients.filter(c =>
        !search ||
        c.name?.toLowerCase().includes(search.toLowerCase()) ||
        c.contactName?.toLowerCase().includes(search.toLowerCase())
      )
    : [];

  const columns = [
    {
      key: 'clientNo',
      header: 'Client No',
      render: (v) => <span className="font-mono text-xs font-semibold text-slate-500">{v || '—'}</span>,
    },
    {
      key: 'name',
      header: 'Client Name',
      render: (v) => <span className="font-medium text-slate-800">{v || '—'}</span>,
    },
    {
      key: 'type',
      header: 'Type',
      render: (v) => <StatusBadge status={v} />,
    },
    { key: 'contactName', header: 'Contact Person' },
    {
      key: 'id',
      header: '',
      sortable: false,
      render: (_, row) => (
        <Button variant="ghost" size="sm" onClick={() => navigate(`/clients/${row.id}`)}>
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
        title="Clients"
        description="Manage companies and individual sponsors"
        actions={
          <div className="flex gap-2">
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="COMPANY">Company</SelectItem>
                <SelectItem value="INDIVIDUAL">Individual</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={() => setShowCreate(true)}>
              <Plus size={14} /> Add Client
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
        searchPlaceholder="Search by name or contact..."
        emptyState="No clients found. Add one to get started."
      />

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add New Client</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={e => { e.preventDefault(); createMutation.mutate(form); }}
            className="px-5 space-y-3"
          >
            <div className="space-y-1">
              <Label>Type</Label>
              <Select value={form.type} onValueChange={v => setForm(p => ({ ...p, type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="COMPANY">Company</SelectItem>
                  <SelectItem value="INDIVIDUAL">Individual</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {[
              ['name', 'Client Name', 'text'],
              ['registrationNo', 'Registration No', 'text'],
              ['contactName', 'Contact Person', 'text'],
              ['contactEmail', 'Contact Email', 'email'],
              ['contactPhone', 'Contact Phone', 'tel'],
              ['address', 'Address', 'text'],
            ].map(([k, l, t]) => (
              <div key={k} className="space-y-1">
                <Label>{l}</Label>
                <Input type={t} value={form[k]} onChange={setField(k)} />
              </div>
            ))}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Creating...' : 'Create Client'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
