const DAY = 24 * 60 * 60 * 1000;

/** Normalise to UTC midnight so day maths never drifts with timezones. */
const startOfDay = (d) => {
  const x = new Date(d);
  return new Date(Date.UTC(x.getUTCFullYear(), x.getUTCMonth(), x.getUTCDate()));
};
const addDays = (d, n) => new Date(startOfDay(d).getTime() + n * DAY);
const diffDays = (a, b) => Math.round((startOfDay(b) - startOfDay(a)) / DAY);
const isoDate = (d) => startOfDay(d).toISOString().slice(0, 10);
const inclusiveDays = (start, end) => diffDays(start, end) + 1;

module.exports = { DAY, startOfDay, addDays, diffDays, isoDate, inclusiveDays };
