import { useState } from 'react';
import { Link } from 'react-router-dom';
import { KeyRound, Sun } from 'lucide-react';
import { apiClient } from '@/services/api';
import AuthLayout from './AuthLayout';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setError('Enter a valid email address.');
    setBusy(true);
    try {
      await apiClient.post('/api/auth/forgot-password', { email });
      setDone(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout panel="forgot">
      <div className="auth-card">
        <Link to="/login/customer" className="auth-back">&larr; Back to sign in</Link>
        <div className="auth-brand"><span className="auth-brand-mark"><Sun size={20} /></span><span>SOLVIX</span></div>
        <div className="auth-heading">
          <span className="auth-icon"><KeyRound size={20} /></span>
          <div>
            <h1>Reset your password</h1>
            <p>Enter your account email and we will send you a link to choose a new password.</p>
          </div>
        </div>
        {done ? (
          <div className="auth-success" role="status">
            If an account exists for <b>{email}</b>, a reset link is on its way. Check your inbox and spam folder. The link works once and expires soon.
          </div>
        ) : (
          <form onSubmit={submit} noValidate>
            <label className="auth-label" htmlFor="fp-email">Email</label>
            <input id="fp-email" type="email" autoComplete="username" className="auth-input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" disabled={busy} />
            {error && <div className="auth-error" role="alert">{error}</div>}
            <button type="submit" className="auth-submit" disabled={busy}>{busy ? 'Sending…' : 'Send reset link'}</button>
          </form>
        )}
      </div>
    </AuthLayout>
  );
}
