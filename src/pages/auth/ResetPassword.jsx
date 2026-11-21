import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { KeyRound, Sun } from 'lucide-react';
import { apiClient } from '@/services/api';
import AuthLayout from './AuthLayout';

// Supabase puts the recovery token in the link's URL fragment: /reset-password#access_token=...&type=recovery
function readToken() {
  const params = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  if (params.get('error_description')) return { error: params.get('error_description').replace(/\+/g, ' ') };
  return { token: params.get('access_token') };
}

export default function ResetPassword() {
  const navigate = useNavigate();
  const { token, error: linkError } = useMemo(readToken, []);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (password.length < 8) return setError('Use at least 8 characters.');
    if (password !== confirm) return setError('The two passwords do not match.');
    setBusy(true);
    try {
      await apiClient.post('/api/auth/reset-password', { access_token: token, new_password: password });
      setDone(true);
      // drop the token from the address bar and history
      window.history.replaceState(null, '', '/reset-password');
      setTimeout(() => navigate('/login/customer', { replace: true }), 2500);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  const invalid = !token;

  return (
    <AuthLayout panel="reset">
      <div className="auth-card">
        <Link to="/login/customer" className="auth-back">&larr; Back to sign in</Link>
        <div className="auth-brand"><span className="auth-brand-mark"><Sun size={20} /></span><span>SOLVIX</span></div>
        <div className="auth-heading">
          <span className="auth-icon"><KeyRound size={20} /></span>
          <div>
            <h1>Choose a new password</h1>
            <p>Use at least 8 characters.</p>
          </div>
        </div>

        {done ? (
          <div className="auth-success" role="status">Your password has been changed. Taking you to sign in…</div>
        ) : invalid ? (
          <>
            <div className="auth-error" role="alert">{linkError || 'This reset link is missing or invalid.'}</div>
            <Link to="/forgot-password" className="auth-submit" style={{ textDecoration: 'none', textAlign: 'center', display: 'block' }}>Request a new link</Link>
          </>
        ) : (
          <form onSubmit={submit} noValidate>
            <label className="auth-label" htmlFor="rp-pass">New password</label>
            <input id="rp-pass" type="password" autoComplete="new-password" className="auth-input" value={password} onChange={(e) => setPassword(e.target.value)} disabled={busy} />
            <label className="auth-label" htmlFor="rp-confirm">Confirm new password</label>
            <input id="rp-confirm" type="password" autoComplete="new-password" className="auth-input" value={confirm} onChange={(e) => setConfirm(e.target.value)} disabled={busy} />
            {error && <div className="auth-error" role="alert">{error}</div>}
            <button type="submit" className="auth-submit" disabled={busy}>{busy ? 'Saving…' : 'Change password'}</button>
          </form>
        )}
      </div>
    </AuthLayout>
  );
}
