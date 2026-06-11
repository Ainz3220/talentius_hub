import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Play, FileText, RefreshCw } from 'lucide-react';
import { settingsApi, webhooksApi } from '../api/index.js';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs.jsx';
import { PageHeader } from '../components/shared/PageHeader.jsx';
import { Button } from '../components/ui/button.jsx';
import { Input } from '../components/ui/input.jsx';
import { Label } from '../components/ui/label.jsx';
import { Switch } from '../components/ui/switch.jsx';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card.jsx';
import { Badge } from '../components/ui/badge.jsx';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog.jsx';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../components/ui/select.jsx';
import { Skeleton } from '../components/ui/skeleton.jsx';
import { useToast } from '../components/ui/toast.jsx';
import { useSettingsStore } from '../store/settingsStore.js';
import { formatDate } from '../lib/utils.js';

const TIMEZONE_OPTIONS = [
  'UTC', 'Asia/Kuala_Lumpur', 'Asia/Singapore', 'Asia/Jakarta',
  'Asia/Bangkok', 'Asia/Tokyo', 'Asia/Seoul', 'Europe/London',
  'Europe/Paris', 'America/New_York', 'America/Los_Angeles',
];

const DATE_FORMATS = ['DD MMM YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD', 'DD/MM/YYYY'];

