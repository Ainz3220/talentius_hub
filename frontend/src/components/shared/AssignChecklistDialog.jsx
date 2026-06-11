import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { checklistsApi } from '../../api/index.js';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog.jsx';
import { Button } from '../ui/button.jsx';
import { Input } from '../ui/input.jsx';
import { Label } from '../ui/label.jsx';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../ui/select.jsx';
import { useToast } from '../ui/toast.jsx';

export function AssignChecklistDialog({ open, onOpenChange, entityType, entityId, queryKey }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [templateId, setTemplateId] = useState('');
  const [name, setName] = useState('');

  const { data: templates } = useQuery({
    queryKey: ['checklist-templates', entityType],
    queryFn: () => checklistsApi.listTemplates({ entityType, isActive: true }),
    enabled: open,
  });

  const templateList = templates?.data || templates || [];

  function handleTemplateChange(id) {
    setTemplateId(id);
    const tmpl = templateList.find(t => t.id === id);
    if (tmpl) setName(tmpl.name);
  }

  const assignMutation = useMutation({
    mutationFn: () => checklistsApi.create({ templateId: templateId || undefined, entityType, entityId, name }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey });
      onOpenChange(false);
      setTemplateId('');
      setName('');
      toast({ title: 'Checklist assigned', type: 'success' });
    },
    onError: (err) => toast({ title: 'Failed to assign checklist', description: err.response?.data?.error, type: 'error' }),
  });

  function handleClose() {
    onOpenChange(false);
    setTemplateId('');
    setName('');
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Assign Checklist</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => { e.preventDefault(); assignMutation.mutate(); }}
          className="px-5 space-y-3"
        >
          <div className="space-y-1">
            <Label>Template</Label>
            <Select value={templateId} onValueChange={handleTemplateChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select a template" />
              </SelectTrigger>
              <SelectContent>
                {templateList.map(t => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name} ({t.items?.length ?? 0} items)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {templateList.length === 0 && (
              <p className="text-xs text-slate-400">No active templates for {entityType}.</p>
            )}
          </div>
          <div className="space-y-1">
            <Label>Checklist Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Name for this checklist instance"
              required
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>Cancel</Button>
            <Button type="submit" disabled={assignMutation.isPending || !name.trim()}>
              {assignMutation.isPending ? 'Assigning...' : 'Assign'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
