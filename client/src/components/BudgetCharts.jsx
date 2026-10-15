import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, ReferenceLine } from 'recharts';
import { PieChart as PieIcon } from 'lucide-react';
import { Card, EmptyState } from './ui';
import BudgetRoute from './BudgetRoute';
import { EXPENSE_COLORS, BUDGET_LEVELS } from '../utils/constants';
import { inr, inrCompact, fmtShort } from '../utils/format';

const tip = { borderRadius: 14, border: '1px solid #E2E8F0', boxShadow: '0 8px 24px -8px rgba(20,24,50,.2)', fontSize: 13, fontWeight: 600 };
const money = (v) => inr(v);

function Chart({ title, subtitle, children }) {
  return <Card className="p-5"><h3 className="text-base font-bold">{title}</h3>{subtitle && <p className="mb-3 text-xs text-muted">{subtitle}</p>}<div className="mt-2 h-64">{children}</div></Card>;
}

const SHORT = { Accommodation: 'Stay', Transportation: 'Travel' };
const THRESHOLDS = [[50, 'Half'], [75, '75%'], [90, '90%'], [100, 'Limit']];

/** All budget analytics for a trip: progress, category pie, estimated vs actual, spend over time. */
export default function BudgetCharts({ analytics }) {
  const { state, byCategory, timeline } = analytics;
  const L = BUDGET_LEVELS[state.level];
  const pie = byCategory.filter((c) => c.actual > 0).map((c) => ({ name: c.category, value: c.actual }));
  const hasSpend = pie.length > 0;
  const line = timeline.map((t) => ({ ...t, label: fmtShort(t.date) }));

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <BudgetRoute total={state.total} spent={state.spent} level={state.level} percentUsed={state.percentUsed} />
        <div className="mt-4 flex flex-wrap gap-2">
          {THRESHOLDS.map(([t, label]) => (
            <span key={t} className={`rounded-full px-3 py-1 text-xs font-bold ring-1 ring-inset ${state.percentUsed >= t ? L.soft : 'bg-slate-50 text-slate-400 ring-slate-200'}`}>{label}{state.percentUsed >= t ? ' reached' : ''}</span>
          ))}
        </div>
        <p className={`mt-3 text-sm font-semibold ${L.text}`}>{state.message}</p>
        {(analytics.dailyAllowanceLeft != null || analytics.dailyBudget) && (
          <p className="mt-1 text-sm text-muted">Planned daily budget {inr(analytics.dailyBudget)}{analytics.dailyAllowanceLeft != null && <> · you can spend about <strong className="text-ink">{inr(Math.max(analytics.dailyAllowanceLeft, 0))}</strong> a day for the remaining {analytics.daysLeft} {analytics.daysLeft === 1 ? 'day' : 'days'}</>}.</p>
        )}
      </Card>

      {!hasSpend ? (
        <EmptyState icon={PieIcon} title="Charts appear once you add expenses" text="Add your first expense to see how your spending is distributed, how it compares with the estimate, and how it grows over the trip." />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <Chart title="Where the money went" subtitle="Expense distribution by category">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={pie} dataKey="value" nameKey="name" innerRadius="55%" outerRadius="85%" paddingAngle={2} stroke="none">{pie.map((e) => <Cell key={e.name} fill={EXPENSE_COLORS[e.name]} />)}</Pie>
                <Tooltip formatter={money} contentStyle={tip} /><Legend iconType="circle" wrapperStyle={{ fontSize: 12, fontWeight: 600 }} />
              </PieChart>
            </ResponsiveContainer>
          </Chart>
          <Chart title="Estimated vs actual" subtitle="Planned spend per category against what you've spent">
            <ResponsiveContainer>
              <BarChart data={byCategory} margin={{ left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="category" tick={{ fontSize: 11 }} interval={0} tickFormatter={(c) => SHORT[c] || c} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={inrCompact} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip formatter={money} contentStyle={tip} cursor={{ fill: '#F1F5F9' }} /><Legend iconType="circle" wrapperStyle={{ fontSize: 12, fontWeight: 600 }} />
                <Bar dataKey="estimated" name="Estimated" fill="#C4CAFF" radius={[6, 6, 0, 0]} /><Bar dataKey="actual" name="Actual" fill="#3B41B2" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Chart>
          <div className="lg:col-span-2">
            <Chart title="Spending over the trip" subtitle="Daily spend and running total against your budget">
              <ResponsiveContainer>
                <LineChart data={line} margin={{ left: -10, right: 12 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={inrCompact} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} domain={[0, (max) => Math.max(max, state.total) * 1.05]} />
                  <Tooltip formatter={money} contentStyle={tip} /><Legend iconType="circle" wrapperStyle={{ fontSize: 12, fontWeight: 600 }} />
                  <ReferenceLine y={state.total} stroke="#EF4444" strokeDasharray="5 5" label={{ value: 'Budget', position: 'insideTopRight', fill: '#EF4444', fontSize: 11, fontWeight: 700 }} />
                  <Line type="monotone" dataKey="cumulative" name="Total spent" stroke="#3B41B2" strokeWidth={3} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="amount" name="Daily spend" stroke="#EE7511" strokeWidth={2.5} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </Chart>
          </div>
        </div>
      )}
    </div>
  );
}
