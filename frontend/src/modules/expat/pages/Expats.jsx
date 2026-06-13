import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, SlidersHorizontal, X, ChevronRight } from 'lucide-react';
import { expats as expatsApi } from '../../../api/index.js';
import StatusBadge from '../../../components/shared/StatusBadge.jsx';
import { formatDate, daysUntil, getExpiryClass, getInitials, getAvatarColor } from '../../../lib/utils.js';

const STATUS_TABS = [
  { key: '', label: 'All' },
  { key: 'ACTIVE', label: 'Active' },
  { key: 'PENDING', label: 'Pending' },
  { key: 'TRANSFERRED', label: 'Transferred' },
  { key: 'EXPIRED', label: 'Expiring Soon' },
];

const OPERATORS = {
  text:    [{ value: 'contains', label: 'contains' }],
  select:  [{ value: 'eq', label: '=' }],
  boolean: [],
  date:    [{ value: 'before', label: 'before' }, { value: 'after', label: 'after' }, { value: 'between', label: 'between' }],
};

function uid() { return Math.random().toString(36).slice(2, 9); }

function buildParams(conditions) {
  const p = {};
  for (const c of conditions) {
    if (!c.value && c.fieldKey !== 'unassigned') continue;
    if (c.fieldKey === 'permitExpiry') {
      if (c.operator === 'before')  { p.permitExpiryTo   = c.value; }
      if (c.operator === 'after')   { p.permitExpiryFrom = c.value; }
      if (c.operator === 'between' && Array.isArray(c.value)) {
        p.permitExpiryFrom = c.value[0];
        p.permitExpiryTo   = c.value[1];
      }
    } else if (c.fieldKey === 'unassigned') {
      p.unassigned = 'true';
    } else {
      p[c.fieldKey] = c.value;
    }
  }
  return p;
}

function FieldPicker({ schema, onSelect, onClose }) {
  const [hoveredCat, setHoveredCat] = useState(schema?.[0]?.category ?? null);
  const ref = useRef(null);

  useEffect(() => {
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  const activeCat = schema?.find(c => c.category === hoveredCat);

  return (
    <div ref={ref} style={{
      position: 'absolute', top: '100%', left: 0, zIndex: 200, marginTop: 4,
      display: 'flex', background: '#fff', border: '1px solid var(--border)',
      borderRadius: 'var(--r-sm)', boxShadow: '0 4px 16px rgba(0,0,0,0.12)', minWidth: 200,
    }}>
      <div style={{ padding: 4, minWidth: 130, borderRight: '1px solid var(--border)' }}>
        {schema?.map(cat => (
          <div key={cat.category} onMouseEnter={() => setHoveredCat(cat.category)} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '7px 10px', borderRadius: 4, cursor: 'pointer', fontSize: 12, fontWeight: 500,
            background: hoveredCat === cat.category ? 'var(--accent-light)' : 'transparent',
            color: hoveredCat === cat.category ? 'var(--accent)' : 'var(--text1)',
          }}>
            {cat.category}
            <ChevronRight size={12} style={{ opacity: 0.4 }} />
          </div>
        ))}
      </div>
      <div style={{ padding: 4, minWidth: 150 }}>
        {activeCat?.fields?.map(field => (
          <div key={field.key} onClick={() => onSelect(field)} style={{
            padding: '7px 10px', borderRadius: 4, cursor: 'pointer', fontSize: 12, color: 'var(--text1)',
          }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--hover)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
            {field.label}
          </div>
        ))}
      </div>
    </div>
  );
}

