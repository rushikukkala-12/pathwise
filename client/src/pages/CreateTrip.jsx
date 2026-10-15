import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, MapPin, CalendarRange, Wallet, Heart, ClipboardCheck, Sparkles, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button, Card, Field, PageHeader, cx } from '../components/ui';
import useFetch from '../hooks/useFetch';
import { placeApi, tripApi, errMsg, fieldErrors } from '../services/api';
import { INTERESTS, INDIAN_CITIES } from '../utils/constants';
import { daysBetween, fmtDate, inr, todayIso } from '../utils/format';

const STEPS = [
  { id: 'details', label: 'Trip details', icon: MapPin },
  { id: 'travel', label: 'Travel details', icon: CalendarRange },
  { id: 'budget', label: 'Budget', icon: Wallet },
  { id: 'interests', label: 'Interests', icon: Heart },
  { id: 'review', label: 'Review', icon: ClipboardCheck },
];

export default function CreateTrip() {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const { data: dest } = useFetch(() => placeApi.destinations(), []);
  const cities = useMemo(() => [...new Set([...(dest?.destinations || []), ...INDIAN_CITIES])], [dest]);
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ title: '', startingLocation: '', destination: params.get('destination') || '', startDate: '', endDate: '', numberOfTravelers: 2, totalBudget: '', interests: [] });
  const set = (k, v) => { setForm((f) => ({ ...f, [k]: v })); setErrors((e) => ({ ...e, [k]: '' })); };

  const days = form.startDate && form.endDate ? daysBetween(form.startDate, form.endDate) : 0;
  const budget = Number(form.totalBudget) || 0;
  const travelers = Number(form.numberOfTravelers) || 1;

  const validate = (i) => {
    const e = {};
    if (i === 0) {
      if (form.title.trim().length < 2) e.title = 'Give your trip a name';
      if (!form.startingLocation.trim()) e.startingLocation = 'Where are you starting from?';
      if (!form.destination.trim()) e.destination = 'Where do you want to go?';
      else if (form.destination.trim().toLowerCase() === form.startingLocation.trim().toLowerCase()) e.destination = 'Destination should differ from your starting location';
    }
    if (i === 1) {
      if (!form.startDate) e.startDate = 'Choose a start date';
      else if (form.startDate < todayIso()) e.startDate = 'Start date cannot be in the past';
      if (!form.endDate) e.endDate = 'Choose an end date';
      else if (form.startDate && form.endDate < form.startDate) e.endDate = 'End date must be on or after the start date';
      else if (days > 30) e.endDate = 'Trips can be at most 30 days';
      if (!(travelers >= 1 && travelers <= 50)) e.numberOfTravelers = 'Travelers must be between 1 and 50';
    }
    if (i === 2) {
      if (!(budget >= 500)) e.totalBudget = 'Budget must be at least ₹500';
      else if (budget > 100000000) e.totalBudget = 'That budget is too large';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const next = () => { if (validate(step)) setStep((s) => Math.min(s + 1, STEPS.length - 1)); };
  const back = () => setStep((s) => Math.max(s - 1, 0));

  const submit = async () => {
    for (let i = 0; i < 3; i++) if (!validate(i)) { setStep(i); return; }
    setBusy(true);
    try {
      const { trip } = await tripApi.create({ ...form, title: form.title.trim(), startingLocation: form.startingLocation.trim(), destination: form.destination.trim(), numberOfTravelers: travelers, totalBudget: budget });
      toast.success('Your trip is ready - itinerary generated!');
      nav(`/trips/${trip._id}`);
    } catch (err) {
      const fe = fieldErrors(err);
      if (Object.keys(fe).length) { setErrors(fe); setStep(['title', 'startingLocation', 'destination'].some((k) => fe[k]) ? 0 : ['startDate', 'endDate', 'numberOfTravelers'].some((k) => fe[k]) ? 1 : 2); }
      toast.error(errMsg(err));
      setBusy(false);
    }
  };

  const toggle = (i) => set('interests', form.interests.includes(i) ? form.interests.filter((x) => x !== i) : [...form.interests, i]);
  const err = (k) => errors[k];
  const review = [
    ['Trip name', form.title], ['Route', `${form.startingLocation} → ${form.destination}`],
    ['Dates', form.startDate && form.endDate ? `${fmtDate(form.startDate)} - ${fmtDate(form.endDate)} (${days} ${days === 1 ? 'day' : 'days'})` : '-'],
    ['Travelers', `${travelers} ${travelers === 1 ? 'person' : 'people'}`], ['Total budget', inr(budget)],
    ['Daily budget', `${inr(budget / Math.max(days, 1))} (${inr(budget / Math.max(days, 1) / travelers)} per person)`],
  ];

  if (busy) return (
    <div className="mx-auto flex max-w-md flex-col items-center py-24 text-center" role="status">
      <Loader2 className="h-10 w-10 animate-spin text-brand-600" /><h2 className="mt-5 text-xl font-bold">Planning your itinerary…</h2>
      <p className="mt-2 text-sm text-muted">Scoring places for your interests, budget, group size and the weather forecast.</p>
    </div>
  );

  return (
    <div className="mx-auto max-w-3xl animate-rise">
      <PageHeader title="Create a trip" subtitle="Five quick steps. We'll build a day-wise plan that fits your budget." />
      <ol className="mb-6 flex items-center" aria-label="Progress">
        {STEPS.map((s, i) => (
          <li key={s.id} className={cx('flex items-center', i < STEPS.length - 1 && 'flex-1')}>
            <button type="button" onClick={() => i < step && setStep(i)} disabled={i > step} aria-current={i === step ? 'step' : undefined}
              className={cx('flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold transition', i < step ? 'bg-sea-500 text-white' : i === step ? 'bg-brand-700 text-white ring-4 ring-brand-100' : 'bg-slate-200 text-slate-500')}>
              {i < step ? <Check className="h-5 w-5" /> : <s.icon className="h-4.5 w-4.5" />}<span className="sr-only">{s.label}</span>
            </button>
            {i < STEPS.length - 1 && <span className={cx('mx-1 h-0.5 flex-1 rounded sm:mx-2', i < step ? 'bg-sea-400' : 'bg-slate-200')} />}
          </li>
        ))}
      </ol>

      <Card className="p-5 sm:p-8">
        <p className="mb-1 text-sm font-semibold text-brand-600">Step {step + 1} of {STEPS.length}</p>
        <h2 className="mb-6 text-xl font-bold">{STEPS[step].label}</h2>

        {step === 0 && (
          <div className="space-y-5">
            <Field label="Trip name" htmlFor="title" error={err('title')}><input id="title" className={cx('field', err('title') && 'field-error')} value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="e.g. Goa beach escape" maxLength={100} autoFocus /></Field>
            <Field label="Starting location" htmlFor="from" error={err('startingLocation')}><input id="from" list="cities" className={cx('field', err('startingLocation') && 'field-error')} value={form.startingLocation} onChange={(e) => set('startingLocation', e.target.value)} placeholder="Where are you travelling from?" /></Field>
            <Field label="Destination" htmlFor="to" error={err('destination')} hint="Pick one of our curated destinations for the richest plans, or type any city.">
              <input id="to" list="cities" className={cx('field', err('destination') && 'field-error')} value={form.destination} onChange={(e) => set('destination', e.target.value)} placeholder="Where do you want to go?" />
            </Field>
            <datalist id="cities">{cities.map((c) => <option key={c} value={c} />)}</datalist>
            <div className="flex flex-wrap gap-2">{(dest?.destinations || []).map((c) => <button key={c} type="button" onClick={() => set('destination', c)} className={cx('rounded-full border px-3 py-1 text-xs font-semibold transition', form.destination === c ? 'border-brand-600 bg-brand-50 text-brand-700' : 'border-slate-200 text-muted hover:bg-slate-50')}>{c}</button>)}</div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Start date" htmlFor="sd" error={err('startDate')}><input id="sd" type="date" min={todayIso()} className={cx('field', err('startDate') && 'field-error')} value={form.startDate} onChange={(e) => { set('startDate', e.target.value); if (form.endDate && e.target.value > form.endDate) set('endDate', e.target.value); }} /></Field>
              <Field label="End date" htmlFor="ed" error={err('endDate')}><input id="ed" type="date" min={form.startDate || todayIso()} className={cx('field', err('endDate') && 'field-error')} value={form.endDate} onChange={(e) => set('endDate', e.target.value)} /></Field>
            </div>
            <div className="flex items-center gap-3 rounded-2xl bg-brand-50 p-4"><CalendarRange className="h-5 w-5 text-brand-600" /><p className="text-sm font-semibold text-brand-900">{days > 0 ? <>Travel days: <span className="text-lg font-bold">{days}</span> {days === 1 ? 'day' : 'days'}{days > 1 && <> · {days - 1} {days - 1 === 1 ? 'night' : 'nights'}</>}</> : 'Pick your dates and we will count the travel days.'}</p></div>
            <Field label="Number of travelers" htmlFor="tr" error={err('numberOfTravelers')}>
              <div className="flex items-center gap-3">
                <button type="button" aria-label="Fewer travelers" onClick={() => set('numberOfTravelers', Math.max(1, travelers - 1))} className="h-11 w-11 rounded-xl border border-slate-200 text-lg font-bold hover:bg-slate-50">−</button>
                <input id="tr" type="number" min={1} max={50} className="field w-24 text-center text-lg font-bold" value={form.numberOfTravelers} onChange={(e) => set('numberOfTravelers', e.target.value)} />
                <button type="button" aria-label="More travelers" onClick={() => set('numberOfTravelers', Math.min(50, travelers + 1))} className="h-11 w-11 rounded-xl border border-slate-200 text-lg font-bold hover:bg-slate-50">+</button>
              </div>
            </Field>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5">
            <Field label="Total budget for the whole group (₹)" htmlFor="bg" error={err('totalBudget')}>
              <div className="relative"><span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-muted">₹</span><input id="bg" type="number" min={500} step={500} inputMode="numeric" className={cx('field pl-8 text-lg font-bold', err('totalBudget') && 'field-error')} value={form.totalBudget} onChange={(e) => set('totalBudget', e.target.value)} placeholder="25000" autoFocus /></div>
            </Field>
            <div className="flex flex-wrap gap-2">{[10000, 25000, 50000, 75000, 100000].map((v) => <button key={v} type="button" onClick={() => set('totalBudget', v)} className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-muted hover:bg-slate-50">{inr(v)}</button>)}</div>
            <div className="rounded-2xl bg-gradient-to-br from-brand-800 to-brand-900 p-5 text-white">
              <p className="text-sm font-semibold text-brand-200">Your daily budget</p>
              <p className="mt-1 font-display text-4xl font-bold">{inr(budget / Math.max(days, 1))}</p>
              <p className="mt-1 text-sm text-brand-200">{days > 0 ? `${inr(budget)} over ${days} ${days === 1 ? 'day' : 'days'}` : 'Set your dates in the previous step to see this.'}{budget > 0 && days > 0 && <> · {inr(budget / days / travelers)} per person per day</>}</p>
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            <p className="mb-4 text-sm text-muted">Choose everything that appeals to you. We'll weigh these when ranking places. You can skip this step.</p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {INTERESTS.map(({ id, icon: I, hint }) => { const on = form.interests.includes(id); return (
                <button type="button" key={id} aria-pressed={on} onClick={() => toggle(id)} className={cx('relative flex flex-col items-start gap-2 rounded-2xl border p-4 text-left transition', on ? 'border-brand-600 bg-brand-50 ring-1 ring-brand-600' : 'border-slate-200 hover:border-brand-300 hover:bg-slate-50')}>
                  <span className={cx('flex h-9 w-9 items-center justify-center rounded-xl', on ? 'bg-brand-700 text-white' : 'bg-slate-100 text-slate-600')}><I className="h-5 w-5" /></span>
                  <span className="text-sm font-bold">{id}</span><span className="text-xs text-muted">{hint}</span>
                  {on && <Check className="absolute right-3 top-3 h-4 w-4 text-brand-700" />}
                </button>
              ); })}
            </div>
          </div>
        )}

        {step === 4 && (
          <div>
            <dl className="divide-y divide-slate-100 rounded-2xl border border-slate-200">
              {review.map(([k, v]) => <div key={k} className="flex flex-col gap-0.5 px-4 py-3 sm:flex-row sm:justify-between"><dt className="text-sm text-muted">{k}</dt><dd className="text-sm font-bold sm:text-right">{v}</dd></div>)}
              <div className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:justify-between"><dt className="text-sm text-muted">Interests</dt><dd className="flex flex-wrap gap-1.5 sm:justify-end">{form.interests.length ? form.interests.map((i) => <span key={i} className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-bold text-brand-700">{i}</span>) : <span className="text-sm font-bold">Open to anything</span>}</dd></div>
            </dl>
            <p className="mt-4 flex items-start gap-2 text-sm text-muted"><Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-sun-500" />After you confirm, PathWise saves the trip and generates a morning / afternoon / evening plan for every day.</p>
          </div>
        )}

        <div className="mt-8 flex items-center justify-between gap-3 border-t border-slate-100 pt-5">
          <Button variant="ghost" icon={ArrowLeft} onClick={step === 0 ? () => nav(-1) : back}>{step === 0 ? 'Cancel' : 'Back'}</Button>
          {step < STEPS.length - 1 ? <Button onClick={next}>Continue<ArrowRight className="h-4 w-4" /></Button> : <Button variant="accent" size="lg" icon={Sparkles} onClick={submit}>Create My Trip</Button>}
        </div>
      </Card>
    </div>
  );
}
