import { Link } from 'react-router-dom';
import { CloudRain, Wallet, Route } from 'lucide-react';
import Logo from '../components/Logo';
import BudgetRoute from '../components/BudgetRoute';

export default function AuthLayout({ title, subtitle, children, footer }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      <section className="relative hidden overflow-hidden bg-brand-900 p-12 text-white lg:flex lg:flex-col lg:justify-between lg:gap-8 xl:p-14">
        <svg className="pointer-events-none absolute inset-0 h-full w-full opacity-[.18]" viewBox="0 0 600 800" preserveAspectRatio="xMidYMid slice" aria-hidden>
          <path d="M-20 700 C 120 640, 180 520, 300 540 S 480 420, 380 300 S 520 140, 640 60" fill="none" stroke="#27B9A9" strokeWidth="3" strokeDasharray="2 12" strokeLinecap="round" />
          <circle cx="300" cy="540" r="8" fill="#fff" /><circle cx="380" cy="300" r="8" fill="#FA8B30" />
        </svg>
        <Link to="/login" className="relative w-fit"><Logo light size="lg" /></Link>
        <div className="relative max-w-lg">
          <h2 className="text-4xl font-bold leading-[1.1] 2xl:text-5xl">The itinerary that changes when your trip does.</h2>
          <p className="mt-5 text-lg text-brand-200">Tell PathWise where you want to go and what you can spend. It plans each day, then re-plans as your expenses, budget and the weather move.</p>
          <div className="mt-8 rounded-3xl bg-white p-6 text-ink shadow-pop">
            <p className="mb-4 text-sm font-semibold text-muted">Goa Beach Escape · day 3</p>
            <BudgetRoute total={45000} spent={39000} level="caution" percentUsed={86.7} />
            <div className="mt-4 rounded-xl bg-sun-50 p-3 text-sm font-medium text-sun-700">Budget is running low. Swap the seafood dinner for Baga Beach and save ₹1,800.</div>
          </div>
          <ul className="mt-6 space-y-2.5 text-sm text-brand-100">
            <li className="flex items-center gap-3"><Route className="h-5 w-5 text-sea-300" />Day-wise plans built from your interests</li>
            <li className="flex items-center gap-3"><Wallet className="h-5 w-5 text-sea-300" />Spending tracked live, without a page refresh</li>
            <li className="flex items-center gap-3"><CloudRain className="h-5 w-5 text-sea-300" />Indoor alternatives when rain is forecast</li>
          </ul>
        </div>
        <p className="relative text-xs text-brand-300">PathWise · Dynamic tourism planning &amp; real-time budgeting</p>
      </section>
      <section className="flex items-center justify-center px-5 py-10 sm:px-10">
        <div className="w-full max-w-md animate-rise">
          <div className="mb-8 lg:hidden"><Logo /></div>
          <h1 className="text-3xl font-bold">{title}</h1>
          <p className="mt-2 text-muted">{subtitle}</p>
          <div className="mt-8">{children}</div>
          {footer && <p className="mt-8 text-center text-sm text-muted">{footer}</p>}
        </div>
      </section>
    </div>
  );
}
