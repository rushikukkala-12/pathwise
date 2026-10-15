import { useEffect, useState } from 'react';
import { Pencil, Plus, Save, Search, Star, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { Badge, Button, ConfirmDialog, ErrorState, Field, Modal, PageHeader, Skeleton, cx } from '../../components/ui';
import DataTable from '../../components/DataTable';
import PlaceImage from '../../components/PlaceImage';
import useFetch from '../../hooks/useFetch';
import { placeApi, errMsg, fieldErrors } from '../../services/api';
import { PLACE_CATEGORIES, CROWD_LEVELS, BEST_TIMES, CROWD_STYLE } from '../../utils/constants';
import { inr } from '../../utils/format';

const BLANK = { name: '', destination: '', category: 'Nature', description: '', image: '', location: '', estimatedCost: 0, rating: 4, popularity: 50, crowdLevel: 'Medium', openingTime: '09:00', closingTime: '18:00', bestTimeToVisit: 'Anytime', latitude: '', longitude: '', isIndoor: false, tags: '' };

function PlaceForm({ open, onClose, place, destinations, onSaved }) {
  const editing = !!place;
  const [f, setF] = useState(BLANK);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (open) { setErrors({}); setF(place ? { ...BLANK, ...place, tags: (place.tags || []).join(', ') } : BLANK); } }, [open, place]);
  const set = (k, v) => { setF((x) => ({ ...x, [k]: v })); setErrors((e) => ({ ...e, [k]: '' })); };

  const submit = async (e) => {
    e?.preventDefault();
    const errs = {};
    if (f.name.trim().length < 2) errs.name = 'Place name is required';
    if (!f.destination.trim()) errs.destination = 'Destination is required';
    if (f.latitude === '' || Math.abs(Number(f.latitude)) > 90) errs.latitude = 'Latitude must be between -90 and 90';
    if (f.longitude === '' || Math.abs(Number(f.longitude)) > 180) errs.longitude = 'Longitude must be between -180 and 180';
    if (Number(f.estimatedCost) < 0) errs.estimatedCost = 'Cost cannot be negative';
    if (Number(f.rating) < 0 || Number(f.rating) > 5) errs.rating = 'Rating must be 0-5';
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true);
    const body = { name: f.name.trim(), destination: f.destination.trim(), category: f.category, description: f.description, image: f.image.trim(), location: f.location, estimatedCost: Number(f.estimatedCost), rating: Number(f.rating), popularity: Number(f.popularity), crowdLevel: f.crowdLevel, openingTime: f.openingTime, closingTime: f.closingTime, bestTimeToVisit: f.bestTimeToVisit, latitude: Number(f.latitude), longitude: Number(f.longitude), isIndoor: f.isIndoor, tags: f.tags.split(',').map((t) => t.trim()).filter(Boolean) };
    try {
      const r = editing ? await placeApi.update(place._id, body) : await placeApi.create(body);
      toast.success(editing ? 'Place updated' : 'Place added');
      onSaved(r.place);
      onClose();
    } catch (err) { const fe = fieldErrors(err); Object.keys(fe).length ? setErrors(fe) : toast.error(errMsg(err)); } finally { setBusy(false); }
  };

  const inp = (k, label, type = 'text', extra = {}) => <Field label={label} htmlFor={`pf-${k}`} error={errors[k]}><input id={`pf-${k}`} type={type} className={cx('field', errors[k] && 'field-error')} value={f[k]} onChange={(e) => set(k, e.target.value)} {...extra} /></Field>;
  const sel = (k, label, opts) => <Field label={label} htmlFor={`pf-${k}`} error={errors[k]}><select id={`pf-${k}`} className="field" value={f[k]} onChange={(e) => set(k, e.target.value)}>{opts.map((o) => <option key={o}>{o}</option>)}</select></Field>;

  return (
    <Modal open={open} onClose={onClose} size="lg" title={editing ? `Edit ${place.name}` : 'Add tourist place'}
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button icon={Save} loading={busy} onClick={submit}>{editing ? 'Save changes' : 'Add place'}</Button></>}>
      <form onSubmit={submit} noValidate className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">{inp('name', 'Name')}</div>
        <Field label="Destination" htmlFor="pf-destination" error={errors.destination}><input id="pf-destination" list="pf-dests" className={cx('field', errors.destination && 'field-error')} value={f.destination} onChange={(e) => set('destination', e.target.value)} /><datalist id="pf-dests">{destinations.map((d) => <option key={d} value={d} />)}</datalist></Field>
        {sel('category', 'Category', PLACE_CATEGORIES)}
        <div className="sm:col-span-2"><Field label="Description" htmlFor="pf-description"><textarea id="pf-description" rows={3} className="field" value={f.description} onChange={(e) => set('description', e.target.value)} /></Field></div>
        {inp('location', 'Area / location')}{inp('image', 'Image URL (optional)', 'url', { placeholder: 'https://…' })}
        {inp('estimatedCost', 'Cost per person (₹)', 'number', { min: 0 })}{inp('rating', 'Rating (0-5)', 'number', { min: 0, max: 5, step: 0.1 })}
        {inp('popularity', 'Popularity (0-100)', 'number', { min: 0, max: 100 })}{sel('crowdLevel', 'Crowd level', CROWD_LEVELS)}
        {inp('openingTime', 'Opening time', 'time')}{inp('closingTime', 'Closing time', 'time')}
        {sel('bestTimeToVisit', 'Best time to visit', BEST_TIMES)}
        <Field label="Setting"><label className="flex h-[42px] items-center gap-2 rounded-xl border border-slate-200 px-3.5 text-sm font-semibold"><input type="checkbox" checked={f.isIndoor} onChange={(e) => set('isIndoor', e.target.checked)} className="h-4 w-4 rounded accent-brand-700" />Indoor (rain-friendly)</label></Field>
        {inp('latitude', 'Latitude', 'number', { step: 'any' })}{inp('longitude', 'Longitude', 'number', { step: 'any' })}
        <div className="sm:col-span-2">{inp('tags', 'Tags (comma separated)', 'text', { placeholder: 'beach, sunset, photography' })}</div>
        <button type="submit" className="hidden" />
      </form>
    </Modal>
  );
}

