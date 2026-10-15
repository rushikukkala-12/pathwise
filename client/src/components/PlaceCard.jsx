import { Star, MapPin, Users, IndianRupee, Plus, Eye, Sun, Umbrella } from 'lucide-react';
import PlaceImage from './PlaceImage';
import { Badge, Button, cx } from './ui';
import { inr } from '../utils/format';
import { CROWD_STYLE } from '../utils/constants';

export const CostLabel = ({ cost }) => (cost > 0 ? inr(cost) : 'Free');

export default function PlaceCard({ place, onView, onAdd, compact = false, score, planned }) {
  return (
    <article className="card group flex flex-col overflow-hidden transition hover:-translate-y-0.5 hover:shadow-pop">
      <div className={cx('relative overflow-hidden', compact ? 'h-32' : 'h-40')}>
        <PlaceImage place={place} rounded="rounded-none" className="transition duration-500 group-hover:scale-105" />
        <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-xs font-bold text-ink backdrop-blur">{place.category}</span>
        {score != null && <span className="absolute bottom-3 left-3 rounded-full bg-sea-500 px-2.5 py-1 text-xs font-bold text-white shadow">Match {Math.round(score)}%</span>}
        {planned && <span className="absolute bottom-3 right-3 rounded-full bg-white/95 px-2.5 py-1 text-xs font-bold text-brand-700">In itinerary</span>}
        <span className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-brand-900/80 px-2 py-1 text-xs font-bold text-white backdrop-blur"><Star className="h-3 w-3 fill-sun-400 text-sun-400" aria-hidden />{place.rating?.toFixed(1)}</span>
      </div>
      <div className="flex flex-1 flex-col p-4">
        <h3 className="line-clamp-1 text-base font-bold">{place.name}</h3>
        <p className="mt-0.5 flex items-center gap-1 text-xs text-muted"><MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden /><span className="line-clamp-1">{place.location}</span></p>
        {!compact && <p className="mt-2 line-clamp-2 text-sm text-muted">{place.description}</p>}
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <Badge className="bg-slate-50 text-ink ring-slate-200"><IndianRupee className="h-3 w-3" aria-hidden /><CostLabel cost={place.estimatedCost} />{place.estimatedCost > 0 && <span className="font-medium text-muted">/ person</span>}</Badge>
          <Badge className={CROWD_STYLE[place.crowdLevel]}><Users className="h-3 w-3" aria-hidden />{place.crowdLevel} crowd</Badge>
          <Badge className="bg-slate-50 text-muted ring-slate-200">{place.isIndoor ? <><Umbrella className="h-3 w-3" aria-hidden />Indoor</> : <><Sun className="h-3 w-3" aria-hidden />Outdoor</>}</Badge>
        </div>
        {(onView || onAdd) && (
          <div className="mt-auto flex gap-2 pt-4">
            {onView && <Button variant="secondary" size="sm" icon={Eye} className="flex-1" onClick={() => onView(place)}>View details</Button>}
            {onAdd && <Button variant="primary" size="sm" icon={Plus} className="flex-1" onClick={() => onAdd(place)}>Add to trip</Button>}
          </div>
        )}
      </div>
    </article>
  );
}
