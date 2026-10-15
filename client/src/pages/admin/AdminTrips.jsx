import { useState } from 'react';
import { Search } from 'lucide-react';
import { Badge, ErrorState, PageHeader, Skeleton, Tabs } from '../../components/ui';
import DataTable from '../../components/DataTable';
import useFetch from '../../hooks/useFetch';
import { adminApi } from '../../services/api';
import { fmtDate, fmtRange, inr } from '../../utils/format';
import { STATUS_STYLE, EXPENSE_COLORS, BUDGET_LEVELS } from '../../utils/constants';
import { cx } from '../../components/ui';

export default function AdminTrips() {
  const [tab, setTab] = useState('trips');
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const trips = useFetch(() => adminApi.trips(), []);
  const expenses = useFetch(() => adminApi.expenses(), []);
  const match = (s) => s.toLowerCase().includes(q.toLowerCase());
  const tripRows = (trips.data?.trips || []).filter((t) => (!status || t.status === status) && match(`${t.title} ${t.destination} ${t.user?.name || ''}`));
  const expRows = (expenses.data?.expenses || []).filter((e) => match(`${e.description} ${e.userName} ${e.trip} ${e.category}`));
  const cur = tab === 'trips' ? trips : expenses;

  return (
    <div className="animate-rise">
      <PageHeader title="Trips & expenses" subtitle="Everything travelers are planning and spending." />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Tabs value={tab} onChange={setTab} tabs={[{ id: 'trips', label: `Trips${trips.data ? ` (${trips.data.trips.length})` : ''}` }, { id: 'expenses', label: `Expenses${expenses.data ? ` (${expenses.data.expenses.length})` : ''}` }]} />
        <div className="relative min-w-[14rem] flex-1 sm:max-w-xs"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input className="field pl-9" placeholder="Search" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search" /></div>
        {tab === 'trips' && <select className="field w-auto" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by status"><option value="">All statuses</option>{['Active', 'Planned', 'Completed', 'Cancelled'].map((s) => <option key={s}>{s}</option>)}</select>}
      </div>
      {cur.loading ? <Skeleton className="h-96" /> : cur.error ? <ErrorState message={cur.error} onRetry={cur.reload} /> : tab === 'trips' ? (
        <DataTable rows={tripRows} empty="No trips match" columns={[
          { key: 'title', label: 'Trip', render: (t) => <div><p className="font-semibold">{t.title}</p><p className="text-xs text-muted">{t.startingLocation} → {t.destination}</p></div> },
          { key: 'user', label: 'Traveler', render: (t) => t.user?.name || '-' },
          { key: 'dates', label: 'Dates', render: (t) => <span className="whitespace-nowrap text-muted">{fmtRange(t.startDate, t.endDate)}</span> },
          { key: 'totalBudget', label: 'Budget', align: 'right', render: (t) => <span className="font-semibold">{inr(t.totalBudget)}</span> },
          { key: 'actualSpent', label: 'Spent', align: 'right', render: (t) => { const pct = (t.actualSpent / t.totalBudget) * 100; const lv = pct > 100 ? 'exceeded' : pct >= 90 ? 'critical' : pct >= 75 ? 'caution' : pct >= 50 ? 'moderate' : 'safe'; return <span className={cx('font-bold', BUDGET_LEVELS[lv].text)}>{inr(t.actualSpent)}</span>; } },
          { key: 'status', label: 'Status', render: (t) => <Badge className={STATUS_STYLE[t.status]}>{t.status}</Badge> },
        ]} />
      ) : (
        <DataTable rows={expRows} empty="No expenses match" columns={[
          { key: 'date', label: 'Date', render: (e) => <span className="whitespace-nowrap text-muted">{fmtDate(e.date)}</span> },
          { key: 'userName', label: 'Traveler' },
          { key: 'trip', label: 'Trip', className: 'text-muted' },
          { key: 'category', label: 'Category', render: (e) => <span className="inline-flex items-center gap-1.5 font-semibold"><span className="h-2.5 w-2.5 rounded-full" style={{ background: EXPENSE_COLORS[e.category] }} />{e.category}</span> },
          { key: 'description', label: 'Description', className: 'max-w-[16rem] truncate' },
          { key: 'amount', label: 'Amount', align: 'right', render: (e) => <span className="font-bold">{inr(e.amount)}</span> },
        ]} />
      )}
    </div>
  );
}