function ConditionRow({ condition, field, onUpdate, onRemove }) {
  if (!field) return null;
  const operators = OPERATORS[field.type] ?? [];
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}>
      <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text2)', minWidth: 110 }}>{field.label}</span>
      {operators.length > 0 && (
        <select className="form-input" style={{ width: 'auto', fontSize: 12, padding: '4px 8px' }}
          value={condition.operator}
          onChange={e => onUpdate({ ...condition, operator: e.target.value, value: '' })}>
          {operators.map(op => <option key={op.value} value={op.value}>{op.label}</option>)}
        </select>
      )}
      {field.type === 'select' && (
        <select className="form-input" style={{ fontSize: 12, padding: '4px 8px', minWidth: 160 }}
          value={condition.value}
          onChange={e => onUpdate({ ...condition, value: e.target.value })}>
          <option value="">— select —</option>
          {field.options?.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      )}
      {field.type === 'text' && (
        <input className="form-input" style={{ fontSize: 12, padding: '4px 8px', minWidth: 160 }}
          placeholder={`Enter ${field.label.toLowerCase()}…`}
          value={condition.value}
          onChange={e => onUpdate({ ...condition, value: e.target.value })} />
      )}
      {field.type === 'date' && condition.operator !== 'between' && (
        <input type="date" className="form-input" style={{ fontSize: 12, padding: '4px 8px' }}
          value={condition.value}
          onChange={e => onUpdate({ ...condition, value: e.target.value })} />
      )}
      {field.type === 'date' && condition.operator === 'between' && (
        <>
          <input type="date" className="form-input" style={{ fontSize: 12, padding: '4px 8px' }}
            value={Array.isArray(condition.value) ? condition.value[0] : ''}
            onChange={e => onUpdate({ ...condition, value: [e.target.value, Array.isArray(condition.value) ? condition.value[1] : ''] })} />
          <span style={{ fontSize: 11, color: 'var(--text3)' }}>and</span>
          <input type="date" className="form-input" style={{ fontSize: 12, padding: '4px 8px' }}
            value={Array.isArray(condition.value) ? condition.value[1] : ''}
            onChange={e => onUpdate({ ...condition, value: [Array.isArray(condition.value) ? condition.value[0] : '', e.target.value] })} />
        </>
      )}
      {field.type === 'boolean' && (
        <span style={{ fontSize: 12, color: 'var(--text3)' }}>is true</span>
      )}
      <button onClick={onRemove} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', padding: 2, borderRadius: 4, display: 'flex', alignItems: 'center' }}>
        <X size={14} />
      </button>
    </div>
  );
}

