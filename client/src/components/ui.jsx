import { useEffect, useRef } from 'react';
import { AlertTriangle, Loader2, X, Inbox } from 'lucide-react';

export const cx = (...c) => c.filter(Boolean).join(' ');

const BTN = {
  primary: 'bg-brand-700 text-white hover:bg-brand-800 shadow-sm disabled:bg-brand-300',
  accent: 'bg-sun-500 text-white hover:bg-sun-600 shadow-sm disabled:bg-sun-200',
  teal: 'bg-sea-600 text-white hover:bg-sea-700 shadow-sm disabled:bg-sea-200',
  secondary: 'bg-white text-ink border border-slate-200 hover:bg-slate-50 hover:border-slate-300 disabled:text-slate-400',
  ghost: 'text-muted hover:bg-slate-100 hover:text-ink disabled:text-slate-300',
  danger: 'bg-red-600 text-white hover:bg-red-700 shadow-sm disabled:bg-red-300',
  dangerSoft: 'bg-red-50 text-red-700 hover:bg-red-100 disabled:opacity-50',
};
const SIZE = { sm: 'px-3 py-1.5 text-xs gap-1.5 rounded-lg', md: 'px-4 py-2.5 text-sm gap-2 rounded-xl', lg: 'px-5 py-3 text-base gap-2 rounded-xl' };

export function Button({ variant = 'primary', size = 'md', loading, icon: Icon, children, className, type = 'button', disabled, ...rest }) {
  return (
    <button type={type} disabled={disabled || loading} className={cx('inline-flex items-center justify-center font-semibold transition active:scale-[.98] disabled:cursor-not-allowed disabled:active:scale-100', BTN[variant], SIZE[size], className)} {...rest}>
      {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : Icon ? <Icon className={size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4'} aria-hidden /> : null}
      {children}
    </button>
  );
}

export const Card = ({ className, children, ...p }) => <div className={cx('card', className)} {...p}>{children}</div>;

export function Badge({ className, children }) {
  return <span className={cx('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset', className)}>{children}</span>;
}

export function Field({ label, error, hint, children, htmlFor, className }) {
  return (
    <div className={className}>
      {label && <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-semibold text-ink">{label}</label>}
      {children}
      {error ? <p role="alert" className="mt-1.5 text-xs font-medium text-red-600">{error}</p> : hint ? <p className="mt-1.5 text-xs text-muted">{hint}</p> : null}
    </div>
  );
}

export function Skeleton({ className }) { return <div className={cx('skeleton', className)} aria-hidden />; }

export function PageSkeleton({ rows = 3 }) {
  return (
    <div className="space-y-5" role="status" aria-label="Loading">
      <Skeleton className="h-9 w-64" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-28" />)}</div>
      {Array.from({ length: rows }).map((_, i) => <Skeleton key={i} className="h-40" />)}
    </div>
  );
}

export function EmptyState({ icon: Icon = Inbox, title, text, action }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-slate-300 bg-white/60 px-6 py-12 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600"><Icon className="h-7 w-7" aria-hidden /></div>
      <h3 className="text-lg font-semibold">{title}</h3>
      {text && <p className="mt-1.5 max-w-sm text-sm text-muted">{text}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({ message, onRetry }) {
  return (
    <div role="alert" className="flex flex-col items-center rounded-2xl border border-red-200 bg-red-50/70 px-6 py-10 text-center">
      <AlertTriangle className="mb-3 h-8 w-8 text-red-500" aria-hidden />
      <h3 className="font-semibold text-red-800">We couldn't load this</h3>
      <p className="mt-1 max-w-md text-sm text-red-700">{message}</p>
      {onRetry && <Button variant="secondary" size="sm" className="mt-4" onClick={() => onRetry()}>Try again</Button>}
    </div>
  );
}

export function Modal({ open, onClose, title, subtitle, children, size = 'md', footer }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    ref.current?.focus();
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [open, onClose]);
  if (!open) return null;
  const w = { sm: 'sm:max-w-md', md: 'sm:max-w-xl', lg: 'sm:max-w-3xl' }[size];
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-brand-950/50 backdrop-blur-[2px]" onClick={onClose} />
      <div ref={ref} tabIndex={-1} className={cx('relative flex max-h-[92vh] w-full animate-pop flex-col rounded-t-3xl bg-white shadow-pop sm:rounded-3xl', w)}>
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4 sm:px-6">
          <div><h2 className="text-lg font-bold">{title}</h2>{subtitle && <p className="mt-0.5 text-sm text-muted">{subtitle}</p>}</div>
          <button onClick={onClose} aria-label="Close" className="rounded-lg p-1.5 text-muted hover:bg-slate-100"><X className="h-5 w-5" /></button>
        </div>
        <div className="overflow-y-auto px-5 py-5 sm:px-6">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-4 sm:px-6">{footer}</div>}
      </div>
    </div>
  );
}

export function ConfirmDialog({ open, onClose, onConfirm, title, message, confirmLabel = 'Confirm', loading, danger = true }) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm"
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button variant={danger ? 'danger' : 'primary'} loading={loading} onClick={onConfirm}>{confirmLabel}</Button></>}>
      <p className="text-sm text-muted">{message}</p>
    </Modal>
  );
}

export function StatCard({ icon: Icon, label, value, sub, tone = 'brand' }) {
  const tones = { brand: 'bg-brand-50 text-brand-700', sea: 'bg-sea-50 text-sea-700', sun: 'bg-sun-50 text-sun-600', red: 'bg-red-50 text-red-600' };
  return (
    <Card className="p-4 sm:p-5">
      <div className="flex items-center gap-3">
        <div className={cx('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', tones[tone])}><Icon className="h-5 w-5" aria-hidden /></div>
        <p className="text-sm font-semibold text-muted">{label}</p>
      </div>
      <p className="mt-3 font-display text-2xl font-bold tracking-tight sm:text-3xl">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-muted">{sub}</p>}
    </Card>
  );
}

export function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div><h1 className="text-2xl font-bold sm:text-3xl">{title}</h1>{subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}</div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Tabs({ tabs, value, onChange, className }) {
  return (
    <div className={cx('no-scrollbar -mx-1 flex gap-1 overflow-x-auto px-1', className)} role="tablist">
      {tabs.map((t) => (
        <button key={t.id} role="tab" aria-selected={value === t.id} onClick={() => onChange(t.id)}
          className={cx('shrink-0 rounded-xl px-3.5 py-2 text-sm font-semibold transition', value === t.id ? 'bg-brand-700 text-white shadow-sm' : 'text-muted hover:bg-slate-100 hover:text-ink')}>
          {t.label}{t.badge ? <span className="ml-1.5 rounded-full bg-sun-500 px-1.5 py-0.5 text-[10px] font-bold text-white">{t.badge}</span> : null}
        </button>
      ))}
    </div>
  );
}
