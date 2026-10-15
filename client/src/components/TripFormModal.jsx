import { useEffect, useState } from 'react';
import { Save, Info } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button, Field, Modal, cx } from './ui';
import { tripApi, errMsg, fieldErrors } from '../services/api';
import { INTERESTS } from '../utils/constants';
import { daysBetween, isoDay, inr } from '../utils/format';

/** Edit an existing trip. Lowering the budget (or changing dates, travelers, destination ...) re-plans the itinerary. */
export default function TripFormModal({ open, onClose, trip, onSaved }) {
  const init = () => ({ title: trip.title, startingLocation: trip.startingLocation, destination: trip.destination, startDate: isoDay(trip.startDate), endDate: isoDay(trip.endDate), numberOfTravelers: trip.numberOfTravelers, totalBudget: trip.totalBudget, interests: trip.interests });
  const [form, setForm] = useState(init);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (open) { setForm(init()); setErrors({}); } /* eslint-disable-next-line */ }, [open, trip._id]);

  const set = (k, v) => { setForm((f) => ({ ...f, [k]: v })); setErrors((e) => ({ ...e, [k]: '' })); };
  const toggle = (i) => set('interests', form.interests.includes(i) ? form.interests.filter((x) => x !== i) : [...form.interests, i]);
  const days = form.startDate && form.endDate ? daysBetween(form.startDate, form.endDate) : 0;
  const decreased = Number(form.totalBudget) < trip.totalBudget;
  const replan = decreased || form.destination.trim().toLowerCase() !== trip.destination.toLowerCase() || days !== trip.numberOfDays || form.startDate !== isoDay(trip.startDate) || Number(form.numberOfTravelers) !== trip.numberOfTravelers || [...form.interests].sort().join() !== [...trip.interests].sort().join();

  const submit = async (e) => {
    e?.preventDefault();
    const errs = {};
    if (form.title.trim().length < 2) errs.title = 'Trip name is required';
    if (!form.startingLocation.trim()) errs.startingLocation = 'Starting location is required';
    if (!form.destination.trim()) errs.destination = 'Destination is required';
    if (days < 1) errs.endDate = 'End date must be on or after the start date';
    if (days > 30) errs.endDate = 'Trips can be at most 30 days';
    if (!(Number(form.numberOfTravelers) >= 1)) errs.numberOfTravelers = 'At least 1 traveler';
    if (!(Number(form.totalBudget) >= 500)) errs.totalBudget = 'Budget must be at least ₹500';
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true);
    try {
      const res = await tripApi.update(trip._id, { ...form, numberOfTravelers: Number(form.numberOfTravelers), totalBudget: Number(form.totalBudget) });
      toast.success(res.meta.regenerated ? res.meta.reason : 'Trip updated');
      onSaved(res.trip);
      onClose();
    } catch (err) {
      const fe = fieldErrors(err);
      if (Object.keys(fe).length) setErrors(fe); else toast.error(errMsg(err));
    } finally { setBusy(false); }
  };

  const text = (k, label, type = 'text', extra = {}) => (
    <Field label={label} htmlFor={`tf-${k}`} error={errors[k]}>
      <input id={`tf-${k}`} type={type} className={cx('field', errors[k] && 'field-error')} value={form[k]} onChange={(e) => set(k, e.target.value)} {...extra} />
    </Field>
  );

  return (
    <Modal open={open} onClose={onClose} title="Edit trip" subtitle="Changes can re-plan your itinerary automatically" size="lg"
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button icon={Save} loading={busy} onClick={submit}>Save changes</Button></>}>
      <form onSubmit={submit} noValidate className="space-y-5">
        {text('title', 'Trip name')}
        <div className="grid gap-4 sm:grid-cols-2">{text('startingLocation', 'Starting location')}{text('destination', 'Destination')}</div>
        <div className="grid gap-4 sm:grid-cols-4">
          <div className="sm:col-span-1">{text('startDate', 'Start date', 'date')}</div>
          <div className="sm:col-span-1">{text('endDate', 'End date', 'date', { min: form.startDate })}</div>
          <div className="sm:col-span-1">{text('numberOfTravelers', 'Travelers', 'number', { min: 1, max: 50 })}</div>
          <div className="sm:col-span-1">{text('totalBudget', 'Budget (₹)', 'number', { min: 500, step: 500 })}</div>
        </div>
        <Field label="Interests">
          <div className="flex flex-wrap gap-2">{INTERESTS.map(({ id, icon: I }) => <button type="button" key={id} aria-pressed={form.interests.includes(id)} onClick={() => toggle(id)} className={cx('inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-semibold transition', form.interests.includes(id) ? 'border-brand-600 bg-brand-50 text-brand-800' : 'border-slate-200 text-muted hover:bg-slate-50')}><I className="h-3.5 w-3.5" />{id}</button>)}</div>
        </Field>
        {replan && (
          <div className="flex items-start gap-3 rounded-2xl bg-amber-50 p-3.5 text-sm text-amber-900" role="status">
            <Info className="mt-0.5 h-4 w-4 shrink-0" />
            <p>{decreased ? <>Your budget is dropping from {inr(trip.totalBudget)} to {inr(Number(form.totalBudget) || 0)}. </> : null}Saving will <strong>re-plan the day-wise itinerary</strong> with fresh recommendations. Manual edits to the itinerary will be replaced. Your expenses are kept.</p>
          </div>
        )}
      </form>
    </Modal>
  );
}
