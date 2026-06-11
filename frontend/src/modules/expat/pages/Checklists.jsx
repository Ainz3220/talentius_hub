import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Edit2, ChevronDown, ChevronUp } from 'lucide-react';
import { checklistsApi } from '../../../api/index.js';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../../components/ui/tabs.jsx';
import { PageHeader } from '../../../components/shared/PageHeader.jsx';
import { StatusBadge } from '../../../components/shared/StatusBadge.jsx';
import { Button } from '../../../components/ui/button.jsx';
import { Badge } from '../../../components/ui/badge.jsx';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card.jsx';
import { Progress } from '../../../components/ui/progress.jsx';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../../components/ui/dialog.jsx';
import { Input } from '../../../components/ui/input.jsx';
import { Label } from '../../../components/ui/label.jsx';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../../../components/ui/select.jsx';
import { useToast } from '../../../components/ui/toast.jsx';
import { useAuthStore } from '../../../store/authStore.js';
import { formatDate } from '../../../lib/utils.js';

// Templates Tab
function TemplatesTab() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const user = useAuthStore(s => s.user);
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [showAddItem, setShowAddItem] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [form, setForm] = useState({ name: '', description: '', entityType: 'EXPAT', scope: 'GLOBAL' });
  const [itemForm, setItemForm] = useState({ itemText: '', notes: '', dueDays: '' });

  const { data: templates, isLoading } = useQuery({
    queryKey: ['checklist-templates'],
    queryFn: () => checklistsApi.listTemplates({}),
  });

  const createMutation = useMutation({
    mutationFn: checklistsApi.createTemplate,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['checklist-templates'] });
      setShowCreate(false);
      setForm({ name: '', description: '', entityType: 'EXPAT', scope: 'GLOBAL' });
      toast({ title: 'Template created', type: 'success' });
    },
    onError: (err) => toast({ title: 'Error', description: err.response?.data?.error, type: 'error' }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => checklistsApi.updateTemplate(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['checklist-templates'] });
      setShowEdit(false);
      setEditTarget(null);
      toast({ title: 'Template updated', type: 'success' });
    },
    onError: (err) => toast({ title: 'Error', description: err.response?.data?.error, type: 'error' }),
  });

  const deleteMutation = useMutation({
    mutationFn: checklistsApi.deleteTemplate,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['checklist-templates'] });
      toast({ title: 'Template deleted', type: 'success' });
    },
    onError: (err) => toast({ title: 'Error', description: err.response?.data?.error, type: 'error' }),
  });

  const addItemMutation = useMutation({
    mutationFn: ({ templateId, data }) => checklistsApi.addTemplateItem(templateId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['checklist-templates'] });
      setShowAddItem(null);
      setItemForm({ itemText: '', notes: '', dueDays: '' });
      toast({ title: 'Item added', type: 'success' });
    },
    onError: (err) => toast({ title: 'Error', description: err.response?.data?.error, type: 'error' }),
  });

  const deleteItemMutation = useMutation({
    mutationFn: ({ templateId, itemId }) => checklistsApi.deleteTemplateItem(templateId, itemId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['checklist-templates'] }),
    onError: (err) => toast({ title: 'Error', description: err.response?.data?.error, type: 'error' }),
  });

  const templateList = templates?.data || templates || [];

  return (
    <div className="space-y-4">
      {isSuperAdmin && (
        <div className="flex justify-end">
          <Button onClick={() => setShowCreate(true)}>
            <Plus size={14} /> New Template
          </Button>
        </div>
      )}

      {isLoading && <p className="text-slate-400 text-sm text-center py-8">Loading templates...</p>}

      {Array.isArray(templateList) && templateList.map(tmpl => (
        <Card key={tmpl.id}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CardTitle className="text-sm">{tmpl.name}</CardTitle>
                <StatusBadge status={tmpl.scope} />
                <Badge variant="info">{tmpl.entityType}</Badge>
              </div>
              <div className="flex items-center gap-1">
                {isSuperAdmin && (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => { setEditTarget(tmpl); setForm({ name: tmpl.name, description: tmpl.description || '', entityType: tmpl.entityType, scope: tmpl.scope }); setShowEdit(true); }}
                    >
                      <Edit2 size={14} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                      onClick={() => deleteMutation.mutate(tmpl.id)}
                    >
                      <Trash2 size={14} />
                    </Button>
                  </>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setExpandedId(expandedId === tmpl.id ? null : tmpl.id)}
                >
                  {expandedId === tmpl.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </Button>
              </div>
            </div>
            {tmpl.description && <p className="text-xs text-slate-500">{tmpl.description}</p>}
          </CardHeader>

          {expandedId === tmpl.id && (
            <CardContent>
              <ul className="space-y-2 mb-3">
                {(tmpl.items || []).map(item => (
                  <li key={item.id} className="flex items-center justify-between bg-slate-50 rounded-md px-3 py-2">
                    <div>
                      <p className="text-sm text-slate-800">{item.itemText}</p>
                      {item.notes && <p className="text-xs text-slate-400">{item.notes}</p>}
                      {item.dueDays && <p className="text-xs text-slate-400">Due in {item.dueDays} days</p>}
                    </div>
                    {isSuperAdmin && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-400 hover:text-red-600"
                        onClick={() => deleteItemMutation.mutate({ templateId: tmpl.id, itemId: item.id })}
                      >
                        <Trash2 size={12} />
                      </Button>
                    )}
                  </li>
                ))}
                {(!tmpl.items || tmpl.items.length === 0) && (
                  <li className="text-sm text-slate-400 text-center py-2">No items yet.</li>
                )}
              </ul>
              {isSuperAdmin && (
                <Button variant="outline" size="sm" onClick={() => setShowAddItem(tmpl.id)}>
                  <Plus size={12} /> Add Item
                </Button>
              )}
            </CardContent>
          )}
        </Card>
      ))}

      {Array.isArray(templateList) && templateList.length === 0 && !isLoading && (
        <p className="text-sm text-slate-400 py-8 text-center">No templates found.</p>
      )}

      {/* Create Template Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Checklist Template</DialogTitle></DialogHeader>
          <form onSubmit={e => { e.preventDefault(); createMutation.mutate(form); }} className="px-5 space-y-3">
            <div className="space-y-1">
              <Label>Name</Label>
              <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required />
            </div>
            <div className="space-y-1">
              <Label>Description</Label>
              <Input value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Entity Type</Label>
              <Select value={form.entityType} onValueChange={v => setForm(p => ({ ...p, entityType: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['EXPAT', 'CLIENT', 'DORMITORY'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Scope</Label>
              <Select value={form.scope} onValueChange={v => setForm(p => ({ ...p, scope: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="GLOBAL">Global</SelectItem>
                  <SelectItem value="CUSTOM">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button type="submit" disabled={createMutation.isPending}>Create Template</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Template Dialog */}
      <Dialog open={showEdit} onOpenChange={v => { setShowEdit(v); if (!v) setEditTarget(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Template</DialogTitle></DialogHeader>
          <form onSubmit={e => { e.preventDefault(); updateMutation.mutate({ id: editTarget?.id, data: form }); }} className="px-5 space-y-3">
            <div className="space-y-1">
              <Label>Name</Label>
              <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required />
            </div>
            <div className="space-y-1">
              <Label>Description</Label>
              <Input value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowEdit(false)}>Cancel</Button>
              <Button type="submit" disabled={updateMutation.isPending}>Save Changes</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Item Dialog */}
      <Dialog open={!!showAddItem} onOpenChange={v => { if (!v) { setShowAddItem(null); setItemForm({ itemText: '', notes: '', dueDays: '' }); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Checklist Item</DialogTitle></DialogHeader>
          <form onSubmit={e => { e.preventDefault(); addItemMutation.mutate({ templateId: showAddItem, data: { ...itemForm, dueDays: itemForm.dueDays ? Number(itemForm.dueDays) : undefined } }); }} className="px-5 space-y-3">
            <div className="space-y-1">
              <Label>Item Text</Label>
              <Input value={itemForm.itemText} onChange={e => setItemForm(p => ({ ...p, itemText: e.target.value }))} required />
            </div>
            <div className="space-y-1">
              <Label>Notes</Label>
              <Input value={itemForm.notes} onChange={e => setItemForm(p => ({ ...p, notes: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Due Days (from creation)</Label>
              <Input type="number" min="1" value={itemForm.dueDays} onChange={e => setItemForm(p => ({ ...p, dueDays: e.target.value }))} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setShowAddItem(null); setItemForm({ itemText: '', notes: '', dueDays: '' }); }}>Cancel</Button>
              <Button type="submit" disabled={addItemMutation.isPending}>Add Item</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Running Checklists Tab
function RunningTab() {
  const [entityTypeFilter, setEntityTypeFilter] = useState('all');

  const { data: checklists, isLoading } = useQuery({
    queryKey: ['checklists-running', entityTypeFilter],
    queryFn: () => checklistsApi.list({ entityType: entityTypeFilter === 'all' ? undefined : entityTypeFilter }),
  });

  const checklistList = checklists?.data || checklists || [];

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <Select value={entityTypeFilter} onValueChange={setEntityTypeFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="EXPAT">Expat</SelectItem>
            <SelectItem value="CLIENT">Client</SelectItem>
            <SelectItem value="DORMITORY">Dormitory</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading && <p className="text-slate-400 text-sm text-center py-8">Loading checklists...</p>}

      {Array.isArray(checklistList) && checklistList.map(cl => {
        const done = cl.items?.filter(i => i.status === 'DONE' || i.status === 'WAIVED').length ?? 0;
        const total = cl.items?.length ?? 0;
        const pct = total ? Math.round((done / total) * 100) : 0;
        const overdue = cl.items?.filter(i => i.overdueSince && i.status === 'PENDING').length ?? 0;

        return (
          <Card key={cl.id}>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-sm font-medium text-slate-800">{cl.name}</p>
                  <p className="text-xs text-slate-500">{cl.entityType} · {formatDate(cl.createdAt)}</p>
                </div>
                <div className="flex items-center gap-2">
                  {overdue > 0 && <Badge variant="warning">{overdue} overdue</Badge>}
                  <StatusBadge status={cl.status} />
                </div>
              </div>
              <div className="space-y-1">
                <Progress value={pct} />
                <p className="text-xs text-slate-500">{done}/{total} items complete ({pct}%)</p>
              </div>
            </CardContent>
          </Card>
        );
      })}

      {Array.isArray(checklistList) && checklistList.length === 0 && !isLoading && (
        <p className="text-sm text-slate-400 py-8 text-center">No active checklists found.</p>
      )}
    </div>
  );
}

export default function Checklists() {
  return (
    <div>
      <PageHeader
        title="Checklists"
        description="Manage checklist templates and active instances"
      />
      <Tabs defaultValue="templates">
        <TabsList>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="running">Running</TabsTrigger>
        </TabsList>
        <TabsContent value="templates">
          <TemplatesTab />
        </TabsContent>
        <TabsContent value="running">
          <RunningTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
