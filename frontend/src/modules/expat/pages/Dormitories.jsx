import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { dormitoriesApi } from '../../../api/index.js';
import { DataTable } from '../../../components/shared/DataTable.jsx';
import { PageHeader } from '../../../components/shared/PageHeader.jsx';
import { Button } from '../../../components/ui/button.jsx';
import { Badge } from '../../../components/ui/badge.jsx';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../../components/ui/dialog.jsx';
import { Input } from '../../../components/ui/input.jsx';
import { Label } from '../../../components/ui/label.jsx';
import { Progress } from '../../../components/ui/progress.jsx';
import { useToast } from '../../../components/ui/toast.jsx';

const INITIAL_FORM = {
  name: '',
  address: '',
  state: '',
  capacity: '',
  pic: '',
};

function OccupancyCell({ occupantCount, capacity }) {
  const pct = capacity ? Math.round(((occupantCount || 0) / capacity) * 100) : 0;
  const variant = pct >= 100 ? 'destructive' : pct >= 80 ? 'warning' : 'success';
  return (
    <div className="flex items-center gap-2 min-w-[100px]">
      <Progress value={pct} className="w-16" />
      <Badge variant={variant} className="text-xs shrink-0">
        {occupantCount || 0}/{capacity || 0}
      </Badge>
    </div>
  );
}

export default function Dormitories() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(INITIAL_FORM);

  const { data, isLoading } = useQuery({
    queryKey: ['dormitories', page],
    queryFn: () => dormitoriesApi.list({ page }),
  });

  const createMutation = useMutation({
    mutationFn: (d) => dormitoriesApi.create({ ...d, capacity: Number(d.capacity) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dormitories'] });
      setShowCreate(false);
      setForm(INITIAL_FORM);
      toast({ title: 'Dormitory created', type: 'success' });
    },
    onError: (err) => toast({ title: 'Error', description: err.response?.data?.error || 'Failed to create', type: 'error' }),
  });

  const allDorms = data?.data || data || [];
  const total = data?.total || (Array.isArray(allDorms) ? allDorms.length : 0);

  const filtered = Array.isArray(allDorms)
    ? allDorms.filter(d =>
        !search ||
        d.name?.toLowerCase().includes(search.toLowerCase()) ||
        d.address?.toLowerCase().includes(search.toLowerCase())
      )
    : [];

  const columns = [
    {
      key: 'name',
      header: 'Dormitory Name',
      render: (v) => <span className="font-medium text-slate-800">{v || '—'}</span>,
    },
    { key: 'address', header: 'Address' },
    {
      key: 'occupantCount',
      header: 'Occupancy',
      sortable: false,
      render: (v, row) => <OccupancyCell occupantCount={v} capacity={row.capacity} />,
    },
    { key: 'state', header: 'State' },
    { key: 'pic', header: 'PIC' },
    {
      key: 'id',
      header: '',
      sortable: false,
      render: (_, row) => (
        <Button variant="ghost" size="sm" onClick={() => navigate(`/dormitories/${row.id}`)}>
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
        title="Dormitories"
        description="Manage housing for expatriates"
        actions={
          <Button onClick={() => setShowCreate(true)}>
            <Plus size={14} /> Add Dormitory
          </Button>
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
        searchPlaceholder="Search by name or address..."
        emptyState="No dormitories found. Add one to get started."
      />

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add New Dormitory</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={e => { e.preventDefault(); createMutation.mutate(form); }}
            className="px-5 space-y-3"
          >
            {[
              ['name', 'Dormitory Name', 'text'],
              ['address', 'Address', 'text'],
              ['state', 'State', 'text'],
              ['capacity', 'Capacity', 'number'],
              ['pic', 'Person In Charge (PIC)', 'text'],
            ].map(([k, l, t]) => (
              <div key={k} className="space-y-1">
                <Label>{l}</Label>
                <Input type={t} value={form[k]} onChange={setField(k)} min={t === 'number' ? 1 : undefined} />
              </div>
            ))}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Creating...' : 'Create Dormitory'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
