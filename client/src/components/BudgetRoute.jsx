import { BUDGET_LEVELS } from '../utils/constants';
import { inr } from '../utils/format';
import { cx } from './ui';

/**
 * The signature PathWise component: the budget drawn as a route from ₹0 to the budget,
 * with milestone stops at 50 / 75 / 90 % and a pin that travels as money is spent.
 * Colour changes with the budget state; overspend is shown past the end of the route.
 */
export default function BudgetRoute({ total, spent, level, percentUsed, compact = false, showFigures = true }) {
  const L = BUDGET_LEVELS[level] || BUDGET_LEVELS.safe;
  const pos = Math.min(Math.max(percentUsed, 0), 100);
  const over = spent > total ? spent - total : 0;
  return (
    <div>
      {!compact && (
        <div className="mb-3 flex items-baseline justify-between gap-2">
          <p className={cx('font-display text-3xl font-bold tracking-tight', L.text)} aria-live="polite">{Math.round(percentUsed)}% <span className="text-base font-semibold text-muted">of budget used</span></p>
          <span className={cx('rounded-full px-2.5 py-1 text-xs font-bold ring-1 ring-inset', L.soft)}>{L.label}</span>
        </div>
      )}
      <div className="relative px-2.5 pt-5" role="progressbar" aria-valuenow={Math.round(percentUsed)} aria-valuemin={0} aria-valuemax={100} aria-label="Budget used">
        <div className="relative h-2.5 rounded-full bg-slate-100">
          <div className={cx('h-full rounded-full transition-all duration-700 ease-out', L.bar)} style={{ width: `${pos}%` }} />
          {[50, 75, 90].map((m) => (
            <span key={m} className={cx('absolute top-1/2 h-4 w-0.5 -translate-y-1/2 rounded', pos >= m ? 'bg-white/80' : 'bg-slate-300')} style={{ left: `${m}%` }} />
          ))}
          {over > 0 && <span className="absolute -right-1 top-1/2 h-4 w-3 -translate-y-1/2 rounded-r-full bg-[repeating-linear-gradient(45deg,#EF4444,#EF4444_3px,#FCA5A5_3px,#FCA5A5_6px)]" />}
        </div>
        <span className="absolute top-0 -translate-x-1/2 transition-all duration-700 ease-out" style={{ left: `calc(10px + (100% - 20px) * ${pos / 100})` }}>
          <span className="block h-5 w-5 rounded-full border-[3px] border-white shadow-md" style={{ background: L.hex }} />
        </span>
      </div>
      {!compact && (
        <div className="mt-1 flex justify-between px-1 text-[11px] font-medium text-slate-400"><span>₹0</span><span>50%</span><span>75%</span><span>90%</span><span>100%</span></div>
      )}
      {showFigures && (
        <dl className={cx('mt-4 grid grid-cols-3 gap-3 text-sm', compact && 'mt-3')}>
          <div><dt className="text-xs font-medium text-muted">Budget</dt><dd className="font-bold">{inr(total)}</dd></div>
          <div><dt className="text-xs font-medium text-muted">Spent</dt><dd className={cx('font-bold', L.text)}>{inr(spent)}</dd></div>
          <div><dt className="text-xs font-medium text-muted">{over > 0 ? 'Over by' : 'Remaining'}</dt><dd className={cx('font-bold', over > 0 ? 'text-red-600' : 'text-sea-700')}>{inr(over > 0 ? over : total - spent)}</dd></div>
        </dl>
      )}
    </div>
  );
}
