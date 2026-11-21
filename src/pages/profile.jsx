import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/auth';
import { homeFor } from '@/lib/session';

export default function Profile() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  if (loading) {
    return (
      <section className="page">
        <div className="page-head">
          <h1>Loading Profile</h1>
        </div>
        <p>Loading your profile information...</p>
      </section>
    );
  }

  return (
    <section className="page">
      <div className="page-head">
        <a
          href={homeFor(user)}
          onClick={(e) => { e.preventDefault(); navigate(homeFor(user), { replace: true }); }}
          className="back-link"
        >
          &larr; Back to dashboard
        </a>
        <h1>Profile</h1>
      </div>

      {user && (
        <div className="profile-card">
          <div className="profile-avatar">
            {user.full_name ? user.full_name.charAt(0) : 'U'}
          </div>
          <div className="profile-details">
            <h3>{user.full_name || 'User'}</h3>
            <p>{user.email}</p>
            <p>Account type: {user.account_type || 'N/A'}</p>
            {user.department && <p>Department: {user.department}</p>}
          </div>
        </div>
      )}

      <div className="alert alert-info">
        <p>Your profile information is managed by the Administrators. Contact an Admin to update your department or role.</p>
      </div>
    </section>
  );
}