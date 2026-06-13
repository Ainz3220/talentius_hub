import { useState } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { Plus, ChevronDown, ChevronRight, Trash2 } from 'lucide-react';
import { checklists as checklistApi } from '../../../api/index.js';
import { useAuthStore } from '../../../store/authStore.js';

const TABS = ['Templates', 'Running Instances'];
const ENTITY_TYPES = ['EXPAT', 'CLIENT', 'DORMITORY'];

function TemplateItem({ item, onDelete }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: 'var(--surface2)', borderRadius: 'var(--r-sm)', marginBottom: 6 }}>
      <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--text3)', flexShrink: 0 }} />
      <span style={{ flex: 1, fontSize: 13 }}>{item.itemText}</span>
      {item.notes && <span style={{ fontSize: 11, color: 'var(--text3)' }}>{item.notes}</span>}
      <button onClick={() => onDelete(item.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', padding: 2 }}>
        <Trash2 size={13} />
      </button>
    </div>
  );
}

function TemplateCard({ template }) {
  const [expanded, setExpanded] = useState(false);
  const [showAddItem, setShowAddItem] = useState(false);
  const [newItem, setNewItem] = useState({ itemText: '', notes: '' });
  const qc = useQueryClient();

  async function addItem(e) {
    e.preventDefault();
    await checklistApi.addTemplateItem(template.id, newItem);
    qc.invalidateQueries({ queryKey: ['checklist-templates'] });
    setNewItem({ itemText: '', notes: '' });
    setShowAddItem(false);
  }

  async function deleteItem(itemId) {
    await checklistApi.deleteTemplateItem(template.id, itemId);
    qc.invalidateQueries({ queryKey: ['checklist-templates'] });
  }

  async function deleteTemplate() {
    if (!window.confirm(`Delete template "${template.name}"?`)) return;
    await checklistApi.deleteTemplate(template.id);
    qc.invalidateQueries({ queryKey: ['checklist-templates'] });
  }

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', overflow: 'hidden', marginBottom: 12 }}>
      <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }} onClick={() => setExpanded(e => !e)}>
        {expanded ? <ChevronDown size={16} color="var(--text3)" /> : <ChevronRight size={16} color="var(--text3)" />}
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, fontSize: 14 }}>{template.name}</div>
          <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>{template.entityType} · {template.items?.length || 0} items{template.scope === 'GLOBAL' ? ' · Auto-assigned' : ''}</div>
        </div>
        {template.scope === 'GLOBAL' && <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 10, background: 'var(--accent-light)', color: 'var(--accent)', fontWeight: 600 }}>GLOBAL</span>}
        <button onClick={e => { e.stopPropagation(); deleteTemplate(); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', padding: '4px 6px' }}>
          <Trash2 size={14} />
        </button>
      </div>
      {expanded && (
        <div style={{ padding: '0 16px 14px' }}>
          {template.items?.map(item => (
            <TemplateItem key={item.id} item={item} templateId={template.id} onDelete={deleteItem} />
          ))}
          {!template.items?.length && <div style={{ fontSize: 12, color: 'var(--text3)', padding: '8px 0' }}>No items yet</div>}
          {showAddItem ? (
            <form onSubmit={addItem} style={{ display: 'flex', gap: 8, marginTop: 10, alignItems: 'flex-end' }}>
              <div style={{ flex: 1 }}>
                <input className="form-input" style={{ fontSize: 12 }} placeholder="Item text…" required value={newItem.itemText} onChange={e => setNewItem(f => ({ ...f, itemText: e.target.value }))} />
              </div>
              <input className="form-input" style={{ fontSize: 12, width: 140 }} placeholder="Notes (optional)" value={newItem.notes} onChange={e => setNewItem(f => ({ ...f, notes: e.target.value }))} />
              <button type="submit" className="btn btn-primary btn-sm" style={{ padding: '5px 12px', fontSize: 12 }}>Add</button>
              <button type="button" className="btn btn-outline btn-sm" style={{ padding: '5px 10px', fontSize: 12 }} onClick={() => setShowAddItem(false)}>Cancel</button>
            </form>
          ) : (
            <button className="btn btn-outline btn-sm" style={{ marginTop: 8, fontSize: 12 }} onClick={() => setShowAddItem(true)}>
              <Plus size={12} /> Add Item
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function InstanceRow({ inst }) {
  const completed = inst.items?.filter(i => i.status === 'DONE' || i.status === 'WAIVED').length || 0;
  const total = inst.items?.length || 0;
  const pct = total ? Math.round((completed / total) * 100) : 0;
  return (
    <tr>
      <td>
        <div style={{ fontWeight: 500, fontSize: 13 }}>{inst.template?.name || 'Untitled'}</div>
        <div style={{ fontSize: 11, color: 'var(--text3)' }}>{inst.entityType} · {inst.entityId?.slice(0, 8)}…</div>
      </td>
      <td>
        <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 'var(--r-sm)', background: inst.entityType === 'EXPAT' ? 'rgba(31,78,61,0.08)' : inst.entityType === 'CLIENT' ? 'rgba(196,82,26,0.08)' : 'rgba(100,100,120,0.08)', color: inst.entityType === 'EXPAT' ? 'var(--accent)' : inst.entityType === 'CLIENT' ? 'var(--accent2)' : 'var(--text2)' }}>
          {inst.entityType}
        </span>
      </td>
      <td>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 80, height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ width: `${pct}%`, height: '100%', background: pct === 100 ? 'var(--green)' : 'var(--accent)', borderRadius: 3 }} />
          </div>
          <span style={{ fontSize: 11, color: 'var(--text3)' }}>{completed}/{total}</span>
        </div>
      </td>
      <td>
        <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, background: inst.status === 'COMPLETED' ? 'rgba(0,160,90,0.1)' : 'rgba(196,82,26,0.08)', color: inst.status === 'COMPLETED' ? 'var(--green)' : 'var(--amber)', fontWeight: 600 }}>
          {inst.status}
        </span>
      </td>
    </tr>
  );
}

