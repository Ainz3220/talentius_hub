import { useState, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { documentsApi } from '../../api/index.js';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog.jsx';
import { Button } from '../ui/button.jsx';
import { Input } from '../ui/input.jsx';
import { Label } from '../ui/label.jsx';
import { useToast } from '../ui/toast.jsx';

export function DocumentUploadDialog({ open, onOpenChange, entityType, entityId, queryKey }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const fileRef = useRef(null);
  const [form, setForm] = useState({ documentType: '', expiryDate: '' });

  const uploadMutation = useMutation({
    mutationFn: () => {
      const file = fileRef.current?.files?.[0];
      if (!file) throw new Error('No file selected');
      const fd = new FormData();
      fd.append('file', file);
      fd.append('entityType', entityType);
      fd.append('entityId', entityId);
      fd.append('documentType', form.documentType);
      fd.append('expiryDate', form.expiryDate);
      return documentsApi.upload(fd);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey });
      onOpenChange(false);
      setForm({ documentType: '', expiryDate: '' });
      if (fileRef.current) fileRef.current.value = '';
      toast({ title: 'Document uploaded', type: 'success' });
    },
    onError: (err) => toast({ title: 'Upload failed', description: err.response?.data?.error || err.message, type: 'error' }),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Upload Document</DialogTitle>
        </DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); uploadMutation.mutate(); }} className="px-5 space-y-3">
          <div className="space-y-1">
            <Label>Document Type</Label>
            <Input
              placeholder="e.g. Passport, Work Permit"
              value={form.documentType}
              onChange={(e) => setForm(p => ({ ...p, documentType: e.target.value }))}
              required
            />
          </div>
          <div className="space-y-1">
            <Label>Expiry Date</Label>
            <Input
              type="date"
              value={form.expiryDate}
              onChange={(e) => setForm(p => ({ ...p, expiryDate: e.target.value }))}
              required
            />
          </div>
          <div className="space-y-1">
            <Label>File</Label>
            <Input type="file" ref={fileRef} required />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={uploadMutation.isPending}>
              {uploadMutation.isPending ? 'Uploading...' : 'Upload'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
