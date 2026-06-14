import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, SlidersHorizontal, X, ChevronRight } from 'lucide-react';
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
  text: [
    { value: 'match',   label: 'match'   },
    { value: 'eq',      label: '='       },
    { value: 'include', label: 'in list' },
    { value: 'exclude', label: 'exclude' },
  ],
  select: [
    { value: 'eq',      label: '='       },
    { value: 'include', label: 'in list' },
    { value: 'exclude', label: 'exclude' },
  ],
  boolean: [],
  date: [
    { value: 'eq',      label: '='       },
    { value: 'gt',      label: '>'       },
    { value: 'gte',     label: '>='      },
    { value: 'lt',      label: '<'       },
    { value: 'lte',     label: '<='      },
    { value: 'between', label: 'between' },
  ],
  number: [
    { value: 'eq',      label: '='       },
    { value: 'gt',      label: '>'       },
    { value: 'gte',     label: '>='      },
    { value: 'lt',      label: '<'       },
    { value: 'lte',     label: '<='      },
    { value: 'between', label: 'between' },
  ],
};

function uid() { return Math.random().toString(36).slice(2, 9); }

function defaultValue(field, op) {
  if (field.type === 'boolean') return true;
  if (op === 'between') return ['', ''];
  if (op === 'include' || op === 'exclude') return [];
  return '';
}

function buildParams(conditions, logic) {
  const valid = conditions.filter(c => {
    if (c.fieldKey === 'unassigned') return true;
    if (Array.isArray(c.value)) return c.value.length > 0;
    return c.value !== '' && c.value !== null && c.value !== undefined;
  });
  if (valid.length === 0) return {};
  return {
    filters: JSON.stringify(valid.map(c => ({ field: c.fieldKey, op: c.operator, value: c.value }))),
    logic,
  };
}

