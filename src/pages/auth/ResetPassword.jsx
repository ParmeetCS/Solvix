import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '@/services/api';

export default function ResetPassword() {
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  [submitting, setSubmitting] = useState(false);
  [message, setMessage] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Get token from URL query params
    const urlParams = new URLSearchParams(window.location.search);
    const urlToken = urlParams.get('token');
    if (urlToken) {
      setToken(urlToken);
    }
  }, []);

  useEffect(() => {
    // Check if user already authenticated
    const token = localStorage.getItem('solvix_token');
    if (token) {
      navigate('/');
    }
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    if (!token) {
      setMessage('Invalid or expired reset token');
      setSubmitting(false);
      return;
    }

    if (!newPassword || newPassword.length < 6) {
      setMessage('New password must be at least 6 characters');
      setSubmitting(false);
      return;
    }

    try {
      const res = await apiClient.post('/api/auth/reset-password', {
        token,
        new_password: newPassword,
      });

      setMessage('Password has been reset successfully. You can now log in with your new password.');
      setTimeout(() => {
        setMessage(null);
        navigate('/login/customer');
      }, 2000);
    } catch (err: any) {
      setMessage(err?.message || 'Failed to reset password. Please try again.');
      setSubmitting(false);
    }
  };

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
        <h1>Reset Password</h1>
      </div>

      {message && (
        <div className="alert alert-{message.includes('success') ? 'success' : 'error'}">
          {message}
        </div>
      )}

      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        <input type="hidden" name="token" value={token} />

        <div className="field">
          <label htmlFor="new-password">New password</label>
          <input
            id="new-password"
            type="password"
            required
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="••••••••"
          />
        </div>

        <div className="field actions">
          <button type="submit" className="btn primary" disabled={submitting}>
            {submitting ? 'Resetting…' : 'Reset password'}
            <svg width="18" height="18"><use href="#arrow" /></svg>
          </button>
        </div>
      </form>
    </section>
  );
}