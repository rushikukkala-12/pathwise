import { useState } from 'react';
import { Sunrise, Sun, Sunset, Star, Clock, Route, Trash2, Replace, Plus, Droplets, Umbrella, IndianRupee, Users, CalendarDays, Sparkles, AlertTriangle, Utensils } from 'lucide-react';
import toast from 'react-hot-toast';
import { Badge, Button, Card, EmptyState, Skeleton, cx } from './ui';
import PlaceImage from './PlaceImage';
import PlacePicker from './PlacePicker';
import { WeatherIcon, isWet } from './WeatherPanel';
import useFetch from '../hooks/useFetch';
import { tripApi, weatherApi, errMsg } from '../services/api';
import { inr, fmtWeekday, fmtShort, isoDay, minutesLabel } from '../utils/format';
import { CROWD_STYLE, SLOT_ORDER } from '../utils/constants';

const SLOT_ICON = { Morning: Sunrise, Afternoon: Sun, Evening: Sunset };

export default function ItineraryView({ trip, onTripChange }) {
  const days = trip.itinerary || [];
  const [active, setActive] = useState(0);
  const [picker, setPicker] = useState(null);       // { mode: 'replace' | 'add', day, item?, slot? }
  const [busy, setBusy] = useState(null);
  const [replacements, setReplacements] = useState(null);
  const editable = trip.status !== 'Completed' && trip.status !== 'Cancelled';
  const horizon = Math.min(trip.numberOfDays, 14);
  const { data: wx } = useFetch(() => weatherApi.get(trip.destination, { days: horizon, from: isoDay(trip.startDate) }), [trip.destination, trip.startDate, horizon]);
  const forecast = Object.fromEntries((wx?.forecast || []).map((f) => [f.date, f]));

  const day = days[Math.min(active, days.length - 1)];
  if (!days.length) return <EmptyState icon={CalendarDays} title="No itinerary yet" text="Generate a day-wise plan based on your interests and budget." action={<Button icon={Sparkles} loading={busy === 'gen'} onClick={async () => { setBusy('gen'); try { const r = await tripApi.generate(trip._id); onTripChange(r.trip); toast.success(r.message); } catch (e) { toast.error(errMsg(e)); } finally { setBusy(null); } }}>Generate itinerary</Button>} />;

  const run = async (body, key) => {
    setBusy(key);
    try {
      const r = await tripApi.modify(trip._id, body);
      onTripChange(r.trip);
      toast.success(r.message || 'Itinerary updated');
      return r;
    } catch (e) { toast.error(errMsg(e)); return null; } finally { setBusy(null); }
  };

  const remove = async (item) => {
    const r = await run({ action: 'remove', day: day.day, itemId: item._id }, item._id);
    if (r) setReplacements(r.replacements?.length ? { day: day.day, slot: item.slot, list: r.replacements } : null);
  };
  const pick = async (place) => {
    const p = picker;
    setPicker(null);
    await run(p.mode === 'replace' ? { action: 'replace', day: p.day, itemId: p.item._id, placeId: place._id } : { action: 'add', day: p.day, slot: p.slot, placeId: place._id }, 'pick');
    setReplacements(null);
  };
  const addReplacement = async (r) => { await run({ action: 'add', day: replacements.day, slot: replacements.slot, placeId: r.place._id }, r.place._id); setReplacements(null); };

  const w = day && forecast[isoDay(day.date)];
  const wet = w && (isWet(w.condition) || w.tempMax >= 41);
  const outdoorOnWet = wet && day.places.some((i) => !i.place.isIndoor);
  const bySlot = Object.fromEntries(day.places.map((i) => [i.slot, i]));

  return (
    <div>
      <div className="no-scrollbar -mx-1 mb-4 flex gap-2 overflow-x-auto px-1 pb-1" role="tablist" aria-label="Itinerary days">
        {days.map((d, i) => {
          const f = forecast[isoDay(d.date)];
          return (
            <button key={d._id} role="tab" aria-selected={i === active} onClick={() => { setActive(i); setReplacements(null); }}
              className={cx('shrink-0 rounded-2xl border px-4 py-2.5 text-left transition', i === active ? 'border-brand-700 bg-brand-700 text-white shadow-sm' : 'border-slate-200 bg-white hover:border-brand-300')}>
              <span className="flex items-center gap-1.5 text-sm font-bold">Day {d.day}{f && <WeatherIcon condition={f.condition} className={cx('h-4 w-4', i === active ? 'text-white/90' : isWet(f.condition) ? 'text-brand-500' : 'text-sun-500')} />}</span>
              <span className={cx('text-xs', i === active ? 'text-brand-200' : 'text-muted')}>{fmtShort(d.date)}</span>
            </button>
          );
        })}
      </div>

      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-slate-100 bg-slate-50/60 px-5 py-3.5">
          <div><p className="text-lg font-bold">Day {day.day}</p><p className="text-xs text-muted">{fmtWeekday(day.date)}</p></div>
          {w && <Badge className={wet ? 'bg-brand-50 text-brand-700 ring-brand-200' : 'bg-sun-50 text-sun-700 ring-sun-200'}><WeatherIcon condition={w.condition} className="h-3.5 w-3.5" />{w.description}, {w.tempMax}°<Droplets className="ml-1 h-3 w-3" />{w.rainChance}%</Badge>}
          <div className="ml-auto flex flex-wrap items-center gap-4 text-sm">
            <span className="flex items-center gap-1.5 font-semibold"><IndianRupee className="h-4 w-4 text-sea-600" />{inr(day.estimatedCost)}<span className="font-normal text-muted">for {trip.numberOfTravelers} {trip.numberOfTravelers > 1 ? 'people' : 'person'}</span></span>
            <span className="flex items-center gap-1.5 text-muted"><Route className="h-4 w-4" />{Math.round(day.travelDistance)} km</span>
            <span className="flex items-center gap-1.5 text-muted"><Clock className="h-4 w-4" />{minutesLabel(day.travelTime)}</span>
          </div>
        </div>

        {outdoorOnWet && (
          <div className="flex items-start gap-3 border-b border-brand-100 bg-brand-50 px-5 py-3 text-sm text-brand-800" role="alert">
            <Umbrella className="mt-0.5 h-4 w-4 shrink-0" /><p><strong>Weather conditions may affect this activity.</strong> {w.description} is expected. Replace outdoor stops with an indoor option below, or see Dynamic Recommendations.</p>
          </div>
        )}

        <ol className="divide-y divide-slate-100">
          {SLOT_ORDER.map((slot) => {
            const item = bySlot[slot]; const Icon = SLOT_ICON[slot];
            return (
              <li key={slot} className="p-4 sm:p-5">
                <div className="mb-3 flex items-center gap-2 text-sm font-bold text-muted"><Icon className="h-4 w-4 text-sun-500" />{slot}</div>
                {item ? (
                  <div className="flex flex-col gap-4 sm:flex-row">
                    <div className="h-36 w-full shrink-0 overflow-hidden rounded-2xl sm:h-28 sm:w-44"><PlaceImage place={item.place} /></div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0"><h4 className="text-base font-bold">{item.place.name}</h4><p className="text-xs text-muted">{item.place.location}</p></div>
                        <div className="flex shrink-0 items-center gap-1 rounded-lg bg-sun-50 px-2 py-1 text-sm font-bold text-sun-700"><Star className="h-3.5 w-3.5 fill-sun-500 text-sun-500" />{item.place.rating}</div>
                      </div>
                      <p className="mt-1.5 line-clamp-2 text-sm text-muted">{item.place.description}</p>
                      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                        <Badge className="bg-slate-50 text-ink ring-slate-200">{item.estimatedCost > 0 ? `${inr(item.estimatedCost)} total` : 'Free'}</Badge>
                        <Badge className={CROWD_STYLE[item.place.crowdLevel]}><Users className="h-3 w-3" />{item.place.crowdLevel} crowd</Badge>
                        <Badge className="bg-slate-50 text-muted ring-slate-200"><Clock className="h-3 w-3" />Best: {item.place.bestTimeToVisit}</Badge>
                        {item.distanceFromPrevious > 0 && <Badge className="bg-slate-50 text-muted ring-slate-200"><Route className="h-3 w-3" />{item.distanceFromPrevious} km from previous</Badge>}
                        {item.place.isIndoor && <Badge className="bg-brand-50 text-brand-700 ring-brand-200"><Umbrella className="h-3 w-3" />Indoor</Badge>}
                        {wet && !item.place.isIndoor && <Badge className="bg-amber-50 text-amber-700 ring-amber-200"><AlertTriangle className="h-3 w-3" />Weather risk</Badge>}
                      </div>
                      {editable && (
                        <div className="mt-3 flex gap-2">
                          <Button variant="secondary" size="sm" icon={Replace} onClick={() => setPicker({ mode: 'replace', day: day.day, item })}>Replace</Button>
                          <Button variant="dangerSoft" size="sm" icon={Trash2} loading={busy === item._id} onClick={() => remove(item)}>Remove</Button>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-dashed border-slate-300 px-4 py-4 text-sm text-muted">
                    <span>Nothing planned for the {slot.toLowerCase()}.</span>
                    {editable && <Button variant="secondary" size="sm" icon={Plus} onClick={() => setPicker({ mode: 'add', day: day.day, slot })}>Add a place</Button>}
                  </div>
                )}
                {replacements && replacements.day === day.day && replacements.slot === slot && !item && (
                  <div className="mt-3 rounded-2xl bg-sea-50 p-3.5">
                    <p className="mb-2 flex items-center gap-1.5 text-sm font-bold text-sea-800"><Sparkles className="h-4 w-4" />Recommended replacements (same interest, similar budget)</p>
                    <ul className="space-y-2">
                      {replacements.list.map((r) => (
                        <li key={r.place._id} className="flex items-center gap-3 rounded-xl bg-white p-2.5">
                          <div className="h-12 w-16 shrink-0 overflow-hidden rounded-lg"><PlaceImage place={r.place} /></div>
                          <div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{r.place.name}</p><p className="text-xs text-muted">{r.place.category} · {r.place.estimatedCost ? `${inr(r.place.estimatedCost)}/person` : 'Free'} · {r.reason}</p></div>
                          <Button size="sm" variant="teal" icon={Plus} loading={busy === r.place._id} onClick={() => addReplacement(r)}>Add</Button>
                        </li>
                      ))}
                    </ul>
                    <button className="mt-2 text-xs font-semibold text-sea-800 hover:underline" onClick={() => setReplacements(null)}>Dismiss</button>
                  </div>
                )}
              </li>
            );
          })}
        </ol>

        {(day.activities?.length > 0 || day.notes) && (
          <div className="border-t border-slate-100 bg-slate-50/50 px-5 py-4">
            {day.activities?.length > 0 && <ul className="space-y-1.5 text-sm">{day.activities.map((a) => <li key={a} className="flex items-start gap-2 text-muted"><Utensils className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />{a}</li>)}</ul>}
            {day.notes && <p className="mt-2 text-xs text-slate-500">{day.notes}</p>}
          </div>
        )}
      </Card>

      <PlacePicker open={!!picker} onClose={() => setPicker(null)} trip={trip} onPick={pick}
        title={picker?.mode === 'replace' ? `Replace ${picker.item.place.name}` : `Add a ${picker?.slot?.toLowerCase() || ''} stop`}
        disabledIds={picker ? day.places.map((i) => i.place._id) : []} />
    </div>
  );
}

export const ItinerarySkeleton = () => <div className="space-y-3"><Skeleton className="h-14" /><Skeleton className="h-96" /></div>;
