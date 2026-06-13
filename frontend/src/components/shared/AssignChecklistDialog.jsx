import { useState } from 'react';
import { X } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { checklists as checklistApi } from '../../api/index.js';

export default function AssignChecklistDialog({ entityType, entityId, onClose }) {
  const [selected, setSelected] = useState('');
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const qc = useQueryClient();

  const { data: templates } = useQuery({
    queryKey: ['checklist-templates'],
    queryFn: () => checklistApi.listTemplates().then(r => r.data),
  });

  const filtered = templates?.filter(t => t.entityType === entityType || t.entityType === entityType) || [];

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim()) { setError('Name is required'); return; }
    setSaving(true);
    try {
      await checklistApi.create({ templateId: selected || undefined, entityType, entityId, name: name.trim() });
      qc.invalidateQueries({ queryKey: ['checklists', entityType, entityId] });
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create checklist');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ width: 420 }}>
        <div className="modal-header">
          <h3 style={{ fontFamily: 'Instrument Serif, serif', fontSize: 18 }}>Assign Checklist</h3>
          <button onClick={onClose} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)' }}>
            <X size={16} />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {error && <div style={{ padding: '8px 12px', background: 'var(--red-light)', color: 'var(--red)', borderRadius: 'var(--r-sm)', fontSize: 13 }}>{error}</div>}
            <div>
              <label className="form-label">Checklist Name <span style={{ color: 'var(--accent2)' }}>*</span></label>
              <input className="form-input" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Onboarding Checklist" />
            </div>
            <div>
              <label className="form-label">Template (optional)</label>
              <select className="form-input" value={selected} onChange={e => setSelected(e.target.value)}>
                <option value="">— Blank checklist —</option>
                {filtered.map(t => <option key={t.id} value={t.id}>{t.name} ({t.items?.length || 0} items)</option>)}
              </select>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Creating…' : 'Create Checklist'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
