const User = require('../models/User');
const Trip = require('../models/Trip');
const Expense = require('../models/Expense');
const Place = require('../models/Place');
const asyncHandler = require('../utils/asyncHandler');
const { computeStatus } = require('../services/tripService');

const monthKey = (d) => new Date(d).toISOString().slice(0, 7);
function lastMonths(n) {
  const out = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) out.push(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1)).toISOString().slice(0, 7));
  return out;
}
const label = (k) => new Date(`${k}-01T00:00:00Z`).toLocaleString('en-IN', { month: 'short', year: '2-digit', timeZone: 'UTC' });

exports.users = asyncHandler(async (req, res) => {
  const [users, trips] = await Promise.all([User.find().sort({ createdAt: -1 }).lean(), Trip.find().select('userId').lean()]);
  const counts = {};
  trips.forEach((t) => { counts[t.userId] = (counts[t.userId] || 0) + 1; });
  res.json({ users: users.map((u) => ({ _id: u._id, name: u.name, email: u.email, role: u.role, createdAt: u.createdAt, tripCount: counts[u._id] || 0 })) });
});

exports.trips = asyncHandler(async (req, res) => {
  const [trips, users] = await Promise.all([Trip.find().sort({ createdAt: -1 }).lean(), User.find().select('name email').lean()]);
  const byId = Object.fromEntries(users.map((u) => [String(u._id), u]));
  res.json({ trips: trips.map((t) => ({ ...t, itinerary: undefined, status: computeStatus(t), user: byId[String(t.userId)] ? { name: byId[String(t.userId)].name, email: byId[String(t.userId)].email } : null })) });
});

exports.expenses = asyncHandler(async (req, res) => {
  const [expenses, users, trips] = await Promise.all([Expense.find().sort({ date: -1 }).limit(500).lean(), User.find().select('name').lean(), Trip.find().select('title destination').lean()]);
  const u = Object.fromEntries(users.map((x) => [String(x._id), x.name]));
  const t = Object.fromEntries(trips.map((x) => [String(x._id), x]));
  res.json({ expenses: expenses.map((e) => ({ ...e, userName: u[String(e.userId)] || 'Unknown', trip: t[String(e.tripId)] ? t[String(e.tripId)].title : 'Deleted trip', destination: t[String(e.tripId)] && t[String(e.tripId)].destination })) });
});

exports.statistics = asyncHandler(async (req, res) => {
  const [users, trips, expenses, totalPlaces] = await Promise.all([User.find().select('createdAt role').lean(), Trip.find().lean(), Expense.find().lean(), Place.countDocuments()]);
  const months = lastMonths(6);
  const bucket = (items, field) => { const m = Object.fromEntries(months.map((k) => [k, 0])); items.forEach((i) => { const k = monthKey(i[field]); if (k in m) m[k] += 1; }); return months.map((k) => ({ month: label(k), count: m[k] })); };

  const spendByMonth = Object.fromEntries(months.map((k) => [k, 0]));
  expenses.forEach((e) => { const k = monthKey(e.date); if (k in spendByMonth) spendByMonth[k] += e.amount; });
  const byCategory = {};
  expenses.forEach((e) => { byCategory[e.category] = (byCategory[e.category] || 0) + e.amount; });
  const dest = {};
  trips.forEach((t) => { dest[t.destination] = (dest[t.destination] || 0) + 1; });
  const statusCount = {};
  trips.forEach((t) => { const s = computeStatus(t); statusCount[s] = (statusCount[s] || 0) + 1; });

  res.json({
    totals: { users: users.length, trips: trips.length, expenses: expenses.length, expenseAmount: expenses.reduce((s, e) => s + e.amount, 0), places: totalPlaces },
    usersGrowth: bucket(users, 'createdAt').map((m, i) => {
      // running total of registered users at the end of each month
      const end = new Date(`${months[i]}-01T00:00:00Z`); end.setUTCMonth(end.getUTCMonth() + 1);
      return { ...m, total: users.filter((u) => new Date(u.createdAt) < end).length };
    }),
    tripsCreated: bucket(trips, 'createdAt'),
    expenseByMonth: months.map((k) => ({ month: label(k), amount: spendByMonth[k] })),
    expenseByCategory: Object.entries(byCategory).map(([name, value]) => ({ name, value })),
    topDestinations: Object.entries(dest).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 6),
    tripStatus: Object.entries(statusCount).map(([name, value]) => ({ name, value })),
  });
});
