import { useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button, Field, Modal, cx } from './ui';
import { expenseApi, errMsg, fieldErrors } from '../services/api';
import { EXPENSE_CATEGORIES, EXPENSE_COLORS } from '../utils/constants';
import { isoDay, todayIso, inr } from '../utils/format';
import { budgetToast } from '../utils/budgetToast';

/** Add or edit an expense. Calls onSaved(result) with the fresh budget so screens update instantly. */
export default function ExpenseModal({ open, onClose, trips = [], defaultTripId, expense, onSaved }) {
  const editing = !!expense;
  const blank = { tripId: defaultTripId || trips[0]?._id || '', category: 'Food', description: '', amount: '', date: todayIso() };
  const [form, setForm] = useState(blank);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setErrors({});
    setForm(editing ? { tripId: expense.tripId, category: expense.category, description: expense.description, amount: String(expense.amount), date: isoDay(expense.date) } : { ...blank, tripId: defaultTripId || trips[0]?._id || '' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, expense?._id, defaultTripId]);

  const set = (k, v) => { setForm((f) => ({ ...f, [k]: v })); setErrors((e) => ({ ...e, [k]: '' })); };
  const trip = trips.find((t) => t._id === form.tripId);

  const submit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!form.tripId) errs.tripId = 'Choose a trip';
    if (form.description.trim().length < 2) errs.description = 'Add a short description';
    if (!(Number(form.amount) > 0)) errs.amount = 'Enter an amount greater than zero';
    if (!form.date) errs.date = 'Choose a date';
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true);
    try {
      const body = { category: form.category, description: form.description.trim(), amount: Number(form.amount), date: form.date };
      const res = editing ? await expenseApi.update(expense._id, body) : await expenseApi.create({ ...body, tripId: form.tripId });
      toast.success(editing ? 'Expense updated' : `Added ${inr(body.amount)} to ${trip?.title || 'your trip'}`);
      budgetToast(res);
      onSaved?.(res);
      onClose();
    } catch (err) {
      const fe = fieldErrors(err);
      if (Object.keys(fe).length) setErrors(fe); else toast.error(errMsg(err));
    } finally { setBusy(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title={editing ? 'Edit expense' : 'Add expense'} subtitle={trip ? `${trip.title} - budget ${inr(trip.totalBudget)}` : undefined}
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button icon={Save} loading={busy} onClick={submit}>{editing ? 'Save changes' : 'Add expense'}</Button></>}>
      <form onSubmit={submit} noValidate className="space-y-5">
        {!editing && trips.length > 1 && (
          <Field label="Trip" htmlFor="ex-trip" error={errors.tripId}>
            <select id="ex-trip" className="field" value={form.tripId} onChange={(e) => set('tripId', e.target.value)}>{trips.map((t) => <option key={t._id} value={t._id}>{t.title} - {t.destination}</option>)}</select>
          </Field>
        )}
        <Field label="Category" error={errors.category}>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3" role="radiogroup" aria-label="Category">
            {EXPENSE_CATEGORIES.map((c) => (
              <button key={c} type="button" role="radio" aria-checked={form.category === c} onClick={() => set('category', c)}
                className={cx('flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold transition', form.category === c ? 'border-brand-600 bg-brand-50 text-brand-800' : 'border-slate-200 text-muted hover:bg-slate-50')}>
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: EXPENSE_COLORS[c] }} />{c}
              </button>
            ))}
          </div>
        </Field>
        <Field label="Description" htmlFor="ex-desc" error={errors.description}>
          <input id="ex-desc" className={cx('field', errors.description && 'field-error')} value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="e.g. Seafood dinner at Baga" maxLength={200} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Amount (₹)" htmlFor="ex-amt" error={errors.amount}>
            <input id="ex-amt" type="number" inputMode="decimal" min="1" step="any" className={cx('field', errors.amount && 'field-error')} value={form.amount} onChange={(e) => set('amount', e.target.value)} placeholder="1500" />
          </Field>
          <Field label="Date" htmlFor="ex-date" error={errors.date}>
            <input id="ex-date" type="date" className={cx('field', errors.date && 'field-error')} value={form.date} onChange={(e) => set('date', e.target.value)} />
          </Field>
        </div>
        <button type="submit" className="hidden" />
      </form>
    </Modal>
  );
}
