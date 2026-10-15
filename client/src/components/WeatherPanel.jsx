import { Sun, Cloud, CloudRain, CloudDrizzle, CloudLightning, CloudFog, Snowflake, Droplets, Wind, Thermometer, Umbrella } from 'lucide-react';
import { Card, Skeleton, ErrorState, cx } from './ui';
import useFetch from '../hooks/useFetch';
import { weatherApi } from '../services/api';
import { fmtWeekday, isoDay } from '../utils/format';

const ICONS = { Clear: Sun, Clouds: Cloud, Rain: CloudRain, Drizzle: CloudDrizzle, Thunderstorm: CloudLightning, Mist: CloudFog, Snow: Snowflake };
export const WeatherIcon = ({ condition, className = 'h-6 w-6' }) => { const I = ICONS[condition] || Cloud; return <I className={className} aria-hidden />; };
export const isWet = (c) => ['Rain', 'Drizzle', 'Thunderstorm', 'Snow'].includes(c);

const SKY = {
  Clear: 'from-sun-400 to-sun-600', Clouds: 'from-brand-500 to-brand-700', Rain: 'from-brand-700 to-brand-900', Drizzle: 'from-brand-600 to-brand-800',
  Thunderstorm: 'from-brand-800 to-brand-950', Mist: 'from-slate-500 to-slate-700', Snow: 'from-sea-400 to-brand-600',
};

/** Current conditions + forecast. `tripStart/tripDays` highlight the trip's own dates. */
export default function WeatherPanel({ destination, from, days = 7, tripStart, tripDays }) {
  const { data, loading, error, reload } = useFetch(() => weatherApi.get(destination, { days, ...(from ? { from } : {}) }), [destination, from, days]);
  if (loading) return <Card className="p-5"><Skeleton className="h-40" /></Card>;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  const { current, forecast, source } = data;
  const tripDates = new Set();
  if (tripStart && tripDays) for (let i = 0; i < tripDays; i++) tripDates.add(isoDay(new Date(new Date(tripStart).getTime() + i * 864e5)));
  const wetDays = forecast.filter((f) => isWet(f.condition) && (!tripDates.size || tripDates.has(f.date))).length;

  return (
    <Card className="overflow-hidden">
      <div className="grid md:grid-cols-[17rem_1fr]">
        <div className={cx('bg-gradient-to-br p-5 text-white', SKY[current.condition] || SKY.Clouds)}>
          <p className="text-sm font-semibold text-white/80">Now in {destination}</p>
          <div className="mt-3 flex items-center gap-4">
            <WeatherIcon condition={current.condition} className="h-14 w-14" />
            <div><p className="font-display text-5xl font-bold leading-none">{current.temp}°</p><p className="mt-1 text-sm font-medium capitalize text-white/90">{current.description}</p></div>
          </div>
          <dl className="mt-5 grid grid-cols-3 gap-2 text-xs">
            <div className="rounded-xl bg-white/15 p-2"><dt className="flex items-center gap-1 text-white/75"><Thermometer className="h-3.5 w-3.5" />Feels</dt><dd className="mt-0.5 text-sm font-bold">{current.feelsLike}°</dd></div>
            <div className="rounded-xl bg-white/15 p-2"><dt className="flex items-center gap-1 text-white/75"><Droplets className="h-3.5 w-3.5" />Humidity</dt><dd className="mt-0.5 text-sm font-bold">{current.humidity}%</dd></div>
            <div className="rounded-xl bg-white/15 p-2"><dt className="flex items-center gap-1 text-white/75"><Wind className="h-3.5 w-3.5" />Wind</dt><dd className="mt-0.5 text-sm font-bold">{Math.round(current.windSpeed)} km/h</dd></div>
          </dl>
        </div>
        <div className="min-w-0 p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-base font-bold">{tripDates.size ? 'Forecast for your trip dates' : '7-day forecast'}</h3>
            {wetDays > 0 && <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-1 text-xs font-bold text-brand-700"><Umbrella className="h-3.5 w-3.5" />{wetDays} wet {wetDays === 1 ? 'day' : 'days'} - outdoor plans may change</span>}
          </div>
          <ul className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
            {forecast.map((f) => (
              <li key={f.date} className={cx('w-[5.5rem] shrink-0 rounded-2xl border p-3 text-center', isWet(f.condition) ? 'border-brand-200 bg-brand-50/60' : 'border-slate-200 bg-slate-50/60', tripDates.has(f.date) && 'ring-2 ring-sea-400')}>
                <p className="text-[11px] font-bold text-muted">{fmtWeekday(f.date)}</p>
                <WeatherIcon condition={f.condition} className={cx('mx-auto my-2 h-7 w-7', isWet(f.condition) ? 'text-brand-600' : 'text-sun-500')} />
                <p className="text-sm font-bold">{f.tempMax}° <span className="font-medium text-slate-400">{f.tempMin}°</span></p>
                <p className="mt-0.5 flex items-center justify-center gap-0.5 text-[11px] font-semibold text-brand-600"><Droplets className="h-3 w-3" />{f.rainChance}%</p>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-muted">{source === 'live' ? 'Live data from OpenWeatherMap.' : 'Demo mode: realistic simulated weather. Add OPENWEATHER_API_KEY on the server for live data.'}</p>
        </div>
      </div>
    </Card>
  );
}