export default function Expats() {
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ fullName: '', passportNo: '', nationality: '', dateOfBirth: '', phone: '', permitExpiry: '', status: 'PENDING', clientId: '', dormitoryId: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [conditions, setConditions] = useState([]);
  const [debouncedConditions, setDebouncedConditions] = useState([]);
  const [panelOpen, setPanelOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedConditions(conditions), 300);
    return () => clearTimeout(t);
  }, [conditions]);

  const pageSize = 25;

  const { data: filterSchema } = useQuery({
    queryKey: ['expats-filter-schema'],
    queryFn: () => expatsApi.filterSchema().then(r => r.data),
    staleTime: 60000,
  });

  const fieldMap = {};
  filterSchema?.forEach(cat => cat.fields.forEach(f => { fieldMap[f.key] = f; }));

  const clientOptions = filterSchema?.find(c => c.category === 'Assignments')?.fields?.find(f => f.key === 'clientId')?.options ?? [];
  const dormOptions   = filterSchema?.find(c => c.category === 'Assignments')?.fields?.find(f => f.key === 'dormitoryId')?.options ?? [];
  const nationalityOptions = filterSchema?.find(c => c.category === 'General')?.fields?.find(f => f.key === 'nationality')?.options ?? [];

  useEffect(() => {
    if (nationalityOptions.length > 0 && !form.nationality) {
      setForm(f => ({ ...f, nationality: nationalityOptions[0]?.value ?? '' }));
    }
  }, [nationalityOptions.length]);

  const filterParams = buildParams(debouncedConditions);

  const { data, isLoading } = useQuery({
    queryKey: ['expats', { status: statusFilter, search, page, ...filterParams }],
    queryFn: () => expatsApi.list({ status: statusFilter, search, page, pageSize, ...filterParams }).then(r => r.data),
    keepPreviousData: true,
  });

  function addCondition(field) {
    const ops = OPERATORS[field.type] ?? [];
    setConditions(prev => [...prev, { id: uid(), fieldKey: field.key, operator: ops[0]?.value ?? 'eq', value: field.type === 'boolean' ? true : '' }]);
    setPickerOpen(false);
    if (!panelOpen) setPanelOpen(true);
  }

  function updateCondition(updated) {
    setConditions(prev => prev.map(c => c.id === updated.id ? updated : c));
  }

  function removeCondition(id) {
    setConditions(prev => prev.filter(c => c.id !== id));
  }

  async function handleCreate(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await expatsApi.create(form);
      qc.invalidateQueries({ queryKey: ['expats'] });
      qc.invalidateQueries({ queryKey: ['expats-filter-schema'] });
      setShowCreate(false);
      setForm({ fullName: '', passportNo: '', nationality: nationalityOptions[0]?.value ?? '', dateOfBirth: '', phone: '', permitExpiry: '', status: 'PENDING', clientId: '', dormitoryId: '' });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create expat');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="table-card">
        {/* Toolbar */}
        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <h3 style={{ fontSize: 14, fontWeight: 600 }}>Expats</h3>
          <div className="tab-group" style={{ marginLeft: 8 }}>
            {STATUS_TABS.map(t => (
              <button key={t.key} className={`tab-item${statusFilter === t.key ? ' active' : ''}`}
                style={{ padding: '5px 12px', fontSize: 12 }}
                onClick={() => { setStatusFilter(t.key); setPage(1); }}>
                {t.label}
                {t.key === statusFilter && data ? (
                  <span style={{ marginLeft: 5, fontSize: 11, opacity: 0.7 }}>{data.total}</span>
                ) : null}
              </button>
            ))}
          </div>
          <div className="search-box" style={{ minWidth: 200 }}>
            <Search size={14} style={{ color: 'var(--text3)' }} />
            <input placeholder="Search by name…" value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }} />
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
            <button className="btn btn-outline" style={{ background: panelOpen ? 'var(--accent-light)' : undefined, borderColor: panelOpen ? 'var(--accent)' : undefined, color: panelOpen ? 'var(--accent)' : undefined }}
              onClick={() => setPanelOpen(o => !o)}>
              <SlidersHorizontal size={14} />
              {conditions.length > 0 ? `Filters (${conditions.length})` : 'Filters'}
            </button>
            <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
              <Plus size={14} />
              Add Expat
            </button>
          </div>
        </div>

        {/* Filter panel */}
        {panelOpen && (
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', background: 'var(--bg2)' }}>
            {conditions.length === 0 && (
              <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 8 }}>No filters applied. Add a filter below.</div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {conditions.map(c => (
                <ConditionRow key={c.id} condition={c} field={fieldMap[c.fieldKey]}
                  onUpdate={updateCondition} onRemove={() => removeCondition(c.id)} />
              ))}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: conditions.length > 0 ? 10 : 0 }}>
              <div style={{ position: 'relative' }}>
                <button className="btn btn-outline btn-sm" onClick={() => setPickerOpen(o => !o)}>
                  <Plus size={12} /> Add filter
                </button>
                {pickerOpen && filterSchema && (
                  <FieldPicker schema={filterSchema} onSelect={addCondition} onClose={() => setPickerOpen(false)} />
                )}
              </div>
              {conditions.length > 0 && (
                <button style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--text3)' }}
                  onClick={() => { setConditions([]); setDebouncedConditions([]); }}>
                  Clear all
                </button>
              )}
            </div>
          </div>
        )}

        <table>
          <thead>
            <tr>
              <th>Name</th><th>Passport</th><th>Client</th><th>Dormitory</th>
              <th>Status</th><th>Permit Expiry</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && [1,2,3,4,5].map(i => (
              <tr key={i} style={{ pointerEvents: 'none' }}>
                {[1,2,3,4,5,6].map(j => (
                  <td key={j}><div className="skeleton" style={{ height: 14, width: '70%', borderRadius: 4 }} /></td>
                ))}
              </tr>
            ))}
            {!isLoading && data?.items?.map(expat => {
              const days = daysUntil(expat.permitExpiry);
              return (
                <tr key={expat.id} onClick={() => navigate(`/expats/${expat.id}`)}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div className={`avatar ${getAvatarColor(expat.fullName)}`}>{getInitials(expat.fullName)}</div>
                      <div>
                        <div style={{ fontWeight: 500, fontSize: 13 }}>{expat.fullName}</div>
                        <div style={{ fontSize: 11, color: 'var(--text3)' }}>{expat.nationality}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--text2)' }}>{expat.passportNo}</td>
                  <td style={{ fontSize: 13, color: 'var(--text2)' }}>{expat.client?.name || '—'}</td>
                  <td style={{ fontSize: 13, color: 'var(--text2)' }}>{expat.dormitory?.name || '—'}</td>
                  <td><StatusBadge status={expat.status} /></td>
                  <td>
                    <span className={getExpiryClass(days)}>
                      {expat.permitExpiry ? formatDate(expat.permitExpiry) : '—'}
                      {days !== null && days <= 30 && days > 0 ? ` ⚠` : ''}
                      {days !== null && days <= 0 ? ' 🚨' : ''}
                    </span>
                  </td>
                </tr>
              );
            })}
            {!isLoading && !data?.items?.length && (
              <tr><td colSpan={6}><div className="empty-state"><div style={{ fontSize: 32, marginBottom: 12 }}>👤</div><div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text2)' }}>No expats found</div></div></td></tr>
            )}
          </tbody>
        </table>
        {(data?.total || 0) > pageSize && (
          <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'flex-end' }}>
            <button className="btn btn-outline btn-sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>‹ Prev</button>
            <span style={{ fontSize: 12, color: 'var(--text2)' }}>Page {page} of {Math.ceil(data.total / pageSize)}</span>
            <button className="btn btn-outline btn-sm" disabled={page * pageSize >= data.total} onClick={() => setPage(p => p + 1)}>Next ›</button>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowCreate(false)}>
          <div className="modal">
            <div className="modal-header">
              <h3 style={{ fontFamily: 'Instrument Serif, serif', fontSize: 18 }}>Add New Expat</h3>
              <button onClick={() => setShowCreate(false)} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', fontSize: 18 }}>×</button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {error && <div style={{ padding: '8px 12px', background: 'var(--red-light)', color: 'var(--red)', borderRadius: 'var(--r-sm)', fontSize: 13 }}>{error}</div>}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label className="form-label">Full Name <span style={{ color: 'var(--accent2)' }}>*</span></label>
                    <input className="form-input" placeholder="As per passport" required value={form.fullName} onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))} />
                  </div>
                  <div>
                    <label className="form-label">Nationality <span style={{ color: 'var(--accent2)' }}>*</span></label>
                    <select className="form-input" value={form.nationality} onChange={e => setForm(f => ({ ...f, nationality: e.target.value }))}>
                      {nationalityOptions.map(n => <option key={n.value} value={n.value}>{n.label}</option>)}
                    </select>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label className="form-label">Passport Number <span style={{ color: 'var(--accent2)' }}>*</span></label>
                    <input className="form-input" placeholder="Passport no." required value={form.passportNo} onChange={e => setForm(f => ({ ...f, passportNo: e.target.value }))} />
                    <div className="enc-hint">Stored encrypted</div>
                  </div>
                  <div>
                    <label className="form-label">Date of Birth</label>
                    <input type="date" className="form-input" value={form.dateOfBirth} onChange={e => setForm(f => ({ ...f, dateOfBirth: e.target.value }))} />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label className="form-label">Phone</label>
                    <input className="form-input" placeholder="+60 12 345 6789" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
                  </div>
                  <div>
                    <label className="form-label">Permit Expiry</label>
                    <input type="date" className="form-input" value={form.permitExpiry} onChange={e => setForm(f => ({ ...f, permitExpiry: e.target.value }))} />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label className="form-label">Assign to Client</label>
                    <select className="form-input" value={form.clientId} onChange={e => setForm(f => ({ ...f, clientId: e.target.value }))}>
                      <option value="">— Unassigned —</option>
                      {clientOptions.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="form-label">Assign to Dormitory</label>
                    <select className="form-input" value={form.dormitoryId} onChange={e => setForm(f => ({ ...f, dormitoryId: e.target.value }))}>
                      <option value="">— None —</option>
                      {dormOptions.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="form-label">Initial Status</label>
                  <select className="form-input" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                    <option value="PENDING">Pending</option>
                    <option value="ACTIVE">Active</option>
                  </select>
                </div>
                <div style={{ background: 'var(--accent-light)', border: '1px solid rgba(31,78,61,0.15)', borderRadius: 'var(--r-sm)', padding: '10px 12px', fontSize: 12, color: 'var(--accent)' }}>
                  ✓ Onboarding checklist will be auto-created from current templates
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowCreate(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Creating…' : 'Create Expat'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
