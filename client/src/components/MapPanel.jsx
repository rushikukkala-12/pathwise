import { useMemo, useState } from 'react';
import { Plane, Car, Clock, Route, MapPin, Navigation, Globe } from 'lucide-react';
import { Card, Skeleton, ErrorState, Tabs, cx } from './ui';
import useFetch from '../hooks/useFetch';
import { tripApi } from '../services/api';
import { CATEGORY_STYLE } from '../utils/constants';

function Journey({ route, trip }) {
  const { from, to } = route;
  const near = route.straightKm < 5;
  return (
    <div className="grid gap-5 md:grid-cols-[1.4fr_1fr]">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-50 to-sea-50 p-4">
        <svg viewBox="0 0 400 200" className="h-56 w-full" role="img" aria-label={`Route from ${trip.startingLocation} to ${trip.destination}`}>
          <defs><pattern id="dots" width="16" height="16" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1" fill="#C4CAFF" /></pattern></defs>
          <rect width="400" height="200" fill="url(#dots)" opacity=".7" />
          <path d="M60 150 C 140 40, 260 190, 340 54" fill="none" stroke="#4C54D0" strokeWidth="3" strokeDasharray="3 9" strokeLinecap="round" />
          <g transform="translate(200 100)"><circle r="16" fill="#fff" stroke="#C4CAFF" /><g transform="translate(-8 -8)" style={{ color: '#3B41B2' }}>{route.byAir ? <Plane width="16" height="16" /> : <Car width="16" height="16" />}</g></g>
          <circle cx="60" cy="150" r="9" fill="#1B1E54" /><circle cx="60" cy="150" r="3.5" fill="#fff" />
          <circle cx="340" cy="54" r="11" fill="#FA8B30" /><circle cx="340" cy="54" r="4" fill="#fff" />
          <text x="60" y="176" textAnchor="middle" fontSize="12" fontWeight="700" fill="#141832">{trip.startingLocation}</text>
          <text x="340" y="36" textAnchor="middle" fontSize="12" fontWeight="700" fill="#141832">{trip.destination}</text>
        </svg>
        <p className="mt-1 text-xs text-muted">Schematic route - {from.approximate || to.approximate ? 'one of the locations is approximate in demo mode.' : 'distances are estimates.'}</p>
      </div>
      <dl className="grid gap-3 self-center">
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 p-3.5"><div className="rounded-xl bg-brand-50 p-2.5 text-brand-700"><Route className="h-5 w-5" /></div><div><dt className="text-xs font-semibold text-muted">Distance</dt><dd className="font-bold">{near ? 'Same city' : `${Math.round(route.distanceKm).toLocaleString('en-IN')} km by road`}</dd></div></div>
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 p-3.5"><div className="rounded-xl bg-sea-50 p-2.5 text-sea-700"><Car className="h-5 w-5" /></div><div><dt className="text-xs font-semibold text-muted">By road / train (approx.)</dt><dd className="font-bold">{route.byRoad.hours} h</dd></div></div>
        {route.byAir && <div className="flex items-center gap-3 rounded-2xl border border-slate-200 p-3.5"><div className="rounded-xl bg-sun-50 p-2.5 text-sun-600"><Plane className="h-5 w-5" /></div><div><dt className="text-xs font-semibold text-muted">By air, door to door</dt><dd className="font-bold">{route.byAir.hours} h</dd></div></div>}
        <div className="flex items-center gap-3 rounded-2xl bg-brand-900 p-3.5 text-white"><div className="rounded-xl bg-white/10 p-2.5"><Clock className="h-5 w-5" /></div><div><dt className="text-xs font-semibold text-brand-200">Suggested: {route.recommendedMode}</dt><dd className="font-bold">About {route.travelTimeLabel}</dd></div></div>
      </dl>
    </div>
  );
}

