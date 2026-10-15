import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authApi } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Persistent login: the httpOnly cookie is validated by /auth/me on every page load
  useEffect(() => {
    authApi.me().then((r) => setUser(r.user)).catch(() => setUser(null)).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const onExpired = () => setUser(null);
    window.addEventListener('pw:unauthorized', onExpired);
    return () => window.removeEventListener('pw:unauthorized', onExpired);
  }, []);

  const login = useCallback(async (creds) => { const r = await authApi.login(creds); setUser(r.user); return r.user; }, []);
  const register = useCallback(async (data) => { const r = await authApi.register(data); setUser(r.user); return r.user; }, []);
  const logout = useCallback(async () => { try { await authApi.logout(); } finally { setUser(null); } }, []);

  const value = useMemo(() => ({ user, loading, login, register, logout, setUser, isAdmin: user?.role === 'admin' }), [user, loading, login, register, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
};
