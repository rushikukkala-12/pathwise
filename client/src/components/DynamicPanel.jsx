import { useState } from 'react';
import { CheckCircle2, CloudRain, Wallet, Info, Sparkles, ArrowRightLeft, Plus, Lightbulb, TrendingDown, Siren } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button, Card, ErrorState, Skeleton, cx } from './ui';
import PlaceImage from './PlaceImage';
import AddToTripModal from './AddToTripModal';
import { tripApi, errMsg } from '../services/api';
import { inr } from '../utils/format';

const SEV = {
  danger: { box: 'border-red-200 bg-red-50', icon: 'text-red-600 bg-red-100', title: 'text-red-800', text: 'text-red-700' },
  warning: { box: 'border-amber-200 bg-amber-50', icon: 'text-amber-700 bg-amber-100', title: 'text-amber-900', text: 'text-amber-800' },
  info: { box: 'border-brand-200 bg-brand-50', icon: 'text-brand-700 bg-brand-100', title: 'text-brand-900', text: 'text-brand-800' },
  success: { box: 'border-sea-200 bg-sea-50', icon: 'text-sea-700 bg-sea-100', title: 'text-sea-900', text: 'text-sea-800' },
};
const alertIcon = (a) => (a.type === 'weather' ? CloudRain : a.severity === 'danger' ? Siren : a.severity === 'success' ? CheckCircle2 : a.type === 'budget' ? Wallet : Info);

/**
 * Dynamic Recommendations: the engine re-evaluates budget, weather and the itinerary every time
 * `refreshKey` changes (a new expense, edit, swap ...). Suggestions can be applied in one click.
 */
export default function DynamicPanel({ trip, recs, onTripChange }) {
  const { data, loading, error, reload } = recs;
  const [busy, setBusy] = useState(null);
  const [addPlace, setAddPlace] = useState(null);
  const editable = trip.status !== 'Completed' && trip.status !== 'Cancelled';

  if (loading && !data) return <Card className="p-5"><Skeleton className="h-48" /></Card>;
  if (error) return <ErrorState message={error} onRetry={reload} />;

  const applySwap = async (s) => {
    setBusy(s.itemId + s.place._id);
    try {
      const r = await tripApi.modify(trip._id, { action: 'replace', day: s.day, itemId: s.itemId, placeId: s.place._id });
      toast.success(r.message);
      onTripChange(r.trip);
    } catch (e) { toast.error(errMsg(e)); } finally { setBusy(null); }
  };
  const optimise = async () => {
    setBusy('opt');
    try { const r = await tripApi.generate(trip._id, { optimise: true }); toast.success(r.message); onTripChange(r.trip); } catch (e) { toast.error(errMsg(e)); } finally { setBusy(null); }
  };

  const swaps = data.suggestions.filter((s) => s.itemId);
  const frees = data.suggestions.filter((s) => s.type === 'free');
  const needsBudgetHelp = ['caution', 'critical', 'exceeded'].includes(data.budget.level);

  return (
    <div className="space-y-4">
      <ul className="space-y-3">
        {data.alerts.map((a) => { const S = SEV[a.severity] || SEV.info; const I = alertIcon(a); return (
          <li key={a.id} className={cx('flex gap-3 rounded-2xl border p-4', S.box)} role={a.severity === 'danger' || a.severity === 'warning' ? 'alert' : 'status'}>
            <div className={cx('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl', S.icon)}><I className="h-5 w-5" /></div>
            <div><p className={cx('font-bold', S.title)}>{a.title}</p><p className={cx('mt-0.5 text-sm', S.text)}>{a.message}</p></div>
          </li>
        ); })}
      </ul>

      {needsBudgetHelp && editable && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-brand-900 p-4 text-white">
          <div className="flex items-center gap-3"><TrendingDown className="h-6 w-6 text-sea-300" /><div><p className="font-bold">Re-plan the remaining sightseeing on a tighter budget</p><p className="text-sm text-brand-200">Rebuilds the itinerary around free and low-cost places.</p></div></div>
          <Button variant="accent" loading={busy === 'opt'} icon={Sparkles} onClick={optimise}>Optimise for budget</Button>
        </div>
      )}

      {swaps.length > 0 && (
        <Card className="p-4 sm:p-5">
          <h3 className="mb-3 flex items-center gap-2 font-bold"><ArrowRightLeft className="h-5 w-5 text-brand-600" />Suggested swaps</h3>
          <ul className="space-y-2.5">
            {swaps.map((s) => (
              <li key={s.itemId + s.place._id} className="flex flex-col gap-3 rounded-2xl border border-slate-200 p-3 sm:flex-row sm:items-center">
                <div className="flex items-center gap-3 sm:w-1/2">
                  <div className="h-12 w-16 shrink-0 overflow-hidden rounded-lg opacity-60 grayscale"><PlaceImage place={s.current} /></div>
                  <ArrowRightLeft className="h-4 w-4 shrink-0 text-slate-400" />
                  <div className="h-12 w-16 shrink-0 overflow-hidden rounded-lg"><PlaceImage place={s.place} /></div>
                  <div className="min-w-0"><p className="truncate text-sm font-bold">{s.place.name}</p><p className="text-xs text-muted">Day {s.day} · {s.slot} · {s.place.estimatedCost ? `${inr(s.place.estimatedCost)}/person` : 'Free'}</p></div>
                </div>
                <p className="flex-1 text-sm text-muted">{s.reason}</p>
                {editable && <Button size="sm" variant={s.type === 'weather' ? 'primary' : 'teal'} loading={busy === s.itemId + s.place._id} onClick={() => applySwap(s)}>Apply swap</Button>}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {frees.length > 0 && (
        <Card className="p-4 sm:p-5">
          <h3 className="mb-3 flex items-center gap-2 font-bold"><Sparkles className="h-5 w-5 text-sun-500" />Free attractions to add</h3>
          <ul className="grid gap-2.5 sm:grid-cols-2">
            {frees.map((s) => (
              <li key={s.place._id} className="flex items-center gap-3 rounded-2xl border border-slate-200 p-3">
                <div className="h-12 w-16 shrink-0 overflow-hidden rounded-lg"><PlaceImage place={s.place} /></div>
                <div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{s.place.name}</p><p className="text-xs text-muted">{s.place.category} · Free</p></div>
                {editable && <Button size="sm" variant="secondary" icon={Plus} onClick={() => setAddPlace(s.place)}>Add</Button>}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {data.tips.length > 0 && (
        <Card className="p-4 sm:p-5">
          <h3 className="mb-3 flex items-center gap-2 font-bold"><Lightbulb className="h-5 w-5 text-amber-500" />Ways to spend less</h3>
          <ul className="space-y-2 text-sm text-muted">{data.tips.map((t) => <li key={t} className="flex gap-2"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-sea-500" />{t}</li>)}</ul>
        </Card>
      )}

      <AddToTripModal open={!!addPlace} onClose={() => setAddPlace(null)} place={addPlace} fixedTrip={trip} onAdded={onTripChange} />
    </div>
  );
}