// ── Multi-select checkbox dropdown ─────────────────────────────────────────
function MultiSelect({ options = [], value = [], onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const label = value.length === 0
    ? '— select —'
    : value.length === 1
      ? options.find(o => o.value === value[0])?.label ?? value[0]
      : `${value.length} selected`;

  return (
    <div ref={ref} style={{ position: 'relative', minWidth: 160 }}>
      <button type="button" onClick={() => setOpen(o => !o)}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6,
          width: '100%', fontSize: 12, padding: '4px 8px', cursor: 'pointer',
          background: '#fff', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', color: 'var(--text1)' }}>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
        <span style={{ fontSize: 10, opacity: 0.45, flexShrink: 0 }}>▾</span>
      </button>
      {open && (
        <div style={{ position: 'absolute', top: '100%', left: 0, zIndex: 300, marginTop: 2,
          background: '#fff', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)', minWidth: 190, maxHeight: 220, overflowY: 'auto', padding: 4 }}>
          {options.map(opt => {
            const checked = value.includes(opt.value);
            return (
              <label key={opt.value} style={{ display: 'flex', alignItems: 'center', gap: 8,
                padding: '6px 8px', borderRadius: 4, cursor: 'pointer', fontSize: 12, userSelect: 'none' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--hover)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
                <input type="checkbox" checked={checked} onChange={() =>
                  onChange(checked ? value.filter(v => v !== opt.value) : [...value, opt.value])
                } style={{ margin: 0 }} />
                {opt.label}
              </label>
            );
          })}
          {options.length === 0 && <div style={{ padding: '8px 10px', fontSize: 12, color: 'var(--text3)' }}>No options</div>}
        </div>
      )}
    </div>
  );
}

// ── Value input — adapts to field type + operator ─────────────────────────
function ValueInput({ field, operator, value, onChange }) {
  if (field.type === 'boolean') {
    return <span style={{ fontSize: 12, color: 'var(--text3)' }}>is true</span>;
  }

  if (field.type === 'select') {
    if (operator === 'include' || operator === 'exclude') {
      return <MultiSelect options={field.options} value={Array.isArray(value) ? value : []} onChange={onChange} />;
    }
    return (
      <select className="form-input" style={{ fontSize: 12, padding: '4px 8px', minWidth: 160 }}
        value={value} onChange={e => onChange(e.target.value)}>
        <option value="">— select —</option>
        {field.options?.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    );
  }

  if (field.type === 'text') {
    if (operator === 'include' || operator === 'exclude') {
      return (
        <input className="form-input" style={{ fontSize: 12, padding: '4px 8px', minWidth: 200 }}
          placeholder="value1, value2, value3…"
          value={Array.isArray(value) ? value.join(', ') : value}
          onChange={e => onChange(e.target.value.split(',').map(v => v.trim()).filter(Boolean))} />
      );
    }
    return (
      <input className="form-input" style={{ fontSize: 12, padding: '4px 8px', minWidth: 160 }}
        placeholder={`Enter ${field.label.toLowerCase()}…`}
        value={value}
        onChange={e => onChange(e.target.value)} />
    );
  }

  if (field.type === 'date') {
    if (operator === 'between') {
      const [from, to] = Array.isArray(value) ? value : ['', ''];
      return (
        <>
          <input type="date" className="form-input" style={{ fontSize: 12, padding: '4px 8px' }}
            value={from} onChange={e => onChange([e.target.value, to])} />
          <span style={{ fontSize: 11, color: 'var(--text3)' }}>and</span>
          <input type="date" className="form-input" style={{ fontSize: 12, padding: '4px 8px' }}
            value={to} onChange={e => onChange([from, e.target.value])} />
        </>
      );
    }
    return (
      <input type="date" className="form-input" style={{ fontSize: 12, padding: '4px 8px' }}
        value={value} onChange={e => onChange(e.target.value)} />
    );
  }

  if (field.type === 'number') {
    if (operator === 'between') {
      const [from, to] = Array.isArray(value) ? value : ['', ''];
      return (
        <>
          <input type="number" className="form-input" style={{ fontSize: 12, padding: '4px 8px', width: 90 }}
            placeholder="from" value={from} onChange={e => onChange([e.target.value, to])} />
          <span style={{ fontSize: 11, color: 'var(--text3)' }}>and</span>
          <input type="number" className="form-input" style={{ fontSize: 12, padding: '4px 8px', width: 90 }}
            placeholder="to" value={to} onChange={e => onChange([from, e.target.value])} />
        </>
      );
    }
    return (
      <input type="number" className="form-input" style={{ fontSize: 12, padding: '4px 8px', width: 120 }}
        value={value} onChange={e => onChange(e.target.value)} />
    );
  }

  return null;
}

// ── Two-level category/field picker ───────────────────────────────────────
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
    <div ref={ref} style={{ position: 'absolute', top: '100%', left: 0, zIndex: 200, marginTop: 4,
      display: 'flex', background: '#fff', border: '1px solid var(--border)',
      borderRadius: 'var(--r-sm)', boxShadow: '0 4px 16px rgba(0,0,0,0.12)', minWidth: 200 }}>
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
          <div key={field.key} onClick={() => onSelect(field)} style={{ padding: '7px 10px', borderRadius: 4, cursor: 'pointer', fontSize: 12, color: 'var(--text1)' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--hover)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
            {field.label}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Single condition row ───────────────────────────────────────────────────
function ConditionRow({ condition, field, onUpdate, onRemove }) {
  if (!field) return null;
  const operators = OPERATORS[field.type] ?? [];

  function handleOperatorChange(op) {
    onUpdate({ ...condition, operator: op, value: defaultValue(field, op) });
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', flexWrap: 'wrap' }}>
      <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text2)', minWidth: 100 }}>{field.label}</span>
      {operators.length > 0 && (
        <select className="form-input" style={{ width: 'auto', fontSize: 12, padding: '4px 8px' }}
          value={condition.operator} onChange={e => handleOperatorChange(e.target.value)}>
          {operators.map(op => <option key={op.value} value={op.value}>{op.label}</option>)}
        </select>
      )}
      <ValueInput field={field} operator={condition.operator} value={condition.value}
        onChange={val => onUpdate({ ...condition, value: val })} />
      <button onClick={onRemove} style={{ background: 'none', border: 'none', cursor: 'pointer',
        color: 'var(--text3)', padding: 2, borderRadius: 4, display: 'flex', alignItems: 'center',
        marginLeft: 2 }}>
        <X size={14} />
      </button>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────
export default function Expats() {
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ fullName: '', passportNo: '', nationality: '', dateOfBirth: '', phone: '', permitExpiry: '', status: 'PENDING', clientId: '', dormitoryId: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [conditions, setConditions] = useState([]);
  const [debouncedConditions, setDebouncedConditions] = useState([]);
  const [logic, setLogic] = useState('AND');
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

  const filterParams = buildParams(debouncedConditions, logic);

  const { data, isLoading } = useQuery({
    queryKey: ['expats', { status: statusFilter, page, ...filterParams }],
    queryFn: () => expatsApi.list({ status: statusFilter, page, pageSize, ...filterParams }).then(r => r.data),
    keepPreviousData: true,
  });

  function addCondition(field) {
    const ops = OPERATORS[field.type] ?? [];
    const op = ops[0]?.value ?? 'eq';
    setConditions(prev => [...prev, { id: uid(), fieldKey: field.key, operator: op, value: defaultValue(field, op) }]);
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

  const activeFilters = conditions.filter(c => {
    if (c.fieldKey === 'unassigned') return true;
    if (Array.isArray(c.value)) return c.value.length > 0;
    return c.value !== '';
  }).length;

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
                {t.key === statusFilter && data
                  ? <span style={{ marginLeft: 5, fontSize: 11, opacity: 0.7 }}>{data.total}</span>
                  : null}
              </button>
            ))}
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
            <button className="btn btn-outline"
              style={{ background: panelOpen ? 'var(--accent-light)' : undefined, borderColor: panelOpen ? 'var(--accent)' : undefined, color: panelOpen ? 'var(--accent)' : undefined }}
              onClick={() => setPanelOpen(o => !o)}>
              <SlidersHorizontal size={14} />
              {activeFilters > 0 ? `Filters (${activeFilters})` : 'Filters'}
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
            {/* Logic toggle */}
            {conditions.length > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <span style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 500 }}>Match</span>
                {['AND', 'OR'].map(l => (
                  <button key={l} type="button"
                    onClick={() => setLogic(l)}
                    style={{ padding: '3px 10px', borderRadius: 'var(--r-sm)', fontSize: 11, fontWeight: 600, cursor: 'pointer',
                      border: '1px solid', borderColor: logic === l ? 'var(--accent)' : 'var(--border)',
                      background: logic === l ? 'var(--accent-light)' : 'transparent',
                      color: logic === l ? 'var(--accent)' : 'var(--text2)' }}>
                    {l}
                  </button>
                ))}
                <span style={{ fontSize: 11, color: 'var(--text3)' }}>conditions</span>
              </div>
            )}

            {conditions.length === 0 && (
              <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 8 }}>No filters applied. Add a filter below.</div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
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
