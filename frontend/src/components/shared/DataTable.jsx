import { useState } from 'react';
import { ChevronUp, ChevronDown, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { Skeleton } from '../ui/skeleton.jsx';

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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div className="table-card">
        {onSearch && (
          <div className="table-header" style={{ borderBottom: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 6, padding: '6px 12px', minWidth: 220 }}>
              <Search size={14} style={{ color: 'var(--text3)', flexShrink: 0 }} />
              <input
                placeholder={searchPlaceholder}
                onChange={e => onSearch(e.target.value)}
                style={{ border: 'none', background: 'transparent', outline: 'none', color: 'var(--text)', fontSize: 13, fontFamily: 'inherit', width: '100%' }}
              />
            </div>
          </div>
        )}

        <div style={{ overflowX: 'auto' }}>
          <table className="ef-table">
            <thead>
              <tr>
                {columns.map(col => (
                  <th
                    key={col.key}
                    onClick={() => col.sortable !== false && handleSort(col.key)}
                    style={{ cursor: col.sortable !== false ? 'pointer' : 'default', userSelect: 'none' }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      {col.header}
                      {sortCol === col.key && (
                        sortDir === 'asc' ? <ChevronUp size={10} /> : <ChevronDown size={10} />
                      )}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {columns.map(col => (
                      <td key={col.key} style={{ padding: '12px 16px' }}>
                        <Skeleton style={{ height: 16, width: '100%' }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>
                    {emptyState || 'No records found'}
                  </td>
                </tr>
              ) : (
                rows.map((row, i) => (
                  <tr key={row.id || i}>
                    {columns.map(col => (
                      <td key={col.key}>
                        {col.render ? col.render(row[col.key], row) : (row[col.key] ?? '—')}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {(total > pageSize || totalPages > 1) && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, color: 'var(--text3)' }}>
          <span>
            Showing {((currentPage - 1) * pageSize) + 1}–{Math.min(currentPage * pageSize, total)} of {total} results
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <button
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage <= 1}
              style={paginationBtnStyle(currentPage <= 1)}
            >
              <ChevronLeft size={13} />
            </button>
            <span style={{ padding: '0 8px', color: 'var(--text2)', fontSize: 12 }}>Page {currentPage} of {totalPages}</span>
            <button
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage >= totalPages}
              style={paginationBtnStyle(currentPage >= totalPages)}
            >
              <ChevronRight size={13} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function paginationBtnStyle(disabled) {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 28,
    height: 28,
    border: '1px solid var(--border)',
    borderRadius: 6,
    background: 'transparent',
    cursor: disabled ? 'not-allowed' : 'pointer',
    color: disabled ? 'var(--text3)' : 'var(--text2)',
    opacity: disabled ? 0.5 : 1,
  };
}
