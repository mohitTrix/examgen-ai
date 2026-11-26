import { useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { errorMessage } from '../services/api.js';
import { Button, ErrorBox, Field, Logo } from '../components/ui.jsx';

function AuthPage({ signup }) {
  const auth = useAuth();
  const location = useLocation();
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'student' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  if (auth.user) return <Navigate to={location.state?.from || '/dashboard'} replace />;
  const bind = (k) => ({ className: 'input', value: form[k], onChange: (e) => setForm({ ...form, [k]: e.target.value }), required: true });
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await (signup ? auth.signup(form) : auth.login(form));
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  }
  return (
    <div className="grid min-h-screen place-items-center p-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex justify-center"><Logo /></div>
        <form onSubmit={submit} className="card space-y-4 p-6">
          <h1 className="text-xl font-semibold">{signup ? 'Create your account' : 'Welcome back'}</h1>
          {signup && <Field label="Name"><input {...bind('name')} minLength={2} autoComplete="name" /></Field>}
          <Field label="Email"><input {...bind('email')} type="email" autoComplete="email" /></Field>
          <Field label="Password" hint={signup ? 'At least 8 characters' : undefined}><input {...bind('password')} type="password" minLength={signup ? 8 : 1} autoComplete={signup ? 'new-password' : 'current-password'} /></Field>
          {signup && <Field label="I am a"><select {...bind('role')}><option value="student">Student</option><option value="teacher">Teacher</option></select></Field>}
          <ErrorBox message={error} />
          <Button type="submit" busy={busy} className="w-full">{signup ? 'Sign up' : 'Log in'}</Button>
          <p className="muted text-center text-sm">{signup ? 'Have an account? ' : 'New here? '}<Link className="font-medium text-indigo-600 dark:text-indigo-400" to={signup ? '/login' : '/signup'} state={location.state}>{signup ? 'Log in' : 'Create an account'}</Link></p>
        </form>
      </div>
    </div>
  );
}
export const Login = () => <AuthPage key="login" />;
export const Signup = () => <AuthPage key="signup" signup />;
