import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, X } from 'lucide-react';
import { checklistsApi } from '../../api/index.js';
import { StatusBadge } from './StatusBadge.jsx';
import { useToast } from '../ui/toast.jsx';
import { formatDate } from '../../lib/utils.js';

export function ChecklistCard({ checklist, queryKey }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const done = checklist.items?.filter(i => i.status === 'DONE' || i.status === 'WAIVED').length ?? 0;
  const total = checklist.items?.length ?? 0;
  const pct = total ? Math.round((done / total) * 100) : 0;

  const updateItem = useMutation({
    mutationFn: ({ itemId, data }) => checklistsApi.updateItem(checklist.id, itemId, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey }); },
    onError: (err) => toast({ title: 'Error', description: err.response?.data?.error, type: 'error' }),
  });

  return (
    <div className="table-card" style={{ marginBottom: 12 }}>
      <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--text)' }}>{checklist.name}</span>
          <StatusBadge status={checklist.status} />
        </div>
        <div style={{ background: 'var(--surface3)', borderRadius: 4, height: 5, marginBottom: 6 }}>
          <div style={{ width: `${pct}%`, height: 5, borderRadius: 4, background: 'var(--accent)', transition: 'width 0.4s' }} />
        </div>
        <span style={{ fontSize: 11, color: 'var(--text3)' }}>{done}/{total} items complete</span>
      </div>

      <div style={{ padding: '8px 0' }}>
        {(!checklist.items || checklist.items.length === 0) && (
          <div style={{ padding: '20px 16px', textAlign: 'center', fontSize: 13, color: 'var(--text3)' }}>
            No items in this checklist.
          </div>
        )}
        {checklist.items?.map(item => {
          const isOverdue = item.overdueSince && item.status === 'PENDING';
          const isDone = item.status === 'DONE' || item.status === 'WAIVED';
          return (
            <div
              key={item.id}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 10,
                padding: '8px 16px',
                borderBottom: '1px solid var(--border)',
                background: isOverdue ? 'var(--amber-light)' : 'transparent',
                fontSize: 13,
              }}
            >
              <div
                style={{
                  width: 17,
                  height: 17,
                  borderRadius: 4,
                  flexShrink: 0,
                  border: `1.5px solid ${isDone ? 'var(--accent)' : 'var(--border2)'}`,
                  background: isDone ? 'var(--accent)' : 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginTop: 1,
                }}
              >
                {isDone && <Check size={9} color="#fff" strokeWidth={3} />}
              </div>

              <div style={{ flex: 1 }}>
                <span style={{ color: isDone ? 'var(--text3)' : 'var(--text)', textDecoration: isDone ? 'line-through' : 'none' }}>
                  {item.itemText}
                </span>
                {item.notes && (
                  <div style={{ fontSize: 11, fontStyle: 'italic', color: 'var(--text3)', marginTop: 2 }}>{item.notes}</div>
                )}
                {isOverdue && (
                  <div style={{ fontSize: 11, color: 'var(--amber)', marginTop: 2 }}>
                    Overdue since {formatDate(item.overdueSince)}
                  </div>
                )}
                {item.completedAt && (
                  <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>
                    Completed {formatDate(item.completedAt)}
                  </div>
                )}
              </div>

              {item.status === 'PENDING' && (
                <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                  <button
                    onClick={() => updateItem.mutate({ itemId: item.id, data: { status: 'DONE' } })}
                    title="Mark done"
                    style={{ width: 26, height: 26, borderRadius: 4, background: 'var(--green-light)', color: 'var(--green)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <Check size={12} />
                  </button>
                  <button
                    onClick={() => updateItem.mutate({ itemId: item.id, data: { status: 'WAIVED', waivedReason: 'Waived by user' } })}
                    title="Waive"
                    style={{ width: 26, height: 26, borderRadius: 4, background: 'var(--surface2)', color: 'var(--text3)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <X size={12} />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
