import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { UserPlus } from 'lucide-react';
import toast from 'react-hot-toast';
import AuthLayout from '../layouts/AuthLayout';
import { Button, Field } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { errMsg, fieldErrors } from '../services/api';

const validate = (f) => {
  const e = {};
  if (f.name.trim().length < 2) e.name = 'Enter your full name (at least 2 characters)';
  if (!/^\S+@\S+\.\S+$/.test(f.email)) e.email = 'Enter a valid email address';
  if (f.password.length < 6) e.password = 'Password must be at least 6 characters';
  if (f.confirmPassword !== f.password) e.confirmPassword = 'Passwords do not match';
  return e;
};

export default function Register() {
  const { register } = useAuth();
  const nav = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => { setForm({ ...form, [k]: e.target.value }); setErrors({ ...errors, [k]: '' }); };

  const submit = async (e) => {
    e.preventDefault();
    const errs = validate(form);
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true);
    try {
      const user = await register(form);
      toast.success(`Welcome to PathWise, ${user.name.split(' ')[0]}!`);
      nav('/dashboard', { replace: true });
    } catch (err) {
      const fe = fieldErrors(err);
      if (Object.keys(fe).length) setErrors(fe); else { toast.error(errMsg(err)); if (err.response?.status === 409) setErrors({ email: errMsg(err) }); }
    } finally { setBusy(false); }
  };

  const input = (k, label, type = 'text', ph, auto) => (
    <Field label={label} htmlFor={k} error={errors[k]}>
      <input id={k} type={type} autoComplete={auto} className={`field ${errors[k] ? 'field-error' : ''}`} value={form[k]} onChange={set(k)} placeholder={ph} />
    </Field>
  );

  return (
    <AuthLayout title="Create your account" subtitle="Plan smarter trips and stay on budget."
      footer={<>Already have an account? <Link to="/login" className="link">Sign in</Link></>}>
      <form onSubmit={submit} noValidate className="space-y-4">
        {input('name', 'Full name', 'text', 'Aarav Kumar', 'name')}
        {input('email', 'Email', 'email', 'you@example.com', 'email')}
        {input('password', 'Password', 'password', 'At least 6 characters', 'new-password')}
        {input('confirmPassword', 'Confirm password', 'password', 'Repeat your password', 'new-password')}
        <Button type="submit" size="lg" icon={UserPlus} loading={busy} className="mt-2 w-full">Create account</Button>
      </form>
    </AuthLayout>
  );
}
