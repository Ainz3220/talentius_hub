import { useQuery } from '@tanstack/react-query';
import { Users, AlertTriangle, ArrowLeftRight, CheckSquare } from 'lucide-react';
import { expatsApi, documentsApi, transfersApi, checklistsApi, dormitoriesApi } from '../../../api/index.js';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card.jsx';
import { Badge } from '../../../components/ui/badge.jsx';
import { Skeleton } from '../../../components/ui/skeleton.jsx';
import { Progress } from '../../../components/ui/progress.jsx';
import { daysUntil } from '../../../lib/utils.js';
import { useSettingsStore } from '../../../store/settingsStore.js';

function KpiCard({ title, value, icon: Icon, loading }) {
  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wide">{title}</p>
            {loading ? (
              <Skeleton className="h-8 w-16 mt-1" />
            ) : (
              <p className="text-2xl font-bold text-slate-900 mt-1">{value ?? 0}</p>
            )}
          </div>
          <div className="h-10 w-10 rounded-lg bg-[var(--accent)]/10 flex items-center justify-center">
            <Icon size={20} className="text-[var(--accent)]" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function has(widgets, key) {
  if (!widgets || widgets.length === 0) return true;
  return widgets.includes(key);
}

export default function Dashboard() {
  const settings = useSettingsStore(s => s.settings);
  const widgets = settings?.dashboardWidgets ?? [];

  const showKpi       = has(widgets, 'kpi');
  const showAlerts    = has(widgets, 'doc-alerts');
  const showTransfers = has(widgets, 'transfers');
  const showChecklists = has(widgets, 'checklists');
  const showOccupancy = has(widgets, 'occupancy');

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

  const expatList    = expats?.data || expats || [];
  const active       = Array.isArray(expatList) ? expatList.filter(e => e.status === 'ACTIVE').length : 0;
  const pending      = Array.isArray(expatList) ? expatList.filter(e => e.status === 'PENDING').length : 0;
  const expiringList = expiring?.data || (Array.isArray(expiring) ? expiring : []);
  const transferList = transfers?.data || transfers || [];
  const checklistList = checklists?.data || [];
  const dormList     = dormitories?.data || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-500 mt-0.5">Overview of your expat management system</p>
      </div>

      {/* KPI Cards */}
      {showKpi && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard title="Active Expats"     value={active}                                                             icon={Users}          loading={loadingExpats} />
          <KpiCard title="Pending Expats"    value={pending}                                                            icon={Users}          loading={loadingExpats} />
          <KpiCard title="Expiring Docs"     value={expiringList.length}                                                icon={AlertTriangle}  loading={loadingExpiring} />
          <KpiCard title="Pending Transfers" value={Array.isArray(transferList) ? transferList.length : transfers?.total ?? 0} icon={ArrowLeftRight} loading={loadingTransfers} />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Document Alerts */}
        {showAlerts && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Document Alerts</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingExpiring ? (
                <Skeleton className="h-32 w-full" />
              ) : expiringList.length === 0 ? (
                <p className="text-sm text-slate-400 py-4 text-center">No expiring documents</p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {expiringList.slice(0, 8).map(doc => {
                    const days = daysUntil(doc.expiryDate);
                    return (
                      <li key={doc.id} className="flex items-center justify-between py-2">
                        <div>
                          <p className="text-sm font-medium text-slate-800">{doc.documentType}</p>
                          <p className="text-xs text-slate-500">{doc.entityType}</p>
                        </div>
                        <Badge variant={days <= 0 ? 'destructive' : days <= 7 ? 'destructive' : 'warning'}>
                          {days <= 0 ? 'Expired' : `${days}d left`}
                        </Badge>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        )}

        {/* Pending Transfers */}
        {showTransfers && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Pending Transfers</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingTransfers ? (
                <Skeleton className="h-32 w-full" />
              ) : !Array.isArray(transferList) || transferList.length === 0 ? (
                <p className="text-sm text-slate-400 py-4 text-center">No pending transfers</p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {transferList.slice(0, 6).map(t => (
                    <li key={t.id} className="flex items-center justify-between py-2">
                      <div>
                        <p className="text-sm font-medium text-slate-800">Transfer #{t.id?.slice(-6)}</p>
                        <p className="text-xs text-slate-500">{t.reason}</p>
                      </div>
                      <Badge variant="warning">Pending</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        )}

        {/* Overdue Checklists */}
        {showChecklists && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <CheckSquare size={14} />
                Active Checklists
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingChecklists ? (
                <Skeleton className="h-32 w-full" />
              ) : checklistList.length === 0 ? (
                <p className="text-sm text-slate-400 py-4 text-center">No active checklists</p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {checklistList.slice(0, 6).map(cl => {
                    const total = cl._count?.items ?? 0;
                    return (
                      <li key={cl.id} className="py-2 space-y-1">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-slate-800 truncate pr-2">{cl.name}</p>
                          <Badge variant="info" className="shrink-0">{cl.entityType}</Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <Progress value={0} className="h-1.5 flex-1" />
                          <span className="text-xs text-slate-400 shrink-0">{total} items</span>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        )}

        {/* Dormitory Occupancy */}
        {showOccupancy && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Dormitory Occupancy</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingDormitories ? (
                <Skeleton className="h-32 w-full" />
              ) : dormList.length === 0 ? (
                <p className="text-sm text-slate-400 py-4 text-center">No dormitories found</p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {dormList.slice(0, 6).map(d => {
                    const pct = d.capacity > 0 ? Math.round(((d.occupantCount ?? 0) / d.capacity) * 100) : 0;
                    return (
                      <li key={d.id} className="py-2 space-y-1">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-slate-800">{d.name}</p>
                          <span className="text-xs text-slate-500">{d.occupantCount ?? 0}/{d.capacity}</span>
                        </div>
                        <Progress value={pct} className="h-1.5" />
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
