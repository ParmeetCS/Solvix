import { useCallback, useEffect, useState } from 'react';
import { useShell } from '@/hooks/useShell';
import { useAuth } from '@/context/auth';
import '@/pages/auth/auth.css';

export default function PendingApproval() {
  const { user, handleLogout } = useShell();
  const { refreshUser } = useAuth();
  const [checking, setChecking] = useState(false);
  const [note, setNote] = useState('');

  // Once an administrator approves the account, refreshUser updates the session and
  // the route guard sends the employee to their dashboard automatically.
  const check = useCallback(async (manual) => {
    try {
      setChecking(true);
      const fresh = await refreshUser();
      if (manual && !fresh.approved) setNote('Still waiting. An administrator has not assigned your department yet.');
    } catch {
      if (manual) setNote('Could not check right now. Please try again.');
    } finally {
      setChecking(false);
    }
  }, [refreshUser]);

  useEffect(() => {
    check(false);
    const timer = setInterval(() => check(false), 15000);
    return () => clearInterval(timer);
  }, [check]);

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-heading">
          <div>
            <h1>Access pending approval</h1>
            <p>
              {user?.full_name ? `${user.full_name}, your` : 'Your'} employee account has been created, but an
              Administrator has not yet approved your department. This page checks automatically and will open your
              dashboard as soon as access is granted.
            </p>
          </div>
        </div>
        <p className="auth-note" style={{ textAlign: 'left' }}>
          Signed in as {user?.email}. Please contact your administrator if this takes longer than expected.
        </p>
        {note && <div className="auth-error" role="status">{note}</div>}
        <button className="auth-submit" onClick={() => check(true)} disabled={checking}>
          {checking ? 'Checking…' : 'Check again'}
        </button>
        <p className="auth-foot">
          <button onClick={handleLogout} style={{ background: 'none', border: 0, color: '#d8ee8e', cursor: 'pointer', textDecoration: 'underline' }}>Sign out</button>
        </p>
      </div>
    </div>
  );
}
