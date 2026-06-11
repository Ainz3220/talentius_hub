import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download } from 'lucide-react';
import { auditApi } from '../../../api/index.js';
import { DataTable } from '../../../components/shared/DataTable.jsx';
import { PageHeader } from '../../../components/shared/PageHeader.jsx';
import { Button } from '../../../components/ui/button.jsx';
import { Input } from '../../../components/ui/input.jsx';
import { Label } from '../../../components/ui/label.jsx';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../../../components/ui/select.jsx';
import { useToast } from '../../../components/ui/toast.jsx';

const ACTION_OPTIONS = [
  'CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT',
  'REVEAL_FIELD', 'TRANSFER_APPROVE', 'TRANSFER_REJECT',
  'DOCUMENT_UPLOAD', 'DOCUMENT_DOWNLOAD',
];

const TABLE_OPTIONS = [
  'expats', 'clients', 'dormitories', 'transfers',
  'documents', 'checklists', 'users', 'settings',
];

export default function AuditTrail() {
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [tableFilter, setTableFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const params = {
    page,
    action: actionFilter === 'all' ? undefined : actionFilter || undefined,
    tableName: tableFilter === 'all' ? undefined : tableFilter || undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
  };

  const { data, isLoading } = useQuery({
    queryKey: ['audit', page, actionFilter, tableFilter, dateFrom, dateTo],
    queryFn: () => auditApi.list(params),
  });

  const allLogs = data?.data || data || [];
  const total = data?.total || (Array.isArray(allLogs) ? allLogs.length : 0);

  const filtered = Array.isArray(allLogs)
    ? allLogs.filter(log =>
        !search ||
        log.action?.toLowerCase().includes(search.toLowerCase()) ||
        log.tableName?.toLowerCase().includes(search.toLowerCase()) ||
        log.recordId?.toLowerCase().includes(search.toLowerCase()) ||
        log.user?.email?.toLowerCase().includes(search.toLowerCase()) ||
        log.ipAddress?.includes(search)
      )
    : [];

  async function handleExport() {
    try {
      const blob = await auditApi.export(params);
      const url = URL.createObjectURL(blob);
      const a = Object.assign(document.createElement('a'), {
        href: url,
        download: `audit-trail-${new Date().toISOString().slice(0, 10)}.csv`,
      });
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: 'Export started', type: 'success' });
    } catch {
      toast({ title: 'Export failed', type: 'error' });
    }
  }

  const columns = [
    {
      key: 'createdAt',
      header: 'Timestamp',
      render: (v) => (
        <span className="text-xs text-slate-600 whitespace-nowrap">
          {v ? new Date(v).toLocaleString() : '—'}
        </span>
      ),
    },
    {
      key: 'action',
      header: 'Action',
      render: (v) => (
        <span className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded">{v}</span>
      ),
    },
    { key: 'tableName', header: 'Table' },
    {
      key: 'recordId',
      header: 'Record ID',
      render: (v) => v ? (
        <span className="font-mono text-xs text-slate-500">{v.slice(-8)}</span>
      ) : '—',
    },
    {
      key: 'fieldName',
      header: 'Field',
      render: (v) => v || '—',
    },
    {
      key: 'oldValue',
      header: 'From',
      render: (v) => v ? (
        <span className="text-xs max-w-[80px] truncate block text-slate-500">{String(v)}</span>
      ) : '—',
    },
    {
      key: 'newValue',
      header: 'To',
      render: (v) => v ? (
        <span className="text-xs max-w-[80px] truncate block text-slate-800">{String(v)}</span>
      ) : '—',
    },
    {
      key: 'user',
      header: 'By',
      render: (v) => v ? (
        <span className="text-xs text-slate-600">{v.email || v.name}</span>
      ) : '—',
    },
    {
      key: 'ipAddress',
      header: 'IP',
      render: (v) => (
        <span className="text-xs font-mono text-slate-400">{v || '—'}</span>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Audit Trail"
        description="Track all system actions and changes"
        actions={
          <Button variant="outline" onClick={handleExport}>
            <Download size={14} /> Export CSV
          </Button>
        }
      />

      {/* Filters */}
      <div className="mb-4 grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Action</Label>
          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger>
              <SelectValue placeholder="All actions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              {ACTION_OPTIONS.map(a => (
                <SelectItem key={a} value={a}>{a}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Table</Label>
          <Select value={tableFilter} onValueChange={setTableFilter}>
            <SelectTrigger>
              <SelectValue placeholder="All tables" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              {TABLE_OPTIONS.map(t => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label className="text-xs">From Date</Label>
          <Input
            type="date"
            value={dateFrom}
            onChange={e => { setDateFrom(e.target.value); setPage(1); }}
          />
        </div>

        <div className="space-y-1">
          <Label className="text-xs">To Date</Label>
          <Input
            type="date"
            value={dateTo}
            onChange={e => { setDateTo(e.target.value); setPage(1); }}
          />
        </div>
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        loading={isLoading}
        total={total}
        page={page}
        pageSize={25}
        onPageChange={setPage}
        onSearch={setSearch}
        searchPlaceholder="Search by action, table, record ID, user, or IP..."
        emptyState="No audit log entries found."
      />
    </div>
  );
}
