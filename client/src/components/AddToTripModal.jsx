import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Sunrise, Sun, Sunset } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button, Field, Modal, cx } from './ui';
import PlaceImage from './PlaceImage';
import { tripApi, errMsg } from '../services/api';
import { fmtRange } from '../utils/format';
import { SLOT_ORDER } from '../utils/constants';

const SLOT_ICON = { Morning: Sunrise, Afternoon: Sun, Evening: Sunset };

/** Adds a place to a chosen day/slot of one of the user's trips (to the fixed trip when `fixedTrip` is set). */
export default function AddToTripModal({ open, onClose, place, trips = [], fixedTrip, onAdded }) {
  const candidates = fixedTrip ? [fixedTrip] : trips.filter((t) => place && t.destination.toLowerCase() === place.destination.toLowerCase() && ['Planned', 'Active'].includes(t.status));
  const [tripId, setTripId] = useState('');
  const [day, setDay] = useState(1);
  const [slot, setSlot] = useState(place?.bestTimeToVisit && place.bestTimeToVisit !== 'Anytime' ? place.bestTimeToVisit : 'Morning');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setTripId(candidates[0]?._id || '');
      setDay(1);
      setSlot(place?.bestTimeToVisit && place.bestTimeToVisit !== 'Anytime' ? place.bestTimeToVisit : 'Morning');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, place?._id]);

  if (!place) return null;
  const trip = candidates.find((t) => t._id === tripId);

  const submit = async () => {
    setBusy(true);
    try {
      const r = await tripApi.modify(tripId, { action: 'add', day, slot, placeId: place._id });
      toast.success(r.message);
      onAdded?.(r.trip);
      onClose();
    } catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title="Add to trip" subtitle={place.name}
      footer={candidates.length ? <><Button variant="secondary" onClick={onClose}>Cancel</Button><Button icon={Plus} loading={busy} disabled={!tripId} onClick={submit}>Add to Day {day}</Button></> : <Button variant="secondary" onClick={onClose}>Close</Button>}>
      <div className="mb-5 flex items-center gap-3 rounded-2xl bg-slate-50 p-3"><div className="h-14 w-20 overflow-hidden rounded-xl"><PlaceImage place={place} /></div><div><p className="font-bold">{place.name}</p><p className="text-xs text-muted">{place.destination} · {place.estimatedCost ? `₹${place.estimatedCost}/person` : 'Free'}</p></div></div>
      {candidates.length === 0 ? (
        <div className="py-4 text-center text-sm text-muted">
          <p>You have no upcoming trips to <strong>{place.destination}</strong>.</p>
          <Link to={`/create-trip?destination=${encodeURIComponent(place.destination)}`} className="link mt-3 inline-block" onClick={onClose}>Plan a trip to {place.destination}</Link>
        </div>
      ) : (
        <div className="space-y-5">
          {!fixedTrip && (
            <Field label="Trip" htmlFor="att-trip">
              <select id="att-trip" className="field" value={tripId} onChange={(e) => { setTripId(e.target.value); setDay(1); }}>
                {candidates.map((t) => <option key={t._id} value={t._id}>{t.title} ({fmtRange(t.startDate, t.endDate)})</option>)}
              </select>
            </Field>
          )}
          <Field label="Day" htmlFor="att-day">
            <select id="att-day" className="field" value={day} onChange={(e) => setDay(Number(e.target.value))}>
              {Array.from({ length: trip?.numberOfDays || 1 }, (_, i) => <option key={i + 1} value={i + 1}>Day {i + 1}</option>)}
            </select>
          </Field>
          <Field label="Time of day" hint="If that slot is already planned, this place replaces it.">
            <div className="grid grid-cols-3 gap-2">
              {SLOT_ORDER.map((s) => { const I = SLOT_ICON[s]; return (
                <button key={s} type="button" onClick={() => setSlot(s)} aria-pressed={slot === s} className={cx('flex flex-col items-center gap-1 rounded-xl border px-2 py-3 text-sm font-semibold transition', slot === s ? 'border-brand-600 bg-brand-50 text-brand-700' : 'border-slate-200 text-muted hover:bg-slate-50')}><I className="h-5 w-5" />{s}</button>
              ); })}
            </div>
          </Field>
        </div>
      )}
    </Modal>
  );
}
