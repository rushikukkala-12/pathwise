export const inr = (n) => `₹${Math.round(Number(n) || 0).toLocaleString('en-IN')}`;
export const inrCompact = (n) => {
  const v = Math.abs(Number(n) || 0);
  const s = n < 0 ? '-' : '';
  if (v >= 10000000) return `${s}₹${(v / 10000000).toFixed(1)}Cr`;
  if (v >= 100000) return `${s}₹${(v / 100000).toFixed(1)}L`;
  if (v >= 1000) return `${s}₹${(v / 1000).toFixed(v >= 10000 ? 0 : 1)}k`;
  return `${s}₹${Math.round(v)}`;
};
const D = (d) => new Date(d);
export const fmtDate = (d, o = { day: 'numeric', month: 'short', year: 'numeric' }) => D(d).toLocaleDateString('en-IN', { ...o, timeZone: 'UTC' });
export const fmtShort = (d) => fmtDate(d, { day: 'numeric', month: 'short' });
export const fmtWeekday = (d) => fmtDate(d, { weekday: 'short', day: 'numeric', month: 'short' });
export const fmtRange = (a, b) => `${fmtShort(a)} - ${fmtDate(b)}`;
export const isoDay = (d) => D(d).toISOString().slice(0, 10);
export const todayIso = () => new Date().toISOString().slice(0, 10);
export const daysBetween = (a, b) => Math.round((D(b) - D(a)) / 864e5) + 1;
export const minutesLabel = (m) => (m >= 60 ? `${Math.floor(m / 60)}h ${m % 60 ? `${m % 60}m` : ''}`.trim() : `${m} min`);
export const pct = (n) => `${Math.round(n)}%`;
