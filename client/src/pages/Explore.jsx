import { useEffect, useState } from 'react';
import { Search, SlidersHorizontal, Compass, X } from 'lucide-react';
import { Button, Card, EmptyState, ErrorState, PageHeader, Skeleton, cx } from '../components/ui';
import PlaceCard from '../components/PlaceCard';
import PlaceDetailModal from '../components/PlaceDetailModal';
import AddToTripModal from '../components/AddToTripModal';
import useFetch from '../hooks/useFetch';
import { placeApi, tripApi } from '../services/api';
import { PLACE_CATEGORIES, CROWD_LEVELS } from '../utils/constants';

const PRICES = [{ id: '', label: 'Any price' }, { id: 'free', label: 'Free', maxPrice: 0 }, { id: 'low', label: 'Under ₹200', maxPrice: 200 }, { id: 'mid', label: '₹200 - ₹1,000', minPrice: 200, maxPrice: 1000 }, { id: 'high', label: 'Above ₹1,000', minPrice: 1000 }];
const RATINGS = [{ id: '', label: 'Any rating' }, { id: '4', label: '4.0 and up' }, { id: '4.5', label: '4.5 and up' }];
const SORTS = [{ id: 'rating', label: 'Top rated' }, { id: 'popularity', label: 'Most popular' }, { id: 'cost_asc', label: 'Price: low to high' }, { id: 'cost_desc', label: 'Price: high to low' }, { id: 'name', label: 'Name A-Z' }];
const PAGE = 12;

export default function Explore() {
  const [f, setF] = useState({ q: '', destination: '', category: '', price: '', rating: '', crowdLevel: '', sort: 'rating' });
  const [q, setQ] = useState('');
  const [limit, setLimit] = useState(PAGE);
  const [viewPlace, setViewPlace] = useState(null);
  const [addPlace, setAddPlace] = useState(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const dests = useFetch(() => placeApi.destinations(), []);
  const trips = useFetch(() => tripApi.list(), []);

  useEffect(() => { const t = setTimeout(() => setF((x) => ({ ...x, q })), 300); return () => clearTimeout(t); }, [q]);
  useEffect(() => setLimit(PAGE), [f]);

  const price = PRICES.find((p) => p.id === f.price) || PRICES[0];
  const params = { q: f.q || undefined, destination: f.destination || undefined, category: f.category || undefined, crowdLevel: f.crowdLevel || undefined, rating: f.rating || undefined, minPrice: price.minPrice, maxPrice: price.maxPrice, sort: f.sort, limit };
  const { data, loading, error, reload } = useFetch(() => placeApi.list(params), [JSON.stringify(params)]);

  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const active = ['destination', 'category', 'price', 'rating', 'crowdLevel'].filter((k) => f[k]).length + (f.q ? 1 : 0);
  const reset = () => { setQ(''); setF({ q: '', destination: '', category: '', price: '', rating: '', crowdLevel: '', sort: f.sort }); };
  const places = data?.places || [];

  const select = (k, opts, label) => (
    <label className="block"><span className="mb-1 block text-xs font-semibold text-muted">{label}</span>
      <select className="field py-2" value={f[k]} onChange={(e) => set(k, e.target.value)}>{opts}</select></label>
  );

  return (
    <div className="animate-rise">
      <PageHeader title="Explore places" subtitle="Hand-picked attractions across 11 destinations, with realistic costs." />
      <Card className="mb-6 p-4">
        <div className="flex gap-2">
          <div className="relative flex-1"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={q} onChange={(e) => setQ(e.target.value)} className="field pl-9" placeholder="Search forts, beaches, food trails…" aria-label="Search places" /></div>
          <Button variant="secondary" icon={SlidersHorizontal} className="lg:hidden" onClick={() => setFiltersOpen(!filtersOpen)} aria-expanded={filtersOpen}>Filters{active ? ` (${active})` : ''}</Button>
        </div>
        <div className={cx('mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5', !filtersOpen && 'hidden lg:grid')}>
          {select('destination', <><option value="">All destinations</option>{(dests.data?.destinations || []).map((d) => <option key={d}>{d}</option>)}</>, 'Destination')}
          {select('category', <><option value="">All categories</option>{PLACE_CATEGORIES.map((c) => <option key={c}>{c}</option>)}</>, 'Category')}
          {select('price', PRICES.map((p) => <option key={p.id} value={p.id}>{p.label}</option>), 'Price per person')}
          {select('rating', RATINGS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>), 'Rating')}
          {select('crowdLevel', <><option value="">Any crowd</option>{CROWD_LEVELS.map((c) => <option key={c}>{c}</option>)}</>, 'Crowd level')}
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1">
            {['', ...PLACE_CATEGORIES].map((c) => <button key={c || 'all'} onClick={() => set('category', c)} aria-pressed={f.category === c} className={cx('shrink-0 rounded-full border px-3 py-1 text-xs font-semibold transition', f.category === c ? 'border-brand-700 bg-brand-700 text-white' : 'border-slate-200 text-muted hover:bg-slate-50')}>{c || 'All'}</button>)}
          </div>
          <div className="flex items-center gap-3">
            {active > 0 && <button onClick={reset} className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 hover:underline"><X className="h-3.5 w-3.5" />Clear filters</button>}
            <label className="flex items-center gap-2 text-xs font-semibold text-muted">Sort<select className="field w-auto py-1.5" value={f.sort} onChange={(e) => set('sort', e.target.value)}>{SORTS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}</select></label>
          </div>
        </div>
      </Card>

      {loading && !data ? <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-80" />)}</div>
        : error ? <ErrorState message={error} onRetry={reload} />
        : !places.length ? <EmptyState icon={Compass} title="No places match these filters" text="Try widening the price range, lowering the rating, or choosing another destination." action={<Button variant="secondary" onClick={reset}>Clear filters</Button>} />
        : (<>
          <p className="mb-3 text-sm text-muted" aria-live="polite">Showing {places.length} of {data.total} places</p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{places.map((p) => <PlaceCard key={p._id} place={p} onView={setViewPlace} onAdd={setAddPlace} />)}</div>
          {places.length < data.total && <div className="mt-8 text-center"><Button variant="secondary" loading={loading} onClick={() => setLimit(limit + PAGE)}>Show more places</Button></div>}
        </>)}

      <PlaceDetailModal place={viewPlace} onClose={() => setViewPlace(null)} onAdd={(p) => { setViewPlace(null); setAddPlace(p); }} />
      <AddToTripModal open={!!addPlace} onClose={() => setAddPlace(null)} place={addPlace} trips={trips.data?.trips || []} />
    </div>
  );
}
