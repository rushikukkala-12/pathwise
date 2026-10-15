import { cx } from './ui';

/** Responsive table: scrolls horizontally on small screens. columns: [{ key, label, render?, className?, align? }] */
export default function DataTable({ columns, rows, rowKey = '_id', empty = 'No records' }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
      <table className="w-full min-w-[40rem] text-left text-sm">
        <thead className="bg-slate-50 text-xs font-bold text-muted">
          <tr>{columns.map((c) => <th key={c.key} scope="col" className={cx('whitespace-nowrap px-4 py-3', c.align === 'right' && 'text-right')}>{c.label}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.length === 0 && <tr><td colSpan={columns.length} className="px-4 py-12 text-center text-muted">{empty}</td></tr>}
          {rows.map((r) => (
            <tr key={r[rowKey]} className="hover:bg-slate-50/60">
              {columns.map((c) => <td key={c.key} className={cx('px-4 py-3 align-middle', c.align === 'right' && 'text-right', c.className)}>{c.render ? c.render(r) : r[c.key]}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
