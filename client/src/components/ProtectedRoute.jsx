import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Logo from './Logo';

export function FullScreenLoader() {
  return <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-canvas" role="status" aria-label="Loading"><Logo /><div className="h-1 w-40 overflow-hidden rounded-full bg-slate-200"><div className="skeleton h-full w-full" /></div></div>;
}

/** roles: optional list of roles allowed. Users without the role are sent to their own home. */
export default function ProtectedRoute({ roles }) {
  const { user, loading } = useAuth();
  const loc = useLocation();
  if (loading) return <FullScreenLoader />;
  if (!user) return <Navigate to="/login" replace state={{ from: loc.pathname }} />;
  if (roles && !roles.includes(user.role)) return <Navigate to={user.role === 'admin' ? '/admin' : '/dashboard'} replace />;
  return <Outlet />;
}

export function GuestRoute() {
  const { user, loading } = useAuth();
  if (loading) return <FullScreenLoader />;
  if (user) return <Navigate to={user.role === 'admin' ? '/admin' : '/dashboard'} replace />;
  return <Outlet />;
}
