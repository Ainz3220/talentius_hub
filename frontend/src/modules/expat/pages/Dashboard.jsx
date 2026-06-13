import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { expats as expatsApi, documents as docsApi, transfers as transfersApi, clients as clientsApi, dormitories as dormsApi, settings as settingsApi } from '../../../api/index.js';
import StatusBadge from '../../../components/shared/StatusBadge.jsx';
import { formatDate, daysUntil, getInitials, getAvatarColor } from '../../../lib/utils.js';

function KpiCard({ label, value, sub, subColor, warn, onClick }) {
  return (
    <div className="kpi-card" onClick={onClick} style={{ cursor: onClick ? 'pointer' : undefined }}>
      <div style={{ fontSize: 11, color: 'var(--text3)', letterSpacing: '0.5px', marginBottom: 6 }}>{label}</div>
      <div style={{ fontFamily: 'Instrument Serif, serif', fontSize: 32, color: warn ? 'var(--accent2)' : 'var(--accent)', lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 5 }}><span style={{ fontWeight: 600, color: subColor }}>{sub}</span></div>}
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();

  const { data: appSettings } = useQuery({ queryKey: ['settings'], queryFn: () => settingsApi.get().then(r => r.data), staleTime: 60000 });
  const alertDays = appSettings?.docAlertDays1 ?? 30;
  const urgentDays = appSettings?.docAlertDays2 ?? 7;

  const { data: activeExpats } = useQuery({ queryKey: ['expats-active-count'], queryFn: () => expatsApi.list({ status: 'ACTIVE', pageSize: 1 }).then(r => r.data.total) });
  const { data: newJoiners } = useQuery({ queryKey: ['expats-new-this-month'], queryFn: () => {
    const start = new Date(); start.setDate(1); start.setHours(0, 0, 0, 0);
    return expatsApi.list({ status: 'ACTIVE', createdAfter: start.toISOString(), pageSize: 1 }).then(r => r.data.total);
  } });
  const { data: unassignedExpats } = useQuery({ queryKey: ['expats-unassigned-count'], queryFn: () => expatsApi.list({ unassigned: true, pageSize: 1 }).then(r => r.data.total) });
  const { data: expiringDocs } = useQuery({ queryKey: ['docs-expiring', alertDays], queryFn: () => docsApi.expiring(alertDays).then(r => r.data), enabled: !!appSettings });
  const { data: pendingTransfers } = useQuery({ queryKey: ['transfers-pending'], queryFn: () => transfersApi.list({ status: 'PENDING', pageSize: 5 }).then(r => r.data) });
  const { data: activeClients } = useQuery({ queryKey: ['clients-active-count'], queryFn: () => clientsApi.list({ status: 'ACTIVE', pageSize: 1 }).then(r => r.data.total) });
  const { data: companyClients } = useQuery({ queryKey: ['clients-company-count'], queryFn: () => clientsApi.list({ status: 'ACTIVE', type: 'COMPANY', pageSize: 1 }).then(r => r.data.total) });
  const { data: individualClients } = useQuery({ queryKey: ['clients-individual-count'], queryFn: () => clientsApi.list({ status: 'ACTIVE', type: 'INDIVIDUAL', pageSize: 1 }).then(r => r.data.total) });
  const { data: dorms } = useQuery({ queryKey: ['dormitories-all'], queryFn: () => dormsApi.list().then(r => r.data) });

  const urgentDocs = expiringDocs?.filter(d => daysUntil(d.expiryDate) <= urgentDays) || [];

  return (
    <div>
      {/* KPI Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14, marginBottom: 24 }} className="kpi-grid">
        <KpiCard label="ACTIVE EXPATS" value={activeExpats ?? 0} sub={newJoiners ? `+${newJoiners} this month` : 'current'} subColor="var(--green)" />
        <KpiCard label="UNASSIGNED EXPATS" value={unassignedExpats ?? 0} sub="no client assigned" subColor="var(--amber)" warn={(unassignedExpats ?? 0) > 0} onClick={() => navigate('/expats?unassigned=true')} />
        <KpiCard label={`DOCS EXPIRING (${alertDays}D)`} value={expiringDocs?.length ?? 0} sub={urgentDocs.length > 0 ? `${urgentDocs.length} in ${urgentDays} days` : 'none urgent'} subColor="var(--red)" warn={urgentDocs.length > 0} />
        <KpiCard label="PENDING TRANSFERS" value={pendingTransfers?.total ?? 0} sub="awaiting approval" subColor="var(--amber)" warn={(pendingTransfers?.total || 0) > 0} />
        <KpiCard label="ACTIVE CLIENTS" value={activeClients ?? 0} sub={`${companyClients ?? 0} companies · ${individualClients ?? 0} individual`} subColor="var(--text3)" />
      </div>

      {/* Alerts + Transfers grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Alerts */}
        <div>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', overflow: 'hidden' }}>
            <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center' }}>
              <span style={{ fontWeight: 600, fontSize: 13 }}>🔔 Active Alerts</span>
              <button onClick={() => navigate('/expats')} style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--accent)', cursor: 'pointer', background: 'none', border: 'none', fontFamily: 'inherit' }}>View all</button>
            </div>
            {!expiringDocs?.length && (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>No active alerts</div>
            )}
            {expiringDocs?.slice(0, 6).map(doc => {
              const days = daysUntil(doc.expiryDate);
              const danger = days !== null && days <= urgentDays;
              return (
                <div key={doc.id} className="alert-item">
                  <div className="alert-dot" style={{ background: danger ? 'var(--red)' : 'var(--amber)' }} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>
                      {doc.documentType} expiry — {days !== null && days <= 0 ? 'expired' : `${days}d`}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 1 }}>{doc.originalName}</div>
                  </div>
                  <div style={{ marginLeft: 'auto', fontSize: 10, color: danger ? 'var(--red)' : 'var(--amber)', whiteSpace: 'nowrap', paddingTop: 2, fontWeight: 600 }}>
                    {danger ? '⚠ Urgent' : `${days}d`}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent Transfers */}
        <div>
          <div className="table-card">
            <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center' }}>
              <span style={{ fontWeight: 600, fontSize: 13 }}>🔄 Recent Transfers</span>
              {(pendingTransfers?.total || 0) > 0 && (
                <span className="badge badge-pending" style={{ marginLeft: 'auto' }}>{pendingTransfers.total} pending</span>
              )}
            </div>
            <table>
              <thead>
                <tr><th>Expat</th><th>Change</th><th>Status</th></tr>
              </thead>
              <tbody>
                {!pendingTransfers?.items?.length && (
                  <tr><td colSpan={3} style={{ textAlign: 'center', color: 'var(--text3)', padding: '24px' }}>No pending transfers</td></tr>
                )}
                {pendingTransfers?.items?.map(t => (
                  <tr key={t.id} onClick={() => navigate('/transfers')}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div className={`avatar ${getAvatarColor(t.expat?.fullName)}`}>{getInitials(t.expat?.fullName)}</div>
                        <div>
                          <div style={{ fontWeight: 500, fontSize: 13 }}>{t.expat?.fullName}</div>
                          <div style={{ fontSize: 11, color: 'var(--text3)' }}>{t.fromDormitory ? 'Dorm change' : 'Client change'}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--text2)' }}>
                      {[t.fromDormitory?.name, t.toDormitory?.name].filter(Boolean).join(' → ') ||
                       [t.fromClient?.name, t.toClient?.name].filter(Boolean).join(' → ')}
                    </td>
                    <td><StatusBadge status={t.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Dormitory Occupancy */}
      <div style={{ marginTop: 16 }}>
        <div className="table-card">
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
            <span style={{ fontWeight: 600, fontSize: 13 }}>🏠 Dormitory Occupancy</span>
          </div>
          <div style={{ padding: 16, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14 }}>
            {!dorms?.length && (
              <div style={{ color: 'var(--text3)', fontSize: 13, padding: '8px 0' }}>No dormitories</div>
            )}
            {dorms?.map(d => {
              const occ = d._count?.expats || 0;
              const pct = d.capacity ? Math.round((occ / d.capacity) * 100) : 0;
              const nearFull = pct >= 90;
              return (
                <div key={d.id} style={{ background: 'var(--surface2)', borderRadius: 'var(--r)', padding: 14, cursor: 'pointer' }}
                  onClick={() => navigate(`/dormitories/${d.id}`)}>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{d.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 8 }}>{d.state}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 5 }}>
                    <span style={{ color: 'var(--text2)' }}>Occupancy</span>
                    <span style={{ fontWeight: 600, color: nearFull ? 'var(--accent2)' : 'var(--text)' }}>{occ} / {d.capacity}</span>
                  </div>
                  <div className="occ-bar">
                    <div className="occ-fill" style={{ width: `${pct}%`, background: nearFull ? 'var(--accent2)' : 'var(--accent)' }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
