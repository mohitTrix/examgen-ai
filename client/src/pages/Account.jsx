import { useState } from 'react';
import { Monitor, Moon, Sun } from 'lucide-react';
import { api, errorMessage } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import { Button, ErrorBox, Field, PageHeader } from '../components/ui.jsx';

function SaveForm({ title, onSave, children, label = 'Save changes' }) {
  const [status, setStatus] = useState({});
  async function submit(e) {
    e.preventDefault();
    setStatus({ busy: true });
    try { await onSave(); setStatus({ ok: true }); } catch (err) { setStatus({ error: errorMessage(err) }); }
  }
  return (
    <form onSubmit={submit} onChange={() => status.ok && setStatus({})} className="card space-y-4 p-5">
      <h2 className="font-semibold">{title}</h2>
      {children}
      <ErrorBox message={status.error} />
      <div className="flex items-center gap-3"><Button type="submit" busy={status.busy}>{label}</Button>{status.ok && <span role="status" className="text-sm text-emerald-700 dark:text-emerald-400">Saved</span>}</div>
    </form>
  );
}

export function Profile() {
  const { user, setUser } = useAuth();
  const [f, setF] = useState({ name: user.name, role: user.role, institution: user.institution || '' });
  const bind = (k) => ({ className: 'input', value: f[k], onChange: (e) => setF({ ...f, [k]: e.target.value }) });
  return (
    <>
      <PageHeader title="User profile" subtitle={user.email} />
      <SaveForm title="Your details" onSave={async () => setUser((await api.patch('/users/me', f)).data.user)}>
        <Field label="Name"><input {...bind('name')} required minLength={2} maxLength={80} /></Field>
        <Field label="Role"><select {...bind('role')}><option value="student">Student</option><option value="teacher">Teacher</option></select></Field>
        <Field label="Institution (optional)"><input {...bind('institution')} maxLength={150} /></Field>
      </SaveForm>
    </>
  );
}

export function Settings() {
  const { user, setUser, accept, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const [prefs, setPrefs] = useState(user.preferences);
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '' });
  const select = (k, label, options) => (
    <Field label={label}><select className="input" value={prefs[k]} onChange={(e) => setPrefs({ ...prefs, [k]: e.target.value })}>{options.map((o) => <option key={o}>{o}</option>)}</select></Field>
  );
  return (
    <>
      <PageHeader title="Settings" />
      <div className="space-y-4">
        <section className="card p-5">
          <h2 className="mb-3 font-semibold">Appearance</h2>
          <div className="flex flex-wrap gap-2">{[['light', Sun], ['dark', Moon], ['system', Monitor]].map(([k, Icon]) => <button key={k} onClick={() => setTheme(k)} aria-pressed={theme === k} className={`btn capitalize ${theme === k ? 'btn-primary' : 'btn-secondary'}`}><Icon size={15} />{k}</button>)}</div>
        </section>
        <SaveForm title="Exam defaults" onSave={async () => setUser((await api.patch('/users/me', { preferences: prefs })).data.user)}>
          <div className="grid gap-4 sm:grid-cols-2">{select('defaultExam', 'Default examination', ['GATE', 'JEE', 'NEET', 'UPSC', 'University', 'Custom'])}{select('defaultDifficulty', 'Default difficulty', ['easy', 'medium', 'hard', 'mixed'])}</div>
        </SaveForm>
        <SaveForm title="Change password" label="Update password" onSave={async () => { accept((await api.put('/users/me/password', pw)).data); setPw({ currentPassword: '', newPassword: '' }); }}>
          {[['currentPassword', 'Current password', 'current-password'], ['newPassword', 'New password (8+ characters)', 'new-password']].map(([k, l, ac]) => <Field key={k} label={l}><input className="input" type="password" required minLength={k === 'newPassword' ? 8 : 1} autoComplete={ac} value={pw[k]} onChange={(e) => setPw({ ...pw, [k]: e.target.value })} /></Field>)}
        </SaveForm>
        <section className="card flex items-center justify-between gap-3 p-5"><p className="text-sm">Sign out of this device.</p><Button variant="secondary" onClick={logout}>Log out</Button></section>
      </div>
    </>
  );
}
