import { useShell } from '@/hooks/useShell';
import '@/pages/auth/auth.css';

export default function PendingApproval() {
  const { user, handleLogout } = useShell();

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-heading">
          <div>
            <h1>Access pending approval</h1>
            <p>
              {user?.full_name ? `${user.full_name}, your` : 'Your'} employee account has been created, but an
              Administrator has not yet approved your department. You will be able to open your dashboard as soon as
              access is granted.
            </p>
          </div>
        </div>
        <p className="auth-note" style={{ textAlign: 'left' }}>
          Signed in as {user?.email}. Please contact your administrator if this takes longer than expected.
        </p>
        <button className="auth-submit" onClick={handleLogout}>Sign out</button>
      </div>
    </div>
  );
}
