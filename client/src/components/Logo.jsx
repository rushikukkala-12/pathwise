export default function Logo({ light = false, size = 'md' }) {
  const s = size === 'lg' ? 'h-11 w-11' : 'h-9 w-9';
  return (
    <span className="inline-flex items-center gap-2.5">
      <svg viewBox="0 0 64 64" className={s} aria-hidden><rect width="64" height="64" rx="16" fill={light ? '#fff' : '#1B1E54'} /><path d="M16 46c8-2 8-14 16-14s8-12 16-14" fill="none" stroke="#27B9A9" strokeWidth="5" strokeLinecap="round" /><circle cx="16" cy="46" r="5" fill={light ? '#1B1E54' : '#fff'} /><circle cx="48" cy="18" r="5" fill="#FA8B30" /></svg>
      <span className={`font-display text-xl font-bold tracking-tight ${light ? 'text-white' : 'text-ink'}`}>PathWise</span>
    </span>
  );
}
