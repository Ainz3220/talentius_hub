import { useState } from 'react';
import { ChevronUp, ChevronDown, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { Input } from '../ui/input.jsx';
import { Button } from '../ui/button.jsx';
import { Skeleton } from '../ui/skeleton.jsx';
import { cn } from '../../lib/utils.js';

export function DataTable({
  columns,
  data = [],
  loading,
  emptyState,
  total,
  page,
  pageSize,
  onPageChange,
  onSearch,
  searchPlaceholder = 'Search...',
}) {
  const [sortCol, setSortCol] = useState(null);
  const [sortDir, setSortDir] = useState('asc');

  const handleSort = (key) => {
    if (sortCol === key) setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortCol(key); setSortDir('asc'); }
  };

  let rows = [...data];
  if (sortCol) {
    rows.sort((a, b) => {
      const av = a[sortCol], bv = b[sortCol];
      if (av == null) return 1;
      if (bv == null) return -1;
      const r = String(av).localeCompare(String(bv), undefined, { numeric: true });
      return sortDir === 'asc' ? r : -r;
    });
  }

  const totalPages = Math.ceil((total || data.length) / (pageSize || 25));
  const currentPage = page || 1;

  return (
    <div className="flex flex-col gap-3">
      {onSearch && (
        <div className="relative max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            className="pl-9"
            placeholder={searchPlaceholder}
            onChange={e => onSearch(e.target.value)}
          />
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              {columns.map(col => (
                <th
                  key={col.key}
                  className={cn(
                    'px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wide whitespace-nowrap',
                    col.sortable !== false && 'cursor-pointer select-none hover:text-slate-700'
                  )}
                  onClick={() => col.sortable !== false && handleSort(col.key)}
                >
                  <span className="flex items-center gap-1">
                    {col.header}
                    {sortCol === col.key && (
                      sortDir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  {columns.map(col => (
                    <td key={col.key} className="px-4 py-3">
                      <Skeleton className="h-4 w-full" />
                    </td>
                  ))}
                </tr>
              ))
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="py-12 text-center text-slate-400">
                  {emptyState || 'No records found'}
                </td>
              </tr>
            ) : (
              rows.map((row, i) => (
                <tr key={row.id || i} className="hover:bg-slate-50 transition-colors">
                  {columns.map(col => (
                    <td key={col.key} className="px-4 py-3 whitespace-nowrap">
                      {col.render ? col.render(row[col.key], row) : (row[col.key] ?? '—')}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {(total > pageSize || totalPages > 1) && (
        <div className="flex items-center justify-between text-sm text-slate-500">
          <span>
            Showing {((currentPage - 1) * pageSize) + 1}–{Math.min(currentPage * pageSize, total)} of {total} results
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage <= 1}
            >
              <ChevronLeft size={14} />
            </Button>
            <span className="px-2">Page {currentPage} of {totalPages}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage >= totalPages}
            >
              <ChevronRight size={14} />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
