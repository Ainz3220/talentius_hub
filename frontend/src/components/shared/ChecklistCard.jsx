import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, X } from 'lucide-react';
import { checklistsApi } from '../../api/index.js';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card.jsx';
import { Progress } from '../ui/progress.jsx';
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
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">{checklist.name}</CardTitle>
          <StatusBadge status={checklist.status} />
        </div>
        <div className="space-y-1">
          <Progress value={pct} />
          <p className="text-xs text-slate-500">{done}/{total} items complete</p>
        </div>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {checklist.items?.map(item => (
            <li
              key={item.id}
              className={`flex items-start gap-3 rounded-md p-2 ${
                item.overdueSince && item.status === 'PENDING'
                  ? 'bg-amber-50 border border-amber-200'
                  : 'bg-slate-50'
              }`}
            >
              <div className="flex-1">
                <p className={`text-sm ${item.status === 'DONE' ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                  {item.itemText}
                </p>
                {item.notes && (
                  <p className="text-xs italic text-slate-400 mt-0.5">{item.notes}</p>
                )}
                {item.overdueSince && item.status === 'PENDING' && (
                  <p className="text-xs text-amber-600 mt-0.5">
                    Overdue since {formatDate(item.overdueSince)}
                  </p>
                )}
                {item.completedAt && (
                  <p className="text-xs text-slate-400 mt-0.5">
                    Completed {formatDate(item.completedAt)}
                  </p>
                )}
              </div>
              {item.status === 'PENDING' && (
                <div className="flex gap-1 shrink-0">
                  <button
                    onClick={() => updateItem.mutate({ itemId: item.id, data: { status: 'DONE' } })}
                    className="h-7 w-7 rounded bg-green-100 text-green-700 hover:bg-green-200 flex items-center justify-center"
                  >
                    <Check size={12} />
                  </button>
                  <button
                    onClick={() => updateItem.mutate({ itemId: item.id, data: { status: 'WAIVED', waivedReason: 'Waived by user' } })}
                    className="h-7 w-7 rounded bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center"
                  >
                    <X size={12} />
                  </button>
                </div>
              )}
            </li>
          ))}
          {(!checklist.items || checklist.items.length === 0) && (
            <li className="text-sm text-slate-400 text-center py-4">No items in this checklist.</li>
          )}
        </ul>
      </CardContent>
    </Card>
  );
}