function CityMap({ route, stops }) {
  const [active, setActive] = useState(null);
  const pts = useMemo(() => {
    const all = [{ lat: route.to.lat, lng: route.to.lng }, ...stops.map((s) => ({ lat: s.latitude, lng: s.longitude }))];
    const lats = all.map((p) => p.lat); const lngs = all.map((p) => p.lng);
    const minLat = Math.min(...lats), maxLat = Math.max(...lats), minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
    const spanLat = Math.max(maxLat - minLat, 0.02), spanLng = Math.max(maxLng - minLng, 0.02);
    const proj = (lat, lng) => ({ x: 40 + ((lng - minLng) / spanLng) * 520, y: 20 + (1 - (lat - minLat) / spanLat) * 260 });
    return { center: proj(route.to.lat, route.to.lng), stops: stops.map((s) => ({ ...s, ...proj(s.latitude, s.longitude) })) };
  }, [route, stops]);
  return (
    <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-[#EAF4F2]">
        <svg viewBox="0 0 600 300" className="h-72 w-full" role="img" aria-label="Map of planned stops">
          <defs><pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M40 0H0V40" fill="none" stroke="#CDE5E0" strokeWidth="1" /></pattern></defs>
          <rect width="600" height="300" fill="url(#grid)" />
          <circle cx={pts.center.x} cy={pts.center.y} r="6" fill="#1B1E54" /><text x={pts.center.x + 10} y={pts.center.y + 4} fontSize="11" fontWeight="700" fill="#1B1E54">City centre</text>
          {pts.stops.map((s) => (
            <g key={s._id} transform={`translate(${s.x} ${s.y})`} onClick={() => setActive(s._id)} style={{ cursor: 'pointer' }}>
              <circle r={active === s._id ? 17 : 13} fill={(CATEGORY_STYLE[s.category] || CATEGORY_STYLE.Nature).from} stroke="#fff" strokeWidth="3" />
              <text textAnchor="middle" dy="4" fontSize="11" fontWeight="800" fill="#fff">{s.day}</text>
              {active === s._id && <text y="-22" textAnchor="middle" fontSize="11" fontWeight="700" fill="#141832" paintOrder="stroke" stroke="#fff" strokeWidth="4">{s.name}</text>}
            </g>
          ))}
        </svg>
      </div>
      <ul className="max-h-72 space-y-1.5 overflow-y-auto pr-1">
        {stops.map((s) => (
          <li key={s._id}><button onClick={() => setActive(s._id)} className={cx('flex w-full items-center gap-3 rounded-xl border p-2.5 text-left text-sm transition', active === s._id ? 'border-brand-300 bg-brand-50' : 'border-slate-200 hover:bg-slate-50')}>
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white" style={{ background: (CATEGORY_STYLE[s.category] || CATEGORY_STYLE.Nature).from }}>{s.day}</span>
            <span className="min-w-0"><span className="block truncate font-semibold">{s.name}</span><span className="text-xs text-muted">{s.slot} · {s.category}</span></span>
          </button></li>
        ))}
      </ul>
    </div>
  );
}

function LiveMap({ route, stops }) {
  const lats = [route.to.lat, ...stops.map((s) => s.latitude)]; const lngs = [route.to.lng, ...stops.map((s) => s.longitude)];
  const pad = 0.04;
  const bbox = [Math.min(...lngs) - pad, Math.min(...lats) - pad, Math.max(...lngs) + pad, Math.max(...lats) + pad].join(',');
  return (
    <div>
      <iframe title="OpenStreetMap" className="h-80 w-full rounded-2xl border border-slate-200" loading="lazy"
        src={`https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${route.to.lat},${route.to.lng}`} />
      <p className="mt-2 text-xs text-muted">Live map by OpenStreetMap (needs an internet connection). Works without any API key.</p>
    </div>
  );
}

export default function MapPanel({ trip, refreshKey }) {
  const { data, loading, error, reload } = useFetch(() => tripApi.map(trip._id), [trip._id, refreshKey]);
  const [tab, setTab] = useState('journey');
  if (loading) return <Card className="p-5"><Skeleton className="h-64" /></Card>;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  return (
    <Card className="p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 text-base font-bold"><Navigation className="h-5 w-5 text-brand-600" />{trip.startingLocation} to {trip.destination}</h3>
        <Tabs value={tab} onChange={setTab} tabs={[{ id: 'journey', label: 'Journey' }, { id: 'city', label: `Stops (${data.stops.length})` }, { id: 'live', label: 'Live map' }]} />
      </div>
      {tab === 'journey' && <Journey route={data.route} trip={trip} />}
      {tab === 'city' && (data.stops.length ? <CityMap route={data.route} stops={data.stops} /> : <p className="py-10 text-center text-sm text-muted"><MapPin className="mx-auto mb-2 h-6 w-6" />No stops planned yet.</p>)}
      {tab === 'live' && <LiveMap route={data.route} stops={data.stops} />}
    </Card>
  );
}
