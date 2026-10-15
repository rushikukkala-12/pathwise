import { Users, Plane, Receipt, MapPinned, TrendingUp } from 'lucide-react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { Card, ErrorState, PageHeader, PageSkeleton, StatCard } from '../../components/ui';
import useFetch from '../../hooks/useFetch';
import { adminApi } from '../../services/api';
import { inr, inrCompact } from '../../utils/format';
import { EXPENSE_COLORS } from '../../utils/constants';

const tip = { borderRadius: 14, border: '1px solid #E2E8F0', boxShadow: '0 8px 24px -8px rgba(20,24,50,.2)', fontSize: 13, fontWeight: 600 };
const STATUS_COLORS = { Active: '#129D8F', Planned: '#4C54D0', Completed: '#94A3B8', Cancelled: '#EF4444' };
const Box = ({ title, sub, children, className = '' }) => <Card className={`p-5 ${className}`}><h3 className="text-base font-bold">{title}</h3>{sub && <p className="text-xs text-muted">{sub}</p>}<div className="mt-3 h-60">{children}</div></Card>;
const axis = { tick: { fontSize: 11 }, axisLine: false, tickLine: false };

export default function AdminDashboard() {
  const { data: s, loading, error, reload } = useFetch(() => adminApi.stats(), []);
  if (loading) return <PageSkeleton />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  const t = s.totals;
  const topMax = Math.max(...s.topDestinations.map((d) => d.count), 1);

  return (
    <div className="animate-rise space-y-6">
      <PageHeader title="Admin overview" subtitle="Platform activity at a glance." />
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard icon={Users} label="Total users" value={t.users} />
        <StatCard icon={Plane} label="Total trips" value={t.trips} tone="sea" />
        <StatCard icon={Receipt} label="Total expenses" value={t.expenses} sub={`${inr(t.expenseAmount)} logged`} tone="sun" />
        <StatCard icon={MapPinned} label="Tourist places" value={t.places} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Box title="User growth" sub="Total registered users over time">
          <ResponsiveContainer><AreaChart data={s.usersGrowth} margin={{ left: -20 }}>
            <defs><linearGradient id="ug" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#4C54D0" stopOpacity=".35" /><stop offset="1" stopColor="#4C54D0" stopOpacity="0" /></linearGradient></defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" /><XAxis dataKey="month" {...axis} /><YAxis allowDecimals={false} {...axis} /><Tooltip contentStyle={tip} />
            <Area type="monotone" dataKey="total" name="Total users" stroke="#3B41B2" strokeWidth={3} fill="url(#ug)" />
          </AreaChart></ResponsiveContainer>
        </Box>
        <Box title="Trips created" sub="Trips created per month">
          <ResponsiveContainer><BarChart data={s.tripsCreated} margin={{ left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" /><XAxis dataKey="month" {...axis} /><YAxis allowDecimals={false} {...axis} /><Tooltip contentStyle={tip} cursor={{ fill: '#F1F5F9' }} />
            <Bar dataKey="count" name="Trips" fill="#129D8F" radius={[8, 8, 0, 0]} />
          </BarChart></ResponsiveContainer>
        </Box>
        <Box title="Expense statistics" sub="Amount spent per month">
          <ResponsiveContainer><BarChart data={s.expenseByMonth} margin={{ left: -10 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" /><XAxis dataKey="month" {...axis} /><YAxis tickFormatter={inrCompact} {...axis} /><Tooltip formatter={(v) => inr(v)} contentStyle={tip} cursor={{ fill: '#F1F5F9' }} />
            <Bar dataKey="amount" name="Spent" fill="#EE7511" radius={[8, 8, 0, 0]} />
          </BarChart></ResponsiveContainer>
        </Box>
        <Box title="Spend by category" sub="Across all trips">
          <ResponsiveContainer><PieChart>
            <Pie data={s.expenseByCategory} dataKey="value" nameKey="name" innerRadius="52%" outerRadius="82%" paddingAngle={2} stroke="none">{s.expenseByCategory.map((e) => <Cell key={e.name} fill={EXPENSE_COLORS[e.name] || '#94A3B8'} />)}</Pie>
            <Tooltip formatter={(v) => inr(v)} contentStyle={tip} /><Legend iconType="circle" wrapperStyle={{ fontSize: 12, fontWeight: 600 }} />
          </PieChart></ResponsiveContainer>
        </Box>
        <Card className="p-5">
          <h3 className="flex items-center gap-2 text-base font-bold"><TrendingUp className="h-5 w-5 text-brand-600" />Popular destinations</h3>
          <ul className="mt-4 space-y-3">{s.topDestinations.map((d) => (
            <li key={d.name}><div className="mb-1 flex justify-between text-sm"><span className="font-semibold">{d.name}</span><span className="font-bold text-muted">{d.count} {d.count === 1 ? 'trip' : 'trips'}</span></div><div className="h-2 rounded-full bg-slate-100"><div className="h-full rounded-full bg-brand-600" style={{ width: `${(d.count / topMax) * 100}%` }} /></div></li>
          ))}</ul>
        </Card>
        <Box title="Trips by status">
          <ResponsiveContainer><PieChart>
            <Pie data={s.tripStatus} dataKey="value" nameKey="name" innerRadius="45%" outerRadius="82%" paddingAngle={2} stroke="none">{s.tripStatus.map((e) => <Cell key={e.name} fill={STATUS_COLORS[e.name]} />)}</Pie><Tooltip contentStyle={tip} /><Legend iconType="circle" formatter={(v, e) => `${v} (${e.payload.value})`} wrapperStyle={{ fontSize: 12, fontWeight: 600 }} />
          </PieChart></ResponsiveContainer>
        </Box>
      </div>
    </div>
  );
}
