import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Pencil, Plus, ListChecks, Trash2, CalendarDays, Users, MapPin, Wallet, PiggyBank, Hourglass, Sun, Route, Sparkles, AlertTriangle, Receipt, TrendingUp } from 'lucide-react';
import toast from 'react-hot-toast';
import { Badge, Button, Card, ConfirmDialog, EmptyState, ErrorState, PageSkeleton, Skeleton, Tabs, cx } from '../components/ui';
import BudgetRoute from '../components/BudgetRoute';
import BudgetCharts from '../components/BudgetCharts';
import ItineraryView from '../components/ItineraryView';
import ExpenseModal from '../components/ExpenseModal';
import ExpenseList from '../components/ExpenseList';
import WeatherPanel from '../components/WeatherPanel';
import MapPanel from '../components/MapPanel';
import DynamicPanel from '../components/DynamicPanel';
import PlaceCard from '../components/PlaceCard';
import PlaceDetailModal from '../components/PlaceDetailModal';
import AddToTripModal from '../components/AddToTripModal';
import TripFormModal from '../components/TripFormModal';
import useFetch from '../hooks/useFetch';
import { tripApi, expenseApi, errMsg } from '../services/api';
import { inr, fmtRange, isoDay, todayIso } from '../utils/format';
import { STATUS_STYLE, BUDGET_LEVELS } from '../utils/constants';

