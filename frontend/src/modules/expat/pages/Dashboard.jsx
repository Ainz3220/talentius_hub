import { useQuery } from '@tanstack/react-query';
import { expatsApi, documentsApi, transfersApi, checklistsApi, dormitoriesApi } from '../../../api/index.js';
import { Skeleton } from '../../../components/ui/skeleton.jsx';
import { daysUntil } from '../../../lib/utils.js';
import { useSettingsStore } from '../../../store/settingsStore.js';

function has(widgets, key) {
  if (!widgets || widgets.length === 0) return true;
  return widgets.includes(key);
}

function KpiCard({ label, value, loading, variant }) {
  return (
    <div className={`kpi-card${variant ? ` ${variant}` : ''}`}>
      <div className="kpi-label">{label}</div>
      {loading
        ? <Skeleton style={{ height: 40, width: 80, marginTop: 4 }} />
        : <div className="kpi-value">{value ?? 0}</div>
      }
    </div>
  );
}

export default function Dashboard() {
  const settings = useSettingsStore(s => s.settings);
  const widgets = settings?.dashboardWidgets ?? [];

  const showKpi        = has(widgets, 'kpi');
  const showAlerts     = has(widgets, 'doc-alerts');
  const showTransfers  = has(widgets, 'transfers');
  const showChecklists = has(widgets, 'checklists');
  const showOccupancy  = has(widgets, 'occupancy');

  const { data: expats, isLoading: loadingExpats } = useQuery({
    queryKey: ['expats'],
    queryFn: () => expatsApi.list({}),
    enabled: showKpi,
  });

  const { data: expiring, isLoading: loadingExpiring } = useQuery({
    queryKey: ['docs-expiring'],
    queryFn: () => documentsApi.expiring(settings?.docAlertDays1 || 30),
    enabled: showKpi || showAlerts,
  });

  const { data: transfers, isLoading: loadingTransfers } = useQuery({
    queryKey: ['transfers-pending'],
    queryFn: () => transfersApi.list({ status: 'PENDING' }),
    enabled: showKpi || showTransfers,
  });

  const { data: checklists, isLoading: loadingChecklists } = useQuery({
    queryKey: ['checklists-dashboard'],
    queryFn: () => checklistsApi.list({ status: 'IN_PROGRESS', limit: 10 }),
    enabled: showChecklists,
  });

  const { data: dormitories, isLoading: loadingDormitories } = useQuery({
    queryKey: ['dormitories-dashboard'],
    queryFn: () => dormitoriesApi.list({}),
    enabled: showOccupancy,
  });

  const expatList     = expats?.data || expats || [];
  const active        = Array.isArray(expatList) ? expatList.filter(e => e.status === 'ACTIVE').length : 0;
  const pending       = Array.isArray(expatList) ? expatList.filter(e => e.status === 'PENDING').length : 0;
  const expiringList  = expiring?.data || (Array.isArray(expiring) ? expiring : []);
  const transferList  = transfers?.data || transfers || [];
  const checklistList = checklists?.data || [];
  const dormList      = dormitories?.data || [];

  return (
    <div>
      {showKpi && (
        <div className="kpi-grid">
          <KpiCard label="Active Expats"      value={active}       loading={loadingExpats}    variant="ok" />
          <KpiCard label="Docs Expiring (30d)" value={expiringList.length} loading={loadingExpiring}  variant={expiringList.length > 0 ? 'warn' : ''} />
          <KpiCard label="Pending Transfers"  value={Array.isArray(transferList) ? transferList.length : transfers?.total ?? 0} loading={loadingTransfers} />
          <KpiCard label="Pending Expats"     value={pending}      loading={loadingExpats} />
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {showAlerts && (
          <div className="table-card">
            <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center' }}>
              <span style={{ fontWeight: 600, fontSize: 13 }}>Active Alerts</span>
              <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--accent)', cursor: 'pointer' }}>View all</span>
            </div>
            {loadingExpiring ? (
              <div style={{ padding: 16 }}><Skeleton style={{ height: 80 }} /></div>
            ) : expiringList.length === 0 ? (
              <EmptyState text="No expiring documents" />
            ) : (
              <div>
                {expiringList.slice(0, 6).map(doc => {
                  const days = daysUntil(doc.expiryDate);
                  const isDanger = days <= 7;
                  return (
                    <div key={doc.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: '1px solid var(--border)', transition: 'background 0.12s', cursor: 'pointer' }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, background: isDanger ? 'var(--red)' : 'var(--amber)' }} />
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 500 }}>{doc.documentType}</div>
                        <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 1 }}>{doc.entityType}</div>
                      </div>
                      <div style={{ marginLeft: 'auto', fontSize: 11, color: isDanger ? 'var(--red)' : 'var(--amber)', fontWeight: 600, whiteSpace: 'nowrap' }}>
                        {days <= 0 ? 'Expired' : `${days}d left`}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {showTransfers && (
          <div className="table-card">
            <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center' }}>
              <span style={{ fontWeight: 600, fontSize: 13 }}>Recent Transfers</span>
              {Array.isArray(transferList) && transferList.length > 0 && (
                <span className="badge-dot badge-pending" style={{ marginLeft: 'auto' }}>{transferList.length} pending</span>
              )}
            </div>
            {loadingTransfers ? (
              <div style={{ padding: 16 }}><Skeleton style={{ height: 80 }} /></div>
            ) : !Array.isArray(transferList) || transferList.length === 0 ? (
              <EmptyState text="No pending transfers" />
            ) : (
              <table className="ef-table">
                <thead><tr><th>Expat</th><th>Reason</th><th>Status</th></tr></thead>
                <tbody>
                  {transferList.slice(0, 5).map(t => (
                    <tr key={t.id}>
                      <td>
                        <div className="av-cell">
                          <div className="av g">{initials(t.expat?.fullName)}</div>
                          <div>
                            <div className="av-name">{t.expat?.fullName || '—'}</div>
                            <div className="av-sub">{t.transferType}</div>
                          </div>
                        </div>
                      </td>
                      <td className="muted" style={{ fontSize: 12 }}>{t.reason || '—'}</td>
                      <td><span className="badge-dot badge-pending">Pending</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {showChecklists && (
          <div className="table-card">
            <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontWeight: 600, fontSize: 13 }}>Active Checklists</span>
            </div>
            {loadingChecklists ? (
              <div style={{ padding: 16 }}><Skeleton style={{ height: 80 }} /></div>
            ) : checklistList.length === 0 ? (
              <EmptyState text="No active checklists" />
            ) : (
              <div>
                {checklistList.slice(0, 6).map(cl => {
                  const total = cl._count?.items ?? 0;
                  const done = cl.items?.filter(i => i.status === 'DONE').length ?? 0;
                  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
                  return (
                    <div key={cl.id} style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{cl.name}</div>
                        <span className="badge-dot badge-transferred" style={{ fontSize: 10 }}>{cl.entityType}</span>
                      </div>
                      <div style={{ background: 'var(--surface3)', borderRadius: 4, height: 5 }}>
                        <div style={{ width: `${pct}%`, height: 5, borderRadius: 4, background: 'var(--accent)', transition: 'width 0.4s' }} />
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 4 }}>{done}/{total} items</div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {showOccupancy && (
          <div className="table-card">
            <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontWeight: 600, fontSize: 13 }}>Dormitory Occupancy</span>
            </div>
            {loadingDormitories ? (
              <div style={{ padding: 16 }}><Skeleton style={{ height: 80 }} /></div>
            ) : dormList.length === 0 ? (
              <EmptyState text="No dormitories found" />
            ) : (
              <div style={{ padding: 16, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
                {dormList.slice(0, 6).map(d => {
                  const pct = d.capacity > 0 ? Math.round(((d.occupantCount ?? 0) / d.capacity) * 100) : 0;
                  const isHigh = pct >= 90;
                  return (
                    <div key={d.id} style={{ background: 'var(--surface2)', borderRadius: 10, padding: 14 }}>
                      <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 2 }}>{d.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 8 }}>{d.address || '—'}</div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 5 }}>
                        <span style={{ color: 'var(--text2)' }}>Occupancy</span>
                        <span style={{ fontWeight: 600 }}>{d.occupantCount ?? 0} / {d.capacity}</span>
                      </div>
                      <div style={{ height: 5, background: 'var(--surface3)', borderRadius: 3 }}>
                        <div style={{ height: 5, borderRadius: 3, background: isHigh ? 'var(--accent2)' : 'var(--accent)', width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyState({ text }) {
  return (
    <div style={{ textAlign: 'center', padding: '32px 24px', color: 'var(--text3)', fontSize: 13 }}>{text}</div>
  );
}

function initials(name) {
  if (!name) return '?';
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
}