export default function AdminPlaces() {
  const [dest, setDest] = useState('');
  const [q, setQ] = useState('');
  const [debounced, setDebounced] = useState('');
  const [limit, setLimit] = useState(25);
  const [form, setForm] = useState(null);      // { place? }
  const [del, setDel] = useState(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { const t = setTimeout(() => setDebounced(q), 300); return () => clearTimeout(t); }, [q]);
  useEffect(() => setLimit(25), [dest, debounced]);

  const dests = useFetch(() => placeApi.destinations(), []);
  const { data, loading, error, reload } = useFetch(() => placeApi.list({ destination: dest || undefined, q: debounced || undefined, limit, sort: 'name' }), [dest, debounced, limit]);

  const remove = async () => {
    setBusy(true);
    try { await placeApi.remove(del._id); toast.success('Place deleted'); setDel(null); reload({ silent: true }); dests.reload({ silent: true }); } catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  };

  return (
    <div className="animate-rise">
      <PageHeader title="Tourist places" subtitle={data ? `${data.total} places` : ''} actions={<Button icon={Plus} onClick={() => setForm({})}>Add place</Button>} />
      <div className="mb-4 flex flex-wrap gap-3">
        <div className="relative min-w-[14rem] flex-1 sm:max-w-xs"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input className="field pl-9" placeholder="Search places" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search places" /></div>
        <select className="field w-auto" value={dest} onChange={(e) => setDest(e.target.value)} aria-label="Filter by destination"><option value="">All destinations</option>{(dests.data?.destinations || []).map((d) => <option key={d}>{d}</option>)}</select>
      </div>
      {loading && !data ? <Skeleton className="h-96" /> : error ? <ErrorState message={error} onRetry={reload} /> : (<>
        <DataTable rows={data.places} empty="No places found" columns={[
          { key: 'name', label: 'Place', render: (p) => <div className="flex items-center gap-3"><div className="h-10 w-14 shrink-0 overflow-hidden rounded-lg"><PlaceImage place={p} /></div><div className="min-w-0"><p className="max-w-[14rem] truncate font-semibold">{p.name}</p><p className="text-xs text-muted">{p.location}</p></div></div> },
          { key: 'destination', label: 'Destination' },
          { key: 'category', label: 'Category', render: (p) => <Badge className="bg-brand-50 text-brand-700 ring-brand-200">{p.category}</Badge> },
          { key: 'estimatedCost', label: 'Cost', align: 'right', render: (p) => <span className="font-semibold">{p.estimatedCost ? inr(p.estimatedCost) : 'Free'}</span> },
          { key: 'rating', label: 'Rating', render: (p) => <span className="inline-flex items-center gap-1 font-semibold"><Star className="h-3.5 w-3.5 fill-sun-500 text-sun-500" />{p.rating}</span> },
          { key: 'crowdLevel', label: 'Crowd', render: (p) => <Badge className={CROWD_STYLE[p.crowdLevel]}>{p.crowdLevel}</Badge> },
          { key: 'actions', label: '', align: 'right', render: (p) => <div className="flex justify-end gap-1"><button onClick={() => setForm({ place: p })} aria-label={`Edit ${p.name}`} className="rounded-lg p-2 text-muted hover:bg-slate-100"><Pencil className="h-4 w-4" /></button><button onClick={() => setDel(p)} aria-label={`Delete ${p.name}`} className="rounded-lg p-2 text-red-500 hover:bg-red-50"><Trash2 className="h-4 w-4" /></button></div> },
        ]} />
        {data.places.length < data.total && <div className="mt-5 text-center"><Button variant="secondary" onClick={() => setLimit(limit + 25)}>Show more ({data.total - data.places.length} left)</Button></div>}
      </>)}
      <PlaceForm open={!!form} onClose={() => setForm(null)} place={form?.place} destinations={dests.data?.destinations || []} onSaved={() => { reload({ silent: true }); dests.reload({ silent: true }); }} />
      <ConfirmDialog open={!!del} onClose={() => setDel(null)} onConfirm={remove} loading={busy} title="Delete this place?" confirmLabel="Delete place" message={del ? `${del.name} will be removed from Explore. Itineraries that already include it will no longer show it.` : ''} />
    </div>
  );
}