export default function TripDetails() {
  const { id } = useParams();
  const nav = useNavigate();
  const { data, loading, error, reload, setData } = useFetch(() => tripApi.get(id), [id]);
  const [tab, setTab] = useState('overview');
  const [refresh, setRefresh] = useState(0);
  const [editOpen, setEditOpen] = useState(false);
  const [expenseModal, setExpenseModal] = useState(null);   // { expense? }
  const [delOpen, setDelOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [viewPlace, setViewPlace] = useState(null);
  const [addPlace, setAddPlace] = useState(null);

  const recs = useFetch(() => tripApi.recommendations(id), [id, refresh]);
  const analytics = useFetch(() => tripApi.analytics(id), [id, refresh]);
  const expenses = useFetch(() => expenseApi.forTrip(id), [id, refresh]);
  const places = useFetch(() => tripApi.recommendedPlaces(id), [id, refresh]);

  if (loading) return <PageSkeleton />;
  if (error) return <div><Link to="/trips" className="link mb-4 inline-flex items-center gap-1 text-sm"><ArrowLeft className="h-4 w-4" />All trips</Link><ErrorState message={error} onRetry={reload} /></div>;
  const trip = data.trip;
  const L = BUDGET_LEVELS[trip.budget.level];
  const editable = trip.status !== 'Completed' && trip.status !== 'Cancelled';
  const alertCount = (recs.data?.alerts || []).filter((a) => a.severity !== 'success').length;

  // Any change to the trip / itinerary: store it and re-run the engine
  const onTripChange = (t) => { setData({ trip: t }); setRefresh((r) => r + 1); };
  // Expense saved / deleted: the API returns the fresh budget, so the meter updates with no refetch
  const onExpense = (res) => {
    setData({ trip: { ...trip, actualSpent: res.trip.actualSpent, remainingBudget: res.trip.remainingBudget, budget: res.budget } });
    setRefresh((r) => r + 1);
  };
  const del = async () => {
    setDeleting(true);
    try { await tripApi.remove(trip._id); toast.success('Trip deleted'); nav('/trips', { replace: true }); } catch (e) { toast.error(errMsg(e)); setDeleting(false); }
  };

  const stats = [
    { icon: Wallet, label: 'Budget', value: inr(trip.totalBudget), tone: 'text-white' },
    { icon: PiggyBank, label: 'Spent', value: inr(trip.actualSpent), tone: 'text-white' },
    { icon: Hourglass, label: trip.remainingBudget < 0 ? 'Over by' : 'Remaining', value: inr(Math.abs(trip.remainingBudget)), tone: trip.remainingBudget < 0 ? 'text-red-300' : 'text-sea-300' },
    { icon: CalendarDays, label: 'Days', value: trip.numberOfDays, tone: 'text-white' },
  ];

  const tabs = [
    { id: 'overview', label: 'Overview' }, { id: 'itinerary', label: 'Itinerary' }, { id: 'budget', label: 'Budget' },
    { id: 'expenses', label: `Expenses${expenses.data ? ` (${expenses.data.expenses.length})` : ''}` }, { id: 'weather', label: 'Weather' }, { id: 'map', label: 'Map' },
    { id: 'places', label: 'Places' }, { id: 'dynamic', label: 'Dynamic recommendations', badge: alertCount || undefined },
  ];

  return (
    <div className="animate-rise space-y-5">
      <Link to="/trips" className="link inline-flex items-center gap-1 text-sm"><ArrowLeft className="h-4 w-4" />All trips</Link>

      <section className="overflow-hidden rounded-3xl bg-brand-900 text-white shadow-pop">
        <div className="relative p-5 sm:p-7">
          <svg className="pointer-events-none absolute -right-10 -top-10 h-64 w-64 opacity-[.12]" viewBox="0 0 200 200" aria-hidden><path d="M10 170 C 60 150, 70 90, 110 100 S 160 60, 190 20" fill="none" stroke="#27B9A9" strokeWidth="3" strokeDasharray="2 10" strokeLinecap="round" /><circle cx="110" cy="100" r="6" fill="#fff" /><circle cx="190" cy="20" r="7" fill="#FA8B30" /></svg>
          <div className="relative flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2"><h1 className="text-2xl font-bold sm:text-3xl">{trip.title}</h1><Badge className={cx('bg-white', STATUS_STYLE[trip.status])}>{trip.status}</Badge></div>
              <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-brand-200">
                <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4" />{trip.startingLocation} → <strong className="text-white">{trip.destination}</strong></span>
                <span className="flex items-center gap-1.5"><CalendarDays className="h-4 w-4" />{fmtRange(trip.startDate, trip.endDate)}</span>
                <span className="flex items-center gap-1.5"><Users className="h-4 w-4" />{trip.numberOfTravelers} {trip.numberOfTravelers === 1 ? 'traveler' : 'travelers'}</span>
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {editable && <Button variant="secondary" size="sm" icon={Pencil} onClick={() => setEditOpen(true)}>Edit Trip</Button>}
              {editable && <Button variant="accent" size="sm" icon={Plus} onClick={() => setExpenseModal({})}>Add Expense</Button>}
              {editable && <Button variant="secondary" size="sm" icon={ListChecks} onClick={() => setTab('itinerary')}>Modify Itinerary</Button>}
              <Button variant="dangerSoft" size="sm" icon={Trash2} onClick={() => setDelOpen(true)}>Delete Trip</Button>
            </div>
          </div>
          <dl className="relative mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {stats.map(({ icon: I, label, value, tone }) => (
              <div key={label} className="rounded-2xl bg-white/10 p-3.5 backdrop-blur"><dt className="flex items-center gap-1.5 text-xs font-semibold text-brand-200"><I className="h-3.5 w-3.5" />{label}</dt><dd className={cx('mt-1 font-display text-xl font-bold sm:text-2xl', tone)} aria-live="polite">{value}</dd></div>
            ))}
          </dl>
        </div>
      </section>

      <Tabs value={tab} onChange={setTab} tabs={tabs} className="sticky top-[61px] z-10 -mx-4 bg-canvas/95 px-4 py-2 backdrop-blur sm:mx-0 sm:px-0 lg:top-0" />

      {tab === 'overview' && (
        <div className="grid gap-5 lg:grid-cols-[1.2fr_1fr]">
          <div className="space-y-5">
            <Card className="p-5 sm:p-6"><h2 className="mb-4 text-lg font-bold">Budget</h2><BudgetRoute total={trip.totalBudget} spent={trip.actualSpent} level={trip.budget.level} percentUsed={trip.budget.percentUsed} /><p className={cx('mt-4 text-sm font-semibold', L.text)}>{trip.budget.message}</p></Card>
            {recs.data && recs.data.alerts.filter((a) => a.severity !== 'success').slice(0, 2).map((a) => (
              <button key={a.id} onClick={() => setTab('dynamic')} className={cx('flex w-full items-start gap-3 rounded-2xl border p-4 text-left text-sm', a.severity === 'danger' ? 'border-red-200 bg-red-50 text-red-800' : a.severity === 'warning' ? 'border-amber-200 bg-amber-50 text-amber-900' : 'border-brand-200 bg-brand-50 text-brand-800')}>
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /><span><strong className="block">{a.title}</strong>{a.message}</span>
              </button>
            ))}
          </div>
          <Card className="p-5 sm:p-6">
            <h2 className="mb-4 text-lg font-bold">Trip overview</h2>
            <dl className="space-y-3.5 text-sm">
              {[[Route, 'Route', `${trip.startingLocation} → ${trip.destination}`], [CalendarDays, 'Dates', `${fmtRange(trip.startDate, trip.endDate)} (${trip.numberOfDays} days)`], [Users, 'Travelers', trip.numberOfTravelers],
                [Wallet, 'Daily budget', `${inr(trip.totalBudget / trip.numberOfDays)} (${inr(trip.totalBudget / trip.numberOfDays / trip.numberOfTravelers)} per person)`], [TrendingUp, 'Estimated total cost', inr(trip.estimatedCost)],
                [Sun, 'Sightseeing plan', inr((trip.itinerary || []).reduce((s, d) => s + d.estimatedCost, 0))]].map(([I, k, v]) => (
                <div key={k} className="flex items-start gap-3"><I className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" /><div><dt className="text-xs font-semibold text-muted">{k}</dt><dd className="font-bold">{v}</dd></div></div>
              ))}
            </dl>
            <div className="mt-5 border-t border-slate-100 pt-4"><p className="mb-2 text-xs font-semibold text-muted">Interests</p><div className="flex flex-wrap gap-1.5">{trip.interests.length ? trip.interests.map((i) => <span key={i} className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-bold text-brand-700">{i}</span>) : <span className="text-sm text-muted">Open to anything</span>}</div></div>
          </Card>
        </div>
      )}

      {tab === 'itinerary' && <ItineraryView trip={trip} onTripChange={onTripChange} />}

      {tab === 'budget' && (analytics.loading && !analytics.data ? <Skeleton className="h-96" /> : analytics.error ? <ErrorState message={analytics.error} onRetry={analytics.reload} /> : <BudgetCharts analytics={analytics.data} />)}

      {tab === 'expenses' && (
        <Card className="p-5 sm:p-6">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div><h2 className="text-lg font-bold">Expenses</h2><p className="text-sm text-muted">{inr(trip.actualSpent)} spent of {inr(trip.totalBudget)}</p></div>
            {editable && <Button icon={Plus} onClick={() => setExpenseModal({})}>Add expense</Button>}
          </div>
          <div className="mb-4"><BudgetRoute compact total={trip.totalBudget} spent={trip.actualSpent} level={trip.budget.level} percentUsed={trip.budget.percentUsed} showFigures={false} /></div>
          {expenses.loading && !expenses.data ? <Skeleton className="h-48" /> : <ExpenseList expenses={expenses.data?.expenses || []} readOnly={false} onEdit={(e) => setExpenseModal({ expense: e })} onDeleted={onExpense} onAddFirst={editable ? () => setExpenseModal({}) : undefined} />}
        </Card>
      )}

      {tab === 'weather' && <WeatherPanel destination={trip.destination} from={isoDay(trip.startDate) > todayIso() ? isoDay(trip.startDate) : undefined} days={Math.min(Math.max(trip.numberOfDays, 5), 10)} tripStart={trip.startDate} tripDays={trip.numberOfDays} />}

      {tab === 'map' && <MapPanel trip={trip} refreshKey={refresh} />}

      {tab === 'places' && (
        <div>
          <p className="mb-4 flex items-center gap-2 text-sm text-muted"><Sparkles className="h-4 w-4 text-sun-500" />Ranked for this trip by interest match, rating, budget fit, crowd level and distance.</p>
          {places.loading && !places.data ? <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-72" />)}</div>
            : places.error ? <ErrorState message={places.error} onRetry={places.reload} />
            : <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{places.data.places.map((p) => <PlaceCard key={p._id} place={p} score={p.score} planned={p.planned} onView={setViewPlace} onAdd={editable ? setAddPlace : undefined} />)}</div>}
        </div>
      )}

      {tab === 'dynamic' && <DynamicPanel trip={trip} recs={recs} onTripChange={onTripChange} />}

      <TripFormModal open={editOpen} onClose={() => setEditOpen(false)} trip={trip} onSaved={onTripChange} />
      <ExpenseModal open={!!expenseModal} onClose={() => setExpenseModal(null)} trips={[trip]} defaultTripId={trip._id} expense={expenseModal?.expense} onSaved={onExpense} />
      <ConfirmDialog open={delOpen} onClose={() => setDelOpen(false)} onConfirm={del} loading={deleting} title="Delete this trip?" confirmLabel="Delete trip" message={`"${trip.title}", its itinerary and all of its expenses will be permanently removed.`} />
      <PlaceDetailModal place={viewPlace} onClose={() => setViewPlace(null)} onAdd={editable ? (p) => { setViewPlace(null); setAddPlace(p); } : undefined} />
      <AddToTripModal open={!!addPlace} onClose={() => setAddPlace(null)} place={addPlace} fixedTrip={trip} onAdded={onTripChange} />
    </div>
  );
}
