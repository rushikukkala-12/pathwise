import { useMemo, useState } from 'react';
import { Search, Star, Umbrella, Sparkles } from 'lucide-react';
import { Modal, Skeleton, EmptyState, cx } from './ui';
import PlaceImage from './PlaceImage';
import useFetch from '../hooks/useFetch';
import { placeApi } from '../services/api';
import { inr } from '../utils/format';

/** Pick a place from the trip's destination. `suggestions` (from the engine) are pinned at the top. */
export default function PlacePicker({ open, onClose, trip, onPick, title = 'Choose a place', suggestions = [], disabledIds = [] }) {
  const [q, setQ] = useState('');
  const [indoorOnly, setIndoorOnly] = useState(false);
  const { data, loading } = useFetch(() => (open ? placeApi.list({ destination: trip.destination, limit: 100, sort: 'rating' }) : Promise.resolve({ places: [] })), [open, trip.destination]);
  const disabled = new Set(disabledIds.map(String));
  const list = useMemo(() => (data?.places || []).filter((p) => (!q || p.name.toLowerCase().includes(q.toLowerCase()) || p.category.toLowerCase().includes(q.toLowerCase())) && (!indoorOnly || p.isIndoor)), [data, q, indoorOnly]);

  const Row = ({ place, note }) => {
    const off = disabled.has(String(place._id));
    return (
      <li>
        <button disabled={off} onClick={() => onPick(place)} className={cx('flex w-full items-center gap-3 rounded-2xl border p-2.5 text-left transition', off ? 'cursor-not-allowed border-slate-100 opacity-45' : 'border-slate-200 hover:border-brand-300 hover:bg-brand-50/50')}>
          <div className="h-14 w-20 shrink-0 overflow-hidden rounded-xl"><PlaceImage place={place} /></div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold">{place.name}</p>
            <p className="flex flex-wrap items-center gap-x-2 text-xs text-muted"><span>{place.category}</span><span className="flex items-center gap-0.5"><Star className="h-3 w-3 fill-sun-400 text-sun-400" />{place.rating}</span><span>{place.estimatedCost ? `${inr(place.estimatedCost)}/person` : 'Free'}</span>{place.isIndoor && <span className="flex items-center gap-0.5 text-brand-600"><Umbrella className="h-3 w-3" />Indoor</span>}</p>
            {note && <p className="mt-0.5 text-xs font-medium text-sea-700">{note}</p>}
            {off && <p className="text-xs text-muted">Already planned that day</p>}
          </div>
        </button>
      </li>
    );
  };

  return (
    <Modal open={open} onClose={onClose} title={title} subtitle={`Places in ${trip.destination}`} size="md">
      {suggestions.length > 0 && (
        <div className="mb-5">
          <p className="mb-2 flex items-center gap-1.5 text-xs font-bold text-sea-700"><Sparkles className="h-3.5 w-3.5" />Recommended for your interests and budget</p>
          <ul className="space-y-2">{suggestions.map((s) => <Row key={s.place._id} place={s.place} note={s.reason} />)}</ul>
        </div>
      )}
      <div className="mb-3 flex gap-2">
        <div className="relative flex-1"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={q} onChange={(e) => setQ(e.target.value)} className="field pl-9" placeholder="Search places" aria-label="Search places" /></div>
        <button onClick={() => setIndoorOnly(!indoorOnly)} aria-pressed={indoorOnly} className={cx('inline-flex shrink-0 items-center gap-1.5 rounded-xl border px-3 text-sm font-semibold', indoorOnly ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-slate-200 text-muted')}><Umbrella className="h-4 w-4" />Indoor</button>
      </div>
      {loading ? <div className="space-y-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-[4.5rem]" />)}</div>
        : list.length ? <ul className="space-y-2">{list.map((p) => <Row key={p._id} place={p} />)}</ul>
        : <EmptyState title="No matching places" text="Try a different search or clear the indoor filter." />}
    </Modal>
  );
}
