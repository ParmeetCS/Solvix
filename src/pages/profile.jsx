import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '@/services/api';

export default function Profile() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Check authentication
    const token = localStorage.getItem('solvix_token');
    if (!token) {
      setLoading(false);
      navigate('/login/customer');
      return;
    }

    // Fetch user profile
    // Note: In a full implementation, we'd call an API endpoint
    // for now, use localStorage data
    const storedUser = JSON.parse(localStorage.getItem('solvix_user') || 'null');
    setUser(storedUser);
    setLoading(false);
  }, [navigate]);

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
          href="/"
          onClick={(e) => { e.preventDefault(); navigate('/'); }}
          className="back-link"
        >
          &larr; Back to home
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