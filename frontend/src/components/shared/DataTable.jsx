import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function DataTable({ columns, data, onRowClick, loading, emptyMessage = 'No records found', total, page, pageSize, onPageChange }) {
  const totalPages = Math.ceil((total || data?.length || 0) / (pageSize || 25));

  if (loading) {
    return (
      <div className="table-card">
        <table>
          <thead>
            <tr>{columns.map(c => <th key={c.key}>{c.label}</th>)}</tr>
          </thead>
          <tbody>
            {[1,2,3,4,5].map(i => (
              <tr key={i} style={{ pointerEvents: 'none' }}>
                {columns.map(c => (
                  <td key={c.key}>
                    <div className="skeleton" style={{ height: 14, width: c.width || '80%', borderRadius: 4 }} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="table-card">
      <table>
        <thead>
          <tr>{columns.map(c => <th key={c.key} style={c.style}>{c.label}</th>)}</tr>
        </thead>
        <tbody>
          {!data?.length ? (
            <tr>
              <td colSpan={columns.length}>
                <div className="empty-state">
                  <div style={{ fontSize: 32, marginBottom: 12 }}>📋</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text2)', marginBottom: 6 }}>{emptyMessage}</div>
                </div>
              </td>
            </tr>
          ) : (
            data.map((row, i) => (
              <tr key={row.id || i} onClick={() => onRowClick?.(row)}>
                {columns.map(c => (
                  <td key={c.key} style={c.tdStyle}>
                    {c.render ? c.render(row) : row[c.key]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>

      {/* Pagination */}
      {total > pageSize && onPageChange && (
        <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 12, color: 'var(--text3)' }}>
            {((page - 1) * pageSize) + 1}–{Math.min(page * pageSize, total)} of {total}
          </span>
          <div style={{ display: 'flex', gap: 4 }}>
            <button className="btn btn-outline btn-sm" disabled={page <= 1} onClick={() => onPageChange(page - 1)} style={{ padding: '4px 8px' }}>
              <ChevronLeft size={14} />
            </button>
            <span style={{ padding: '4px 10px', fontSize: 12, color: 'var(--text2)' }}>{page} / {totalPages}</span>
            <button className="btn btn-outline btn-sm" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)} style={{ padding: '4px 8px' }}>
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
