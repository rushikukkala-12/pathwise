import { useState } from 'react';
import { Pencil, Trash2, Receipt } from 'lucide-react';
import toast from 'react-hot-toast';
import { Badge, Button, ConfirmDialog, EmptyState } from './ui';
import { expenseApi, errMsg } from '../services/api';
import { EXPENSE_COLORS } from '../utils/constants';
import { fmtDate, inr } from '../utils/format';

export default function ExpenseList({ expenses, onEdit, onDeleted, readOnly, onAddFirst }) {
  const [target, setTarget] = useState(null);
  const [busy, setBusy] = useState(false);
  const confirm = async () => {
    setBusy(true);
    try { const r = await expenseApi.remove(target._id); toast.success('Expense deleted'); onDeleted?.(r, target); setTarget(null); } catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  };
  if (!expenses.length) return <EmptyState icon={Receipt} title="No expenses yet" text="Log what you spend and the budget meter, charts and alerts update instantly." action={onAddFirst && <Button onClick={onAddFirst}>Add your first expense</Button>} />;
  return (
    <>
      <ul className="divide-y divide-slate-100">
        {expenses.map((e) => (
          <li key={e._id} className="flex items-center gap-3 py-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xs font-bold text-white" style={{ background: EXPENSE_COLORS[e.category] }} aria-hidden>{e.category[0]}</span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{e.description}</p>
              <p className="flex flex-wrap items-center gap-x-2 text-xs text-muted"><span>{fmtDate(e.date, { day: 'numeric', month: 'short' })}</span><Badge className="bg-slate-50 text-muted ring-slate-200">{e.category}</Badge></p>
            </div>
            <p className="shrink-0 text-sm font-bold">{inr(e.amount)}</p>
            {!readOnly && (
              <div className="flex shrink-0 gap-0.5">
                <button onClick={() => onEdit(e)} aria-label={`Edit ${e.description}`} className="rounded-lg p-2 text-muted hover:bg-slate-100"><Pencil className="h-4 w-4" /></button>
                <button onClick={() => setTarget(e)} aria-label={`Delete ${e.description}`} className="rounded-lg p-2 text-red-500 hover:bg-red-50"><Trash2 className="h-4 w-4" /></button>
              </div>
            )}
          </li>
        ))}
      </ul>
      <ConfirmDialog open={!!target} onClose={() => setTarget(null)} onConfirm={confirm} loading={busy} title="Delete this expense?" confirmLabel="Delete expense"
        message={target ? `${target.description} (${inr(target.amount)}) will be removed and your remaining budget recalculated.` : ''} />
    </>
  );
}
