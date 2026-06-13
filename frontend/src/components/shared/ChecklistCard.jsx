import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { checklists as checklistApi } from '../../api/index.js';
import StatusBadge from './StatusBadge.jsx';
import { Check, Minus, AlertCircle } from 'lucide-react';

export default function ChecklistCard({ checklist, entityType, entityId }) {
  const qc = useQueryClient();
  const [expanding, setExpanding] = useState(false);
  const [updating, setUpdating] = useState(null);
  const [confirmItem, setConfirmItem] = useState(null);

  const items = checklist.items || [];
  const done = items.filter(i => i.status === 'DONE' || i.status === 'WAIVED').length;
  const total = items.length;
  const pct = total ? Math.round((done / total) * 100) : 0;
  const overdue = items.filter(i => i.status === 'PENDING' && i.overdueSince).length;

  function handleToggle(item) {
    if (item.status === 'DONE') {
      setConfirmItem(item);
    } else {
      doUpdate(item, 'DONE');
    }
  }

  async function doUpdate(item, nextStatus) {
    setUpdating(item.id);
    try {
      await checklistApi.updateItem(checklist.id, item.id, { status: nextStatus });
      qc.invalidateQueries({ queryKey: ['checklists', entityType, entityId] });
    } finally {
      setUpdating(null);
    }
  }

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '14px 18px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10 }}
        onClick={() => setExpanding(e => !e)}
      >
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <span style={{ fontWeight: 600, fontSize: 13 }}>{checklist.name}</span>
            <StatusBadge status={checklist.status} />
            {overdue > 0 && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, color: 'var(--accent2)' }}>
                <AlertCircle size={12} />
                {overdue} overdue
              </span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div className="progress-bar-track" style={{ flex: 1, height: 5 }}>
              <div className="progress-bar-fill" style={{ width: `${pct}%`, background: pct === 100 ? 'var(--green)' : 'var(--accent)' }} />
            </div>
            <span style={{ fontSize: 12, color: 'var(--text3)', whiteSpace: 'nowrap' }}>{done}/{total}</span>
          </div>
        </div>
        <div style={{ fontSize: 11, color: 'var(--text3)', transform: expanding ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>▼</div>
      </div>

      {/* Items */}
      {expanding && (
        <div style={{ borderTop: '1px solid var(--border)' }}>
          {items.map(item => (
            <div key={item.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 18px', borderBottom: '1px solid var(--border)' }}>
              <button
                className={`cb${item.status === 'DONE' ? ' done' : item.status === 'WAIVED' ? ' waived' : ''}`}
                onClick={() => handleToggle(item)}
                disabled={updating === item.id || checklist.status === 'ARCHIVED'}
                style={{ marginTop: 1, cursor: checklist.status === 'ARCHIVED' ? 'not-allowed' : 'pointer' }}
              >
                {item.status === 'DONE' && <Check size={10} stroke="#fff" strokeWidth={3} />}
                {item.status === 'WAIVED' && <Minus size={10} stroke="var(--amber)" strokeWidth={3} />}
              </button>
              <div style={{ flex: 1 }}>
                <div style={{
                  fontSize: 13,
                  color: item.status === 'DONE' ? 'var(--text3)' : item.status === 'WAIVED' ? 'var(--amber)' : 'var(--text)',
                  textDecoration: item.status === 'DONE' ? 'line-through' : 'none',
                }}>
                  {item.itemText}
                </div>
                {item.status === 'DONE' && item.completedByName && (
                  <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 3 }}>
                    ✓ {item.completedByName} · {new Date(item.completedAt).toLocaleString()}
                  </div>
                )}
                {item.status === 'WAIVED' && item.waivedByName && (
                  <div style={{ fontSize: 10, color: 'var(--amber)', marginTop: 3 }}>
                    Waived by {item.waivedByName}{item.waivedReason ? ` — ${item.waivedReason}` : ''}
                  </div>
                )}
              </div>
              {item.overdueSince && item.status === 'PENDING' && (
                <span style={{ fontSize: 10, color: 'var(--accent2)', whiteSpace: 'nowrap' }}>Overdue</span>
              )}
            </div>
          ))}
          {items.length === 0 && (
            <div style={{ padding: '16px 18px', color: 'var(--text3)', fontSize: 13 }}>No items in this checklist.</div>
          )}
        </div>
      )}
      {confirmItem && (
        <div className="modal-overlay" onClick={() => setConfirmItem(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 360 }}>
            <div className="modal-header">
              <h3 style={{ fontFamily: 'Instrument Serif, serif', fontSize: 17 }}>Uncheck item?</h3>
              <button onClick={() => setConfirmItem(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: 'var(--text3)' }}>×</button>
            </div>
            <div className="modal-body" style={{ fontSize: 13, color: 'var(--text2)' }}>
              <strong>"{confirmItem.itemText}"</strong> is already marked as done. Are you sure you want to uncheck it?
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setConfirmItem(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={() => { doUpdate(confirmItem, 'PENDING'); setConfirmItem(null); }}>Yes, uncheck</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