export default function Checklists() {
  const { hasRole } = useAuthStore();
  const isSuperAdmin = hasRole('SUPER_ADMIN');
  const qc = useQueryClient();
  const [tab, setTab] = useState('Templates');
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', entityType: 'EXPAT', scope: 'CUSTOM' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const { data: templates } = useQuery({
    queryKey: ['checklist-templates'],
    queryFn: () => checklistApi.listTemplates().then(r => r.data),
    enabled: tab === 'Templates',
  });

  const { data: instances } = useQuery({
    queryKey: ['checklist-instances'],
    queryFn: () => checklistApi.list({}).then(r => r.data),
    enabled: tab === 'Running Instances',
  });

  async function handleCreate(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await checklistApi.createTemplate(form);
      qc.invalidateQueries({ queryKey: ['checklist-templates'] });
      setShowCreate(false);
      setForm({ name: '', entityType: 'EXPAT', scope: 'CUSTOM' });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create template');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <div className="tab-group">
          {TABS.map(t => <button key={t} className={`tab-item${tab===t?' active':''}`} onClick={() => setTab(t)}>{t}</button>)}
        </div>
        {tab === 'Templates' && isSuperAdmin && (
          <div style={{ marginLeft: 'auto' }}>
            <button className="btn btn-primary" onClick={() => setShowCreate(true)}><Plus size={14} /> New Template</button>
          </div>
        )}
      </div>

      {tab === 'Templates' && (
        <div>
          {!isSuperAdmin && (
            <div style={{ padding: '10px 14px', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--r)', fontSize: 13, color: 'var(--text3)', marginBottom: 16 }}>
              Template management is restricted to Super Admins.
            </div>
          )}
          {!templates?.length && <div style={{ textAlign: 'center', padding: 40, color: 'var(--text3)' }}>No templates created yet.</div>}
          {templates?.map(t => <TemplateCard key={t.id} template={t} />)}
        </div>
      )}

      {tab === 'Running Instances' && (
        <div className="table-card">
          <table>
            <thead><tr><th>Checklist</th><th>Entity</th><th>Progress</th><th>Status</th></tr></thead>
            <tbody>
              {!instances?.length && <tr><td colSpan={4}><div className="empty-state"><div style={{ fontSize: 32, marginBottom: 12 }}>✅</div><div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text2)' }}>No running checklists</div></div></td></tr>}
              {instances?.map(inst => <InstanceRow key={inst.id} inst={inst} />)}
            </tbody>
          </table>
        </div>
      )}

      {showCreate && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowCreate(false)}>
          <div className="modal">
            <div className="modal-header">
              <h3 style={{ fontFamily: 'Instrument Serif, serif', fontSize: 18 }}>New Checklist Template</h3>
              <button onClick={() => setShowCreate(false)} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: 'var(--text3)' }}>×</button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {error && <div style={{ padding: '8px 12px', background: 'var(--red-light)', color: 'var(--red)', borderRadius: 'var(--r-sm)', fontSize: 13 }}>{error}</div>}
                <div>
                  <label className="form-label">Template Name <span style={{ color: 'var(--accent2)' }}>*</span></label>
                  <input className="form-input" required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Expat Onboarding Checklist" />
                </div>
                <div>
                  <label className="form-label">Entity Type <span style={{ color: 'var(--accent2)' }}>*</span></label>
                  <select className="form-input" value={form.entityType} onChange={e => setForm(f => ({ ...f, entityType: e.target.value }))}>
                    {ENTITY_TYPES.map(et => <option key={et} value={et}>{et}</option>)}
                  </select>
                </div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
                  <input type="checkbox" checked={form.scope === 'GLOBAL'} onChange={e => setForm(f => ({ ...f, scope: e.target.checked ? 'GLOBAL' : 'CUSTOM' }))} />
                  <div>
                    <div style={{ fontWeight: 500 }}>Auto-assign (Global)</div>
                    <div style={{ fontSize: 11, color: 'var(--text3)' }}>Automatically attached when a new entity of this type is created</div>
                  </div>
                </label>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowCreate(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Creating…' : 'Create Template'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
