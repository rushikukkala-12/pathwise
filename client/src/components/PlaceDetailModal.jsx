import { Star, MapPin, Clock, Users, IndianRupee, Sun, Umbrella, Plus, CalendarClock } from 'lucide-react';
import { Badge, Button, Modal } from './ui';
import PlaceImage from './PlaceImage';
import { inr } from '../utils/format';
import { CROWD_STYLE } from '../utils/constants';

export default function PlaceDetailModal({ place, onClose, onAdd }) {
  if (!place) return null;
  const facts = [
    [IndianRupee, 'Entry / cost', place.estimatedCost ? `${inr(place.estimatedCost)} per person` : 'Free'],
    [Clock, 'Open', `${place.openingTime} - ${place.closingTime}`],
    [CalendarClock, 'Best time to visit', place.bestTimeToVisit],
    [place.isIndoor ? Umbrella : Sun, 'Setting', place.isIndoor ? 'Indoor (rain-friendly)' : 'Outdoor'],
  ];
  return (
    <Modal open onClose={onClose} title={place.name} subtitle={place.location} size="lg"
      footer={<><Button variant="secondary" onClick={onClose}>Close</Button>{onAdd && <Button icon={Plus} onClick={() => onAdd(place)}>Add to trip</Button>}</>}>
      <div className="h-52 overflow-hidden rounded-2xl sm:h-64"><PlaceImage place={place} /></div>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Badge className="bg-brand-50 text-brand-700 ring-brand-200">{place.category}</Badge>
        <Badge className="bg-sun-50 text-sun-700 ring-sun-200"><Star className="h-3 w-3 fill-sun-500 text-sun-500" />{place.rating} rating</Badge>
        <Badge className={CROWD_STYLE[place.crowdLevel]}><Users className="h-3 w-3" />{place.crowdLevel} crowd</Badge>
        <Badge className="bg-slate-50 text-muted ring-slate-200"><MapPin className="h-3 w-3" />{place.latitude.toFixed(3)}, {place.longitude.toFixed(3)}</Badge>
      </div>
      <p className="mt-4 text-[15px] leading-relaxed text-ink/90">{place.description}</p>
      <dl className="mt-5 grid gap-3 sm:grid-cols-2">
        {facts.map(([I, k, v]) => (
          <div key={k} className="flex items-center gap-3 rounded-2xl border border-slate-200 p-3"><div className="rounded-xl bg-slate-100 p-2 text-slate-600"><I className="h-4 w-4" /></div><div><dt className="text-xs font-semibold text-muted">{k}</dt><dd className="text-sm font-bold">{v}</dd></div></div>
        ))}
      </dl>
      {place.tags?.length > 0 && <div className="mt-4 flex flex-wrap gap-1.5">{place.tags.map((t) => <span key={t} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-muted">#{t}</span>)}</div>}
    </Modal>
  );
}
