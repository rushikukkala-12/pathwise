import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Map, Plane, Wallet, PiggyBank, Plus, Receipt, Compass, ArrowRight, CalendarDays, Users, AlertTriangle, CheckCircle2, MapPin } from 'lucide-react';
import { Badge, Button, Card, EmptyState, ErrorState, PageSkeleton, StatCard, cx } from '../components/ui';
import BudgetRoute from '../components/BudgetRoute';
import ExpenseModal from '../components/ExpenseModal';
import useFetch from '../hooks/useFetch';
import { useAuth } from '../context/AuthContext';
import { tripApi } from '../services/api';
import { inr, fmtRange } from '../utils/format';
import { STATUS_STYLE, BUDGET_LEVELS } from '../utils/constants';

export function TripRow({ trip }) {
  const L = BUDGET_LEVELS[trip.budget.level];
  return (
    <Link to={`/trips/${trip._id}`} className="group flex flex-col gap-3 rounded-2xl border border-slate-200 p-4 transition hover:border-brand-300 hover:bg-brand-50/30 sm:flex-row sm:items-center">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-900 text-white"><MapPin className="h-5 w-5" /></div>
        <div className="min-w-0">
          <p className="truncate font-bold">{trip.destination} <span className="font-medium text-muted">· {trip.title}</span></p>
          <p className="flex items-center gap-1.5 text-xs text-muted"><CalendarDays className="h-3.5 w-3.5" />{fmtRange(trip.startDate, trip.endDate)}</p>
        </div>
      </div>
      <dl className="grid grid-cols-3 gap-4 text-sm sm:w-72">
        <div><dt className="text-xs text-muted">Budget</dt><dd className="font-bold">{inr(trip.totalBudget)}</dd></div>
        <div><dt className="text-xs text-muted">Spent</dt><dd className={cx('font-bold', L.text)}>{inr(trip.actualSpent)}</dd></div>
        <div><dt className="text-xs text-muted">{trip.remainingBudget < 0 ? 'Over by' : 'Left'}</dt><dd className={cx('font-bold', trip.remainingBudget < 0 ? 'text-red-600' : 'text-sea-700')}>{inr(Math.abs(trip.remainingBudget))}</dd></div>
      </dl>
      <Badge className={cx('self-start sm:self-center', STATUS_STYLE[trip.status])}>{trip.status}</Badge>
    </Link>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [expenseOpen, setExpenseOpen] = useState(false);
  const { data, loading, error, reload } = useFetch(async () => {
    const [overview, list] = await Promise.all([tripApi.overview(), tripApi.list()]);
    const focus = overview.focusTrip;
    const recs = focus ? await tripApi.recommendations(focus._id).catch(() => null) : null;
    return { overview, trips: list.trips, recs };
  }, []);

  if (loading) return <PageSkeleton />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  const { overview: o, trips, recs } = data;
  const focus = o.focusTrip;
  const alert = recs?.alerts.find((a) => a.severity !== 'success');
  const expenseTrips = trips.filter((t) => t.status === 'Active' || t.status === 'Planned');

  return (
    <div className="animate-rise space-y-6">
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">Welcome back, {user.name}!</h1>
        <p className="mt-1 text-muted">{o.activeTrips ? `You have ${o.activeTrips} trip in progress${o.upcomingTrips ? ` and ${o.upcomingTrips} coming up.` : '.'}` : o.upcomingTrips ? `${o.upcomingTrips} upcoming ${o.upcomingTrips === 1 ? 'trip' : 'trips'} planned.` : 'Ready to plan your next trip?'}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard icon={Map} label="Total trips" value={o.totalTrips} sub={`${o.upcomingTrips} upcoming`} />
        <StatCard icon={Plane} label="Active trips" value={o.activeTrips} sub="in progress now" tone="sea" />
        <StatCard icon={Wallet} label="Total budget" value={inr(o.totalBudget)} sub="across all trips" tone="sun" />
        <StatCard icon={PiggyBank} label="Total spent" value={inr(o.totalSpent)} sub={`${inr(o.remaining)} remaining`} tone={o.budget.level === 'exceeded' ? 'red' : 'brand'} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.35fr_1fr]">
        <Card className="p-5 sm:p-6">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
            <div><h2 className="text-lg font-bold">Budget overview</h2>{focus && <p className="text-sm text-muted">{focus.title} · {focus.destination}</p>}</div>
            {focus && <Link to={`/trips/${focus._id}`} className="link inline-flex items-center gap-1 text-sm">Open trip <ArrowRight className="h-4 w-4" /></Link>}
          </div>
          {focus ? (
            <>
              <BudgetRoute total={focus.totalBudget} spent={focus.actualSpent} level={focus.budget.level} percentUsed={focus.budget.percentUsed} />
              {alert ? (
                <Link to={`/trips/${focus._id}`} className={cx('mt-5 flex items-start gap-3 rounded-2xl p-3.5 text-sm', alert.severity === 'danger' ? 'bg-red-50 text-red-800' : alert.severity === 'warning' ? 'bg-amber-50 text-amber-900' : 'bg-brand-50 text-brand-800')}>
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /><span><strong>{alert.title}</strong> {alert.message}</span>
                </Link>
              ) : <p className="mt-5 flex items-center gap-2 rounded-2xl bg-sea-50 p-3.5 text-sm font-medium text-sea-800"><CheckCircle2 className="h-4 w-4" />Spending and weather are on track.</p>}
            </>
          ) : <EmptyState icon={Wallet} title="No active or upcoming trip" text="Create a trip to start tracking your budget in real time." action={<Button onClick={() => nav('/create-trip')}>Create new trip</Button>} />}
        </Card>

        <Card className="p-5 sm:p-6">
          <h2 className="mb-4 text-lg font-bold">Quick actions</h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Create New Trip', icon: Plus, onClick: () => nav('/create-trip'), tone: 'bg-sun-500 text-white hover:bg-sun-600' },
              { label: 'My Trips', icon: Map, onClick: () => nav('/trips'), tone: 'bg-brand-700 text-white hover:bg-brand-800' },
              { label: 'Add Expense', icon: Receipt, onClick: () => (expenseTrips.length ? setExpenseOpen(true) : nav('/create-trip')), tone: 'bg-sea-600 text-white hover:bg-sea-700' },
              { label: 'Explore Places', icon: Compass, onClick: () => nav('/explore'), tone: 'bg-slate-100 text-ink hover:bg-slate-200' },
            ].map(({ label, icon: I, onClick, tone }) => (
              <button key={label} onClick={onClick} className={cx('flex flex-col items-start gap-6 rounded-2xl p-4 text-left text-sm font-bold transition active:scale-[.98]', tone)}><I className="h-6 w-6" />{label}</button>
            ))}
          </div>
          <p className="mt-4 flex items-center gap-2 text-xs text-muted"><Users className="h-3.5 w-3.5" />Expenses update your budget meter instantly.</p>
        </Card>
      </div>

      <Card className="p-5 sm:p-6">
        <div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-bold">Recent trips</h2><Link to="/trips" className="link inline-flex items-center gap-1 text-sm">View all <ArrowRight className="h-4 w-4" /></Link></div>
        {o.recentTrips.length ? <div className="space-y-3">{o.recentTrips.map((t) => <TripRow key={t._id} trip={t} />)}</div>
          : <EmptyState icon={Map} title="No trips yet" text="Tell us where you want to go and what you can spend. We'll plan each day." action={<Button onClick={() => nav('/create-trip')}>Plan your first trip</Button>} />}
      </Card>

      <ExpenseModal open={expenseOpen} onClose={() => setExpenseOpen(false)} trips={expenseTrips} defaultTripId={focus?._id} onSaved={() => reload({ silent: true })} />
    </div>
  );
}
