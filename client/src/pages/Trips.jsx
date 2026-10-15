import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Search, Trash2, MapPin, CalendarDays, Users, Map } from 'lucide-react';
import toast from 'react-hot-toast';
import { Badge, Button, Card, ConfirmDialog, EmptyState, ErrorState, PageHeader, Skeleton, Tabs, cx } from '../components/ui';
import BudgetRoute from '../components/BudgetRoute';
import useFetch from '../hooks/useFetch';
import { tripApi, errMsg } from '../services/api';
import { fmtRange } from '../utils/format';
import { STATUS_STYLE } from '../utils/constants';

export default function Trips() {
  const nav = useNavigate();
  const { data, loading, error, reload, setData } = useFetch(() => tripApi.list(), []);
  const [tab, setTab] = useState('All');
  const [q, setQ] = useState('');
  const [target, setTarget] = useState(null);
  const [busy, setBusy] = useState(false);

  const trips = data?.trips || [];
  const counts = useMemo(() => trips.reduce((a, t) => ({ ...a, [t.status]: (a[t.status] || 0) + 1 }), { All: trips.length }), [trips]);
  const shown = trips.filter((t) => (tab === 'All' || t.status === tab) && (!q || `${t.title} ${t.destination}`.toLowerCase().includes(q.toLowerCase())));

  const del = async () => {
    setBusy(true);
    try { await tripApi.remove(target._id); setData({ trips: trips.filter((t) => t._id !== target._id) }); toast.success('Trip deleted'); setTarget(null); } catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  };

  return (
    <div className="animate-rise">
      <PageHeader title="My trips" subtitle="Every trip with its live budget." actions={<Button icon={Plus} onClick={() => nav('/create-trip')}>New trip</Button>} />
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs value={tab} onChange={setTab} tabs={['All', 'Active', 'Planned', 'Completed', 'Cancelled'].filter((s) => s === 'All' || counts[s]).map((s) => ({ id: s, label: `${s} (${counts[s] || 0})` }))} />
        <div className="relative sm:w-64"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={q} onChange={(e) => setQ(e.target.value)} className="field pl-9" placeholder="Search trips" aria-label="Search trips" /></div>
      </div>

      {loading ? <div className="grid gap-4 md:grid-cols-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-52" />)}</div>
        : error ? <ErrorState message={error} onRetry={reload} />
        : !trips.length ? <EmptyState icon={Map} title="No trips yet" text="Create your first trip and PathWise will build the itinerary and track the budget." action={<Button icon={Plus} onClick={() => nav('/create-trip')}>Create a trip</Button>} />
        : !shown.length ? <EmptyState icon={Search} title="No trips match" text="Try another filter or search term." action={<Button variant="secondary" onClick={() => { setTab('All'); setQ(''); }}>Clear filters</Button>} />
        : (
          <div className="grid gap-4 md:grid-cols-2">
            {shown.map((t) => (
              <Card key={t._id} className="group flex flex-col p-5 transition hover:shadow-pop">
                <div className="flex items-start justify-between gap-3">
                  <Link to={`/trips/${t._id}`} className="min-w-0 flex-1">
                    <h3 className="truncate text-lg font-bold group-hover:text-brand-700">{t.title}</h3>
                    <p className="mt-0.5 flex items-center gap-1.5 text-sm text-muted"><MapPin className="h-4 w-4" />{t.startingLocation} → {t.destination}</p>
                  </Link>
                  <Badge className={cx(STATUS_STYLE[t.status])}>{t.status}</Badge>
                </div>
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
                  <span className="flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" />{fmtRange(t.startDate, t.endDate)}</span>
                  <span>{t.numberOfDays} {t.numberOfDays === 1 ? 'day' : 'days'}</span>
                  <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" />{t.numberOfTravelers}</span>
                </div>
                <div className="mt-5"><BudgetRoute compact total={t.totalBudget} spent={t.actualSpent} level={t.budget.level} percentUsed={t.budget.percentUsed} /></div>
                <div className="mt-5 flex gap-2 border-t border-slate-100 pt-4">
                  <Link to={`/trips/${t._id}`} className="flex-1"><Button variant="secondary" size="sm" className="w-full">View details</Button></Link>
                  <Button variant="dangerSoft" size="sm" icon={Trash2} onClick={() => setTarget(t)} aria-label={`Delete ${t.title}`}>Delete</Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      <ConfirmDialog open={!!target} onClose={() => setTarget(null)} onConfirm={del} loading={busy} title="Delete this trip?" confirmLabel="Delete trip" message={target ? `"${target.title}", its itinerary and all of its expenses will be permanently removed.` : ''} />
    </div>
  );
}
