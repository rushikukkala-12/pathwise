import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, LogIn, Shield, User } from 'lucide-react';
import toast from 'react-hot-toast';
import AuthLayout from '../layouts/AuthLayout';
import { Button, Field } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { errMsg, fieldErrors } from '../services/api';

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => { setForm({ ...form, [k]: e.target.value }); setErrors({ ...errors, [k]: '' }); };

  const submit = async (e, creds = form) => {
    e?.preventDefault();
    const errs = {};
    if (!/^\S+@\S+\.\S+$/.test(creds.email)) errs.email = 'Enter a valid email address';
    if (!creds.password) errs.password = 'Enter your password';
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true);
    try {
      const user = await login(creds);
      toast.success(`Welcome back, ${user.name.split(' ')[0]}!`);
      nav(user.role === 'admin' ? '/admin' : loc.state?.from || '/dashboard', { replace: true });
    } catch (err) {
      const fe = fieldErrors(err);
      if (Object.keys(fe).length) setErrors(fe); else toast.error(errMsg(err));
    } finally { setBusy(false); }
  };

  const demo = (email, password) => { setForm({ email, password }); submit(null, { email, password }); };

  return (
    <AuthLayout title="Welcome back" subtitle="Sign in to continue planning your trips."
      footer={<>New to PathWise? <Link to="/register" className="link">Create an account</Link></>}>
      <form onSubmit={submit} noValidate className="space-y-5">
        <Field label="Email" htmlFor="email" error={errors.email}>
          <input id="email" type="email" autoComplete="email" className={`field ${errors.email ? 'field-error' : ''}`} value={form.email} onChange={set('email')} placeholder="you@example.com" />
        </Field>
        <Field label="Password" htmlFor="password" error={errors.password}>
          <div className="relative">
            <input id="password" type={show ? 'text' : 'password'} autoComplete="current-password" className={`field pr-11 ${errors.password ? 'field-error' : ''}`} value={form.password} onChange={set('password')} placeholder="Your password" />
            <button type="button" onClick={() => setShow(!show)} aria-label={show ? 'Hide password' : 'Show password'} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-muted hover:bg-slate-100">{show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
          </div>
        </Field>
        <Button type="submit" size="lg" icon={LogIn} loading={busy} className="w-full">Sign in</Button>
      </form>
      <div className="mt-8 rounded-2xl border border-dashed border-slate-300 p-4">
        <p className="text-xs font-semibold text-muted">Demo accounts - one click to sign in</p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Button variant="secondary" size="sm" icon={User} disabled={busy} onClick={() => demo('user@pathwise.com', 'User@123')}>Traveler</Button>
          <Button variant="secondary" size="sm" icon={Shield} disabled={busy} onClick={() => demo('admin@pathwise.com', 'Admin@123')}>Admin</Button>
        </div>
      </div>
    </AuthLayout>
  );
}
