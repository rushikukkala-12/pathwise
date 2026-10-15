import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Save, KeyRound, LogOut, Mail, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button, Card, Field, PageHeader } from '../components/ui';
import { Avatar } from '../layouts/AppLayout';
import { useAuth } from '../context/AuthContext';
import { authApi, errMsg, fieldErrors } from '../services/api';
import { fmtDate } from '../utils/format';

export default function Profile() {
  const { user, setUser, logout } = useAuth();
  const nav = useNavigate();
  const [p, setP] = useState({ name: user.name, profileImage: user.profileImage || '' });
  const [pErr, setPErr] = useState({});
  const [pBusy, setPBusy] = useState(false);
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [wErr, setWErr] = useState({});
  const [wBusy, setWBusy] = useState(false);

  const saveProfile = async (e) => {
    e.preventDefault();
    if (p.name.trim().length < 2) return setPErr({ name: 'Name must be at least 2 characters' });
    setPBusy(true); setPErr({});
    try { const r = await authApi.updateProfile({ name: p.name.trim(), profileImage: p.profileImage.trim() }); setUser(r.user); toast.success('Profile updated'); }
    catch (err) { const fe = fieldErrors(err); Object.keys(fe).length ? setPErr(fe) : toast.error(errMsg(err)); } finally { setPBusy(false); }
  };
  const savePw = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!pw.currentPassword) errs.currentPassword = 'Enter your current password';
    if (pw.newPassword.length < 6) errs.newPassword = 'New password must be at least 6 characters';
    if (pw.confirm !== pw.newPassword) errs.confirm = 'Passwords do not match';
    setWErr(errs);
    if (Object.keys(errs).length) return;
    setWBusy(true);
    try { await authApi.changePassword({ currentPassword: pw.currentPassword, newPassword: pw.newPassword }); toast.success('Password changed'); setPw({ currentPassword: '', newPassword: '', confirm: '' }); }
    catch (err) { const m = errMsg(err); /current/i.test(m) ? setWErr({ currentPassword: m }) : toast.error(m); } finally { setWBusy(false); }
  };

  return (
    <div className="mx-auto max-w-3xl animate-rise space-y-5">
      <PageHeader title="Profile" subtitle="Manage your account details." />
      <Card className="flex flex-wrap items-center gap-4 p-5 sm:p-6">
        <Avatar user={{ ...user, profileImage: p.profileImage }} size="h-16 w-16" />
        <div className="min-w-0 flex-1"><p className="text-lg font-bold">{user.name}</p><p className="flex items-center gap-1.5 text-sm text-muted"><Mail className="h-4 w-4" />{user.email}</p><p className="mt-1 flex items-center gap-1.5 text-xs text-muted"><ShieldCheck className="h-3.5 w-3.5" />{user.role === 'admin' ? 'Administrator' : 'Traveler'} · member since {fmtDate(user.createdAt, { month: 'long', year: 'numeric' })}</p></div>
        <Button variant="secondary" icon={LogOut} onClick={async () => { await logout(); nav('/login'); }}>Sign out</Button>
      </Card>
      <Card className="p-5 sm:p-6">
        <h2 className="mb-4 text-lg font-bold">Personal details</h2>
        <form onSubmit={saveProfile} noValidate className="space-y-4">
          <Field label="Full name" htmlFor="pn" error={pErr.name}><input id="pn" className="field" value={p.name} onChange={(e) => setP({ ...p, name: e.target.value })} /></Field>
          <Field label="Email" htmlFor="pe" hint="Email can't be changed."><input id="pe" className="field" value={user.email} disabled /></Field>
          <Field label="Profile image URL" htmlFor="pi" error={pErr.profileImage} hint="Optional. Paste a link to a square image."><input id="pi" className="field" value={p.profileImage} onChange={(e) => setP({ ...p, profileImage: e.target.value })} placeholder="https://…" /></Field>
          <Button type="submit" icon={Save} loading={pBusy}>Save changes</Button>
        </form>
      </Card>
      <Card className="p-5 sm:p-6">
        <h2 className="mb-4 text-lg font-bold">Change password</h2>
        <form onSubmit={savePw} noValidate className="space-y-4">
          <Field label="Current password" htmlFor="cp" error={wErr.currentPassword}><input id="cp" type="password" autoComplete="current-password" className="field" value={pw.currentPassword} onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })} /></Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="New password" htmlFor="np" error={wErr.newPassword}><input id="np" type="password" autoComplete="new-password" className="field" value={pw.newPassword} onChange={(e) => setPw({ ...pw, newPassword: e.target.value })} /></Field>
            <Field label="Confirm new password" htmlFor="cn" error={wErr.confirm}><input id="cn" type="password" autoComplete="new-password" className="field" value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} /></Field>
          </div>
          <Button type="submit" variant="secondary" icon={KeyRound} loading={wBusy}>Update password</Button>
        </form>
      </Card>
    </div>
  );
}
