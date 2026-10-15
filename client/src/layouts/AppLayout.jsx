import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { LayoutDashboard, PlusCircle, Map, Compass, Receipt, UserCircle, LogOut, Users, Plane, MapPinned, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import Logo from '../components/Logo';
import { cx } from '../components/ui';

const USER_NAV = [
  { to: '/dashboard', label: 'Dashboard', short: 'Home', icon: LayoutDashboard },
  { to: '/trips', label: 'My Trips', short: 'Trips', icon: Map },
  { to: '/create-trip', label: 'Create Trip', short: 'New', icon: PlusCircle, primary: true },
  { to: '/explore', label: 'Explore Places', short: 'Explore', icon: Compass },
  { to: '/expenses', label: 'Expenses', short: 'Expenses', icon: Receipt },
];
const ADMIN_NAV = [
  { to: '/admin', label: 'Overview', short: 'Overview', icon: ShieldCheck, end: true },
  { to: '/admin/users', label: 'Users', short: 'Users', icon: Users },
  { to: '/admin/trips', label: 'Trips', short: 'Trips', icon: Plane },
  { to: '/admin/places', label: 'Tourist Places', short: 'Places', icon: MapPinned },
];

const initials = (n = '') => n.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();

export function Avatar({ user, size = 'h-9 w-9' }) {
  return user.profileImage
    ? <img src={user.profileImage} alt="" className={cx(size, 'rounded-full object-cover')} />
    : <span className={cx(size, 'flex items-center justify-center rounded-full bg-sea-500 text-sm font-bold text-white')}>{initials(user.name)}</span>;
}

export default function AppLayout() {
  const { user, logout, isAdmin } = useAuth();
  const nav = useNavigate();
  const items = isAdmin ? ADMIN_NAV : USER_NAV;

  const signOut = async () => { await logout(); toast.success('Signed out'); nav('/login'); };

  return (
    <div className="min-h-screen lg:pl-64">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col bg-brand-900 px-4 py-6 lg:flex">
        <div className="px-2"><Logo light /></div>
        {isAdmin && <p className="mx-2 mt-5 inline-flex w-fit items-center gap-1.5 rounded-full bg-sun-500/20 px-2.5 py-1 text-xs font-bold text-sun-200"><ShieldCheck className="h-3.5 w-3.5" />Admin console</p>}
        <nav className="mt-6 flex-1 space-y-1" aria-label="Main">
          {items.map(({ to, label, icon: Icon, end, primary }) => (
            <NavLink key={to} to={to} end={end} className={({ isActive }) => cx('flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition', isActive ? 'bg-white text-brand-900 shadow-sm' : primary ? 'text-sun-200 hover:bg-white/10' : 'text-brand-200 hover:bg-white/10 hover:text-white')}>
              <Icon className="h-5 w-5" aria-hidden />{label}
            </NavLink>
          ))}
        </nav>
        <div className="rounded-2xl bg-white/5 p-3">
          <NavLink to="/profile" className="flex items-center gap-3 rounded-xl p-1 hover:bg-white/10">
            <Avatar user={user} />
            <span className="min-w-0"><span className="block truncate text-sm font-semibold text-white">{user.name}</span><span className="block truncate text-xs text-brand-300">{user.email}</span></span>
          </NavLink>
          <button onClick={signOut} className="mt-2 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-brand-200 hover:bg-white/10 hover:text-white"><LogOut className="h-4 w-4" aria-hidden />Sign out</button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200/70 bg-white/90 px-4 py-3 backdrop-blur lg:hidden">
        <Logo />
        <div className="flex items-center gap-1">
          <NavLink to="/profile" aria-label="Profile"><Avatar user={user} size="h-8 w-8" /></NavLink>
          <button onClick={signOut} aria-label="Sign out" className="rounded-lg p-2 text-muted hover:bg-slate-100"><LogOut className="h-5 w-5" /></button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-28 pt-6 sm:px-6 lg:px-8 lg:pb-12 lg:pt-8"><Outlet /></main>

      {/* Mobile bottom navigation */}
      <nav className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 backdrop-blur lg:hidden" aria-label="Main">
        <ul className="mx-auto flex max-w-lg items-stretch justify-around px-1 py-1.5">
          {items.map(({ to, short, icon: Icon, end, primary }) => (
            <li key={to} className="flex-1">
              <NavLink to={to} end={end} className={({ isActive }) => cx('flex flex-col items-center gap-0.5 rounded-xl px-1 py-1.5 text-[11px] font-semibold', isActive ? 'text-brand-700' : 'text-slate-500')}>
                {({ isActive }) => (<>
                  {primary
                    ? <span className="-mt-5 flex h-11 w-11 items-center justify-center rounded-2xl bg-sun-500 text-white shadow-lg"><Icon className="h-6 w-6" aria-hidden /></span>
                    : <span className={cx('flex h-7 w-12 items-center justify-center rounded-full transition', isActive && 'bg-brand-100')}><Icon className="h-5 w-5" aria-hidden /></span>}
                  {short}
                </>)}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
