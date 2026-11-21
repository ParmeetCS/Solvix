import { Link } from 'react-router-dom';
import { useShell } from '@/hooks/useShell';
import { homeFor } from '@/lib/session';
import AuthLayout from '@/pages/auth/AuthLayout';

export default function AccessDenied() {
  const { user, handleLogout } = useShell();

  return (
    <AuthLayout panel="denied">
      <div className="auth-card">
        <div className="auth-heading">
          <div>
            <h1>Access denied</h1>
            <p>Your account does not have permission to open this area.</p>
          </div>
        </div>
        <Link to={homeFor(user)} replace className="auth-submit" style={{ textDecoration: 'none' }}>
          Go to my dashboard
        </Link>
        <p className="auth-foot">
          Need different access? <button onClick={handleLogout} style={{ background: 'none', border: 0, color: 'var(--accent-text)', cursor: 'pointer', textDecoration: 'underline' }}>Sign out</button>
        </p>
      </div>
    </AuthLayout>
  );
}
