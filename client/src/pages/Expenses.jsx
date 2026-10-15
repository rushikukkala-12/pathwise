import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Receipt, Wallet } from 'lucide-react';
import { Button, Card, EmptyState, ErrorState, PageHeader, Skeleton } from '../components/ui';
import BudgetRoute from '../components/BudgetRoute';
import ExpenseModal from '../components/ExpenseModal';
import ExpenseList from '../components/ExpenseList';
import useFetch from '../hooks/useFetch';
import { expenseApi, tripApi } from '../services/api';
import { EXPENSE_CATEGORIES, EXPENSE_COLORS, BUDGET_LEVELS } from '../utils/constants';
import { inr } from '../utils/format';

export default function Expenses() {
  const nav = useNavigate();
  const { data, loading, error, reload, setData } = useFetch(() => tripApi.list(), []);
  const [selected, setSelected] = useState('');
  const [modal, setModal] = useState(null);

  const trips = useMemo(() => (data?.trips || []).filter((t) => t.status !== 'Cancelled'), [data]);
  // Default to the active trip (derived synchronously so the first render never has an undefined trip)
  const trip = trips.find((t) => t._id === selected) || trips.find((t) => t.status === 'Active') || trips[0];
  const tripId = trip?._id || '';
  const ex = useFetch(() => (tripId ? expenseApi.forTrip(tripId) : Promise.resolve({ expenses: [] })), [tripId]);

  // Apply the fresh budget returned by the API immediately - no refresh needed
  const onSaved = (res) => {
    setData({ trips: data.trips.map((t) => (t._id === tripId ? { ...t, actualSpent: res.trip.actualSpent, remainingBudget: res.trip.remainingBudget, budget: res.budget } : t)) });
    ex.reload({ silent: true });
  };

  if (loading) return <div className="space-y-4"><Skeleton className="h-10 w-60" /><Skeleton className="h-48" /><Skeleton className="h-72" /></div>;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (!trips.length) return <div><PageHeader title="Expenses" /><EmptyState icon={Wallet} title="Create a trip first" text="Expenses belong to a trip, so we can track them against its budget." action={<Button onClick={() => nav('/create-trip')}>Create a trip</Button>} /></div>;

  const list = ex.data?.expenses || [];
  const byCat = EXPENSE_CATEGORIES.map((c) => ({ c, v: list.filter((e) => e.category === c).reduce((s, e) => s + e.amount, 0) })).filter((x) => x.v > 0);
  const L = BUDGET_LEVELS[trip.budget.level];

  return (
    <div className="animate-rise">
      <PageHeader title="Expenses" subtitle="Log spending and watch the budget move in real time." actions={<Button icon={Plus} onClick={() => setModal({})}>Add expense</Button>} />
      <div className="mb-5 max-w-md">
        <label htmlFor="trip-select" className="mb-1.5 block text-sm font-semibold">Trip</label>
        <select id="trip-select" className="field" value={tripId} onChange={(e) => setSelected(e.target.value)}>{trips.map((t) => <option key={t._id} value={t._id}>{t.title} - {t.destination} ({t.status})</option>)}</select>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_1.4fr]">
        <div className="space-y-5">
          <Card className="p-5 sm:p-6">
            <BudgetRoute total={trip.totalBudget} spent={trip.actualSpent} level={trip.budget.level} percentUsed={trip.budget.percentUsed} />
            <p className={`mt-4 text-sm font-semibold ${L.text}`}>{trip.budget.message}</p>
          </Card>
          {byCat.length > 0 && (
            <Card className="p-5">
              <h2 className="mb-3 text-base font-bold">By category</h2>
              <ul className="space-y-2.5">{byCat.map(({ c, v }) => (
                <li key={c}><div className="mb-1 flex justify-between text-sm"><span className="flex items-center gap-2 font-semibold"><span className="h-2.5 w-2.5 rounded-full" style={{ background: EXPENSE_COLORS[c] }} />{c}</span><span className="font-bold">{inr(v)}</span></div><div className="h-1.5 rounded-full bg-slate-100"><div className="h-full rounded-full transition-all duration-500" style={{ width: `${(v / trip.actualSpent) * 100}%`, background: EXPENSE_COLORS[c] }} /></div></li>
              ))}</ul>
            </Card>
          )}
        </div>
        <Card className="p-5 sm:p-6">
          <h2 className="mb-1 flex items-center gap-2 text-lg font-bold"><Receipt className="h-5 w-5 text-brand-600" />Transactions</h2>
          {ex.loading && !ex.data ? <Skeleton className="mt-4 h-60" /> : <ExpenseList expenses={list} onEdit={(e) => setModal({ expense: e })} onDeleted={onSaved} onAddFirst={() => setModal({})} />}
        </Card>
      </div>
      <ExpenseModal open={!!modal} onClose={() => setModal(null)} trips={trips.filter((t) => t.status !== 'Completed' || t._id === tripId)} defaultTripId={tripId} expense={modal?.expense} onSaved={onSaved} />
    </div>
  );
}