const MIME_OPTIONS = [
  { label: 'PDF', value: 'application/pdf' },
  { label: 'JPEG', value: 'image/jpeg' },
  { label: 'PNG', value: 'image/png' },
  { label: 'Word (.docx)', value: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' },
  { label: 'Excel (.xlsx)', value: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
];

const ROLE_OPTIONS = ['SUPER_ADMIN', 'MANAGER', 'STAFF', 'CLIENT'];

const WEBHOOK_EVENTS = [
  'expat.created', 'expat.updated', 'expat.status_changed',
  'transfer.created', 'transfer.approved', 'transfer.rejected',
  'document.expiring', 'checklist.overdue',
];

// Section wrapper with save button
function Section({ title, onSave, saving, children }) {
  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle className="text-sm">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {children}
        <div className="flex justify-end pt-2 border-t">
          <Button onClick={onSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// General Tab
function GeneralTab({ settings, onSave }) {
  const [form, setForm] = useState({
    appName: settings?.appName || 'ExpatFlow',
    primaryColor: settings?.primaryColor || '#1F4E3D',
    timezone: settings?.timezone || 'Asia/Kuala_Lumpur',
    dateFormat: settings?.dateFormat || 'DD MMM YYYY',
    defaultPageSize: settings?.defaultPageSize || 25,
  });
  const [saving, setSaving] = useState(false);

  return (
    <Section title="General Settings" onSave={() => onSave(form, setSaving)} saving={saving}>
      <div className="space-y-1">
        <Label>Application Name</Label>
        <Input value={form.appName} onChange={e => setForm(p => ({ ...p, appName: e.target.value }))} />
      </div>
      <div className="space-y-1">
        <Label>Primary Color</Label>
        <div className="flex items-center gap-3">
          <input
            type="color"
            value={form.primaryColor}
            onChange={e => setForm(p => ({ ...p, primaryColor: e.target.value }))}
            className="h-9 w-16 rounded-md border border-slate-300 cursor-pointer"
          />
          <Input
            value={form.primaryColor}
            onChange={e => setForm(p => ({ ...p, primaryColor: e.target.value }))}
            placeholder="#1F4E3D"
            className="font-mono w-32"
          />
          <div className="h-9 w-9 rounded-md border border-slate-200" style={{ backgroundColor: form.primaryColor }} />
        </div>
      </div>
      <div className="space-y-1">
        <Label>Timezone</Label>
        <Select value={form.timezone} onValueChange={v => setForm(p => ({ ...p, timezone: v }))}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {TIMEZONE_OPTIONS.map(tz => <SelectItem key={tz} value={tz}>{tz}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Date Format</Label>
        <div className="flex flex-wrap gap-2">
          {DATE_FORMATS.map(fmt => (
            <button
              key={fmt}
              type="button"
              onClick={() => setForm(p => ({ ...p, dateFormat: fmt }))}
              className={`px-3 py-1.5 rounded-md text-sm border transition-colors ${
                form.dateFormat === fmt
                  ? 'bg-[var(--accent)] text-white border-[var(--accent)]'
                  : 'border-slate-300 text-slate-700 hover:bg-slate-50'
              }`}
            >
              {fmt}
            </button>
          ))}
        </div>
      </div>
      <div className="space-y-2">
        <Label>Default Page Size</Label>
        <div className="flex gap-2">
          {[10, 25, 50, 100].map(n => (
            <button
              key={n}
              type="button"
              onClick={() => setForm(p => ({ ...p, defaultPageSize: n }))}
              className={`px-3 py-1.5 rounded-md text-sm border transition-colors ${
                form.defaultPageSize === n
                  ? 'bg-[var(--accent)] text-white border-[var(--accent)]'
                  : 'border-slate-300 text-slate-700 hover:bg-slate-50'
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      </div>
    </Section>
  );
}

// Alerts Tab
function AlertsTab({ settings, onSave }) {
  const [form, setForm] = useState({
    docAlertDays1: settings?.docAlertDays1 || 30,
    docAlertDays2: settings?.docAlertDays2 || 7,
    checklistOverdueDays: settings?.checklistOverdueDays || 3,
    checklistOverdueCheckHours: settings?.checklistOverdueCheckHours || 24,
    alertRoles: settings?.alertRoles || ['SUPER_ADMIN', 'MANAGER'],
  });
  const [saving, setSaving] = useState(false);

  function toggleRole(role) {
    setForm(p => ({
      ...p,
      alertRoles: p.alertRoles.includes(role)
        ? p.alertRoles.filter(r => r !== role)
        : [...p.alertRoles, role],
    }));
  }

  return (
    <Section title="Alert Settings" onSave={() => onSave(form, setSaving)} saving={saving}>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label>Doc Alert — First Warning (days)</Label>
          <Input
            type="number"
            min="1"
            value={form.docAlertDays1}
            onChange={e => setForm(p => ({ ...p, docAlertDays1: Number(e.target.value) }))}
          />
        </div>
        <div className="space-y-1">
          <Label>Doc Alert — Second Warning (days)</Label>
          <Input
            type="number"
            min="1"
            value={form.docAlertDays2}
            onChange={e => setForm(p => ({ ...p, docAlertDays2: Number(e.target.value) }))}
          />
        </div>
        <div className="space-y-1">
          <Label>Checklist Overdue After (days)</Label>
          <Input
            type="number"
            min="1"
            value={form.checklistOverdueDays}
            onChange={e => setForm(p => ({ ...p, checklistOverdueDays: Number(e.target.value) }))}
          />
        </div>
        <div className="space-y-1">
          <Label>Overdue Check Interval (hours)</Label>
          <Input
            type="number"
            min="1"
            value={form.checklistOverdueCheckHours}
            onChange={e => setForm(p => ({ ...p, checklistOverdueCheckHours: Number(e.target.value) }))}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Alert Recipients (Roles)</Label>
        <div className="flex flex-wrap gap-2">
          {ROLE_OPTIONS.map(role => (
            <label key={role} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.alertRoles?.includes(role) || false}
                onChange={() => toggleRole(role)}
                className="rounded border-slate-300"
              />
              <span className="text-sm text-slate-700">{role}</span>
            </label>
          ))}
        </div>
      </div>
    </Section>
  );
}

// Security Tab
function SecurityTab({ settings, onSave }) {
  const [form, setForm] = useState({
    loginMaxAttempts: settings?.loginMaxAttempts || 5,
    loginLockoutMinutes: settings?.loginLockoutMinutes || 15,
    otpTtlSeconds: settings?.otpTtlSeconds || 300,
    emailVerifyTtlHours: settings?.emailVerifyTtlHours || 24,
  });
  const [saving, setSaving] = useState(false);

  const fields = [
    ['loginMaxAttempts', 'Max Login Attempts', 1, 20],
    ['loginLockoutMinutes', 'Lockout Duration (minutes)', 1, 1440],
    ['otpTtlSeconds', 'OTP Validity (seconds)', 30, 3600],
    ['emailVerifyTtlHours', 'Email Verify Link TTL (hours)', 1, 168],
  ];

  return (
    <Section title="Security Settings" onSave={() => onSave(form, setSaving)} saving={saving}>
      <div className="grid grid-cols-2 gap-4">
        {fields.map(([k, l, min, max]) => (
          <div key={k} className="space-y-1">
            <Label>{l}</Label>
            <Input
              type="number"
              min={min}
              max={max}
              value={form[k]}
              onChange={e => setForm(p => ({ ...p, [k]: Number(e.target.value) }))}
            />
          </div>
        ))}
      </div>
    </Section>
  );
}

// Transfers Tab
function TransfersTab({ settings, onSave }) {
  const [form, setForm] = useState({
    transferRequiresApproval: settings?.transferRequiresApproval ?? true,
    transferApprovalRoles: settings?.transferApprovalRoles || ['SUPER_ADMIN', 'MANAGER'],
  });
  const [saving, setSaving] = useState(false);

  function toggleRole(role) {
    setForm(p => ({
      ...p,
      transferApprovalRoles: p.transferApprovalRoles.includes(role)
        ? p.transferApprovalRoles.filter(r => r !== role)
        : [...p.transferApprovalRoles, role],
    }));
  }

  return (
    <Section title="Transfer Settings" onSave={() => onSave(form, setSaving)} saving={saving}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-slate-700">Require Approval for Transfers</p>
          <p className="text-xs text-slate-500">All transfer requests must be approved before taking effect</p>
        </div>
        <Switch
          checked={form.transferRequiresApproval}
          onCheckedChange={v => setForm(p => ({ ...p, transferRequiresApproval: v }))}
        />
      </div>

      {form.transferRequiresApproval && (
        <div className="space-y-2">
          <Label>Approval Roles</Label>
          <div className="flex flex-wrap gap-2">
            {ROLE_OPTIONS.map(role => (
              <label key={role} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.transferApprovalRoles?.includes(role) || false}
                  onChange={() => toggleRole(role)}
                  className="rounded border-slate-300"
                />
                <span className="text-sm text-slate-700">{role}</span>
              </label>
            ))}
          </div>
        </div>
      )}
    </Section>
  );
}

// Files Tab
function FilesTab({ settings, onSave }) {
  const [form, setForm] = useState({
    maxFileSizeMb: settings?.maxFileSizeMb || 10,
    allowedMimeTypes: settings?.allowedMimeTypes || ['application/pdf', 'image/jpeg', 'image/png'],
  });
  const [saving, setSaving] = useState(false);

  function toggleMime(mime) {
    setForm(p => ({
      ...p,
      allowedMimeTypes: p.allowedMimeTypes.includes(mime)
        ? p.allowedMimeTypes.filter(m => m !== mime)
        : [...p.allowedMimeTypes, mime],
    }));
  }

  return (
    <Section title="File Upload Settings" onSave={() => onSave(form, setSaving)} saving={saving}>
      <div className="space-y-2">
        <Label>Max File Size: {form.maxFileSizeMb} MB</Label>
        <input
          type="range"
          min="1"
          max="100"
          value={form.maxFileSizeMb}
          onChange={e => setForm(p => ({ ...p, maxFileSizeMb: Number(e.target.value) }))}
          className="w-full accent-[var(--accent)]"
        />
        <div className="flex justify-between text-xs text-slate-400">
          <span>1 MB</span>
          <span>100 MB</span>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Allowed File Types</Label>
        <div className="space-y-2">
          {MIME_OPTIONS.map(({ label, value }) => (
            <label key={value} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.allowedMimeTypes?.includes(value) || false}
                onChange={() => toggleMime(value)}
                className="rounded border-slate-300"
              />
              <span className="text-sm text-slate-700">{label}</span>
              <span className="text-xs text-slate-400 font-mono">{value}</span>
            </label>
          ))}
        </div>
      </div>
    </Section>
  );
}

// Display Tab
function DisplayTab({ settings, onSave }) {
  const [form, setForm] = useState({
    tableShowEncryptedMask: settings?.tableShowEncryptedMask ?? true,
    tableShowAvatars: settings?.tableShowAvatars ?? true,
    tableCompactMode: settings?.tableCompactMode ?? false,
    dashboardWidgets: settings?.dashboardWidgets || ['kpi', 'doc-alerts', 'transfers'],
  });
  const [saving, setSaving] = useState(false);

  const switches = [
    ['tableShowEncryptedMask', 'Show masked fields in tables', 'Display ••••• for encrypted fields instead of hiding them entirely'],
    ['tableShowAvatars', 'Show avatars in tables', 'Display avatar icons next to user names'],
    ['tableCompactMode', 'Compact table mode', 'Reduce row height for denser data display'],
  ];

  const widgetOptions = [
    { value: 'kpi', label: 'KPI Cards' },
    { value: 'doc-alerts', label: 'Document Alerts' },
    { value: 'transfers', label: 'Pending Transfers' },
    { value: 'checklists', label: 'Overdue Checklists' },
    { value: 'expat-map', label: 'Expat Map' },
  ];

  function toggleWidget(w) {
    setForm(p => ({
      ...p,
      dashboardWidgets: p.dashboardWidgets.includes(w)
        ? p.dashboardWidgets.filter(x => x !== w)
        : [...p.dashboardWidgets, w],
    }));
  }

  return (
    <Section title="Display Settings" onSave={() => onSave(form, setSaving)} saving={saving}>
      <div className="space-y-4">
        {switches.map(([k, label, desc]) => (
          <div key={k} className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-700">{label}</p>
              <p className="text-xs text-slate-500">{desc}</p>
            </div>
            <Switch
              checked={form[k]}
              onCheckedChange={v => setForm(p => ({ ...p, [k]: v }))}
            />
          </div>
        ))}
      </div>

      <div className="space-y-2 pt-2 border-t">
        <Label>Dashboard Widgets</Label>
        <div className="space-y-2">
          {widgetOptions.map(({ value, label }) => (
            <label key={value} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.dashboardWidgets?.includes(value) || false}
                onChange={() => toggleWidget(value)}
                className="rounded border-slate-300"
              />
              <span className="text-sm text-slate-700">{label}</span>
            </label>
          ))}
        </div>
      </div>
    </Section>
  );
}

// Webhook Logs Modal
function WebhookLogsModal({ webhookId, onClose }) {
  const { data: logs, isLoading } = useQuery({
    queryKey: ['webhook-logs', webhookId],
    queryFn: () => webhooksApi.logs(webhookId, { limit: 20 }),
    enabled: !!webhookId,
  });

  const logList = logs?.data || logs || [];

  return (
    <Dialog open={!!webhookId} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Webhook Delivery Logs</DialogTitle>
        </DialogHeader>
        <div className="px-5 pb-5 max-h-96 overflow-y-auto">
          {isLoading && <p className="text-slate-400 text-sm text-center py-4">Loading logs...</p>}
          {Array.isArray(logList) && logList.length === 0 && !isLoading && (
            <p className="text-slate-400 text-sm text-center py-4">No delivery logs found.</p>
          )}
          <div className="space-y-2">
            {Array.isArray(logList) && logList.map((log, i) => (
              <div key={log.id || i} className={`rounded-md p-3 border text-sm ${log.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono text-xs">{log.event}</span>
                  <div className="flex items-center gap-2">
                    <Badge variant={log.success ? 'success' : 'destructive'}>
                      {log.statusCode || (log.success ? '200' : 'Error')}
                    </Badge>
                    <span className="text-xs text-slate-500">{formatDate(log.createdAt)}</span>
                  </div>
                </div>
                {log.responseBody && (
                  <pre className="text-xs text-slate-600 mt-1 overflow-x-auto whitespace-pre-wrap break-all">
                    {typeof log.responseBody === 'string' ? log.responseBody.slice(0, 200) : JSON.stringify(log.responseBody).slice(0, 200)}
                  </pre>
                )}
                {log.error && <p className="text-xs text-red-600 mt-1">{log.error}</p>}
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Webhooks Tab
function WebhooksTab() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [logsWebhookId, setLogsWebhookId] = useState(null);
  const [form, setForm] = useState({ name: '', url: '', events: [], secret: '', isActive: true });

  const { data: webhooks, isLoading } = useQuery({
    queryKey: ['webhooks'],
    queryFn: webhooksApi.list,
  });

  const createMutation = useMutation({
    mutationFn: webhooksApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['webhooks'] });
      setShowCreate(false);
      setForm({ name: '', url: '', events: [], secret: '', isActive: true });
      toast({ title: 'Webhook created', type: 'success' });
    },
    onError: (err) => toast({ title: 'Error', description: err.response?.data?.error, type: 'error' }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => webhooksApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['webhooks'] });
      setShowEdit(false);
      setEditTarget(null);
      toast({ title: 'Webhook updated', type: 'success' });
    },
    onError: (err) => toast({ title: 'Error', description: err.response?.data?.error, type: 'error' }),
  });

  const deleteMutation = useMutation({
    mutationFn: webhooksApi.delete,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['webhooks'] });
      toast({ title: 'Webhook deleted', type: 'success' });
    },
    onError: (err) => toast({ title: 'Error', description: err.response?.data?.error, type: 'error' }),
  });

  const testMutation = useMutation({
    mutationFn: webhooksApi.test,
    onSuccess: () => toast({ title: 'Test payload sent', type: 'success' }),
    onError: (err) => toast({ title: 'Test failed', description: err.response?.data?.error, type: 'error' }),
  });

  const webhookList = webhooks?.data || webhooks || [];

  function toggleEvent(ev) {
    setForm(p => ({
      ...p,
      events: p.events.includes(ev) ? p.events.filter(e => e !== ev) : [...p.events, ev],
    }));
  }

  function openEdit(wh) {
    setEditTarget(wh);
    setForm({ name: wh.name, url: wh.url, events: wh.events || [], secret: '', isActive: wh.isActive });
    setShowEdit(true);
  }

  const renderWebhookForm = (saving) => (
    <div className="px-5 space-y-3">
      <div className="space-y-1">
        <Label>Name</Label>
        <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required />
      </div>
      <div className="space-y-1">
        <Label>URL</Label>
        <Input type="url" value={form.url} onChange={e => setForm(p => ({ ...p, url: e.target.value }))} placeholder="https://your-endpoint.com/webhook" required />
      </div>
      <div className="space-y-1">
        <Label>Secret (for signature validation)</Label>
        <Input type="password" value={form.secret} onChange={e => setForm(p => ({ ...p, secret: e.target.value }))} placeholder="Optional HMAC secret" />
      </div>
      <div className="space-y-2">
        <Label>Events to Subscribe</Label>
        <div className="grid grid-cols-2 gap-1.5">
          {WEBHOOK_EVENTS.map(ev => (
            <label key={ev} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.events.includes(ev)}
                onChange={() => toggleEvent(ev)}
                className="rounded border-slate-300"
              />
              <span className="text-xs text-slate-700 font-mono">{ev}</span>
            </label>
          ))}
        </div>
      </div>
      <div className="flex items-center justify-between">
        <Label>Active</Label>
        <Switch
          checked={form.isActive}
          onCheckedChange={v => setForm(p => ({ ...p, isActive: v }))}
        />
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={() => { setShowCreate(false); setShowEdit(false); }}>Cancel</Button>
        <Button type="submit" disabled={saving}>
          {saving ? 'Saving...' : 'Save Webhook'}
        </Button>
      </DialogFooter>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setShowCreate(true)}>
          <Plus size={14} /> Add Webhook
        </Button>
      </div>

      {isLoading && <Skeleton className="h-24 w-full" />}

      {Array.isArray(webhookList) && webhookList.map(wh => (
        <Card key={wh.id}>
          <CardContent className="pt-4">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-sm font-medium text-slate-800">{wh.name}</p>
                  <Badge variant={wh.isActive ? 'success' : 'outline'}>
                    {wh.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                <p className="text-xs text-slate-500 font-mono truncate">{wh.url}</p>
                {wh.events?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {wh.events.slice(0, 4).map(ev => (
                      <span key={ev} className="text-xs bg-slate-100 text-slate-600 rounded px-1.5 py-0.5 font-mono">{ev}</span>
                    ))}
                    {wh.events.length > 4 && (
                      <span className="text-xs text-slate-400">+{wh.events.length - 4} more</span>
                    )}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1 ml-2 shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => testMutation.mutate(wh.id)}
                  disabled={testMutation.isPending}
                  title="Send test event"
                >
                  <Play size={14} />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setLogsWebhookId(wh.id)}
                  title="View logs"
                >
                  <FileText size={14} />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => openEdit(wh)}>
                  <RefreshCw size={14} />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-500 hover:text-red-700 hover:bg-red-50"
                  onClick={() => deleteMutation.mutate(wh.id)}
                >
                  <Trash2 size={14} />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      {Array.isArray(webhookList) && webhookList.length === 0 && !isLoading && (
        <p className="text-sm text-slate-400 py-8 text-center">No webhooks configured.</p>
      )}

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>New Webhook</DialogTitle></DialogHeader>
          <form onSubmit={e => { e.preventDefault(); createMutation.mutate(form); }}>
            {renderWebhookForm(createMutation.isPending)}
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={showEdit} onOpenChange={v => { setShowEdit(v); if (!v) setEditTarget(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Edit Webhook</DialogTitle></DialogHeader>
          <form onSubmit={e => { e.preventDefault(); updateMutation.mutate({ id: editTarget?.id, data: form }); }}>
            {renderWebhookForm(updateMutation.isPending)}
          </form>
        </DialogContent>
      </Dialog>

      {/* Logs Modal */}
      {logsWebhookId && (
        <WebhookLogsModal webhookId={logsWebhookId} onClose={() => setLogsWebhookId(null)} />
      )}
    </div>
  );
}

// Main Settings Page
export default function Settings() {
  const { toast } = useToast();
  const { updateSettings } = useSettingsStore();

  const { data: settings, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: settingsApi.get,
  });

  const mutation = useMutation({
    mutationFn: settingsApi.update,
    onSuccess: (data) => {
      if (data.primaryColor) {
        document.documentElement.style.setProperty('--accent', data.primaryColor);
      }
    },
  });

  async function handleSave(patch, setSaving) {
    setSaving(true);
    try {
      await mutation.mutateAsync(patch);
      await updateSettings(patch);
      toast({ title: 'Settings saved', type: 'success' });
    } catch (err) {
      toast({ title: 'Failed to save', description: err.response?.data?.error, type: 'error' });
    } finally {
      setSaving(false);
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Settings"
        description="Configure your ExpatFlow instance"
      />

      <Tabs defaultValue="general">
        <TabsList className="mb-6">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="transfers">Transfers</TabsTrigger>
          <TabsTrigger value="files">Files</TabsTrigger>
          <TabsTrigger value="display">Display</TabsTrigger>
          <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <GeneralTab settings={settings} onSave={handleSave} />
        </TabsContent>

        <TabsContent value="alerts">
          <AlertsTab settings={settings} onSave={handleSave} />
        </TabsContent>

        <TabsContent value="security">
          <SecurityTab settings={settings} onSave={handleSave} />
        </TabsContent>

        <TabsContent value="transfers">
          <TransfersTab settings={settings} onSave={handleSave} />
        </TabsContent>

        <TabsContent value="files">
          <FilesTab settings={settings} onSave={handleSave} />
        </TabsContent>

        <TabsContent value="display">
          <DisplayTab settings={settings} onSave={handleSave} />
        </TabsContent>

        <TabsContent value="webhooks">
          <WebhooksTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
