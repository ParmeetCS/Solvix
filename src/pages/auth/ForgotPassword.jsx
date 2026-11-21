import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '@/services/api';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

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

    try {
      const res = await apiClient.post('/api/auth/forgot-password', {
        email,
      });

      setSent(true);
      setSubmitting(false);

      // Always show success message without revealing whether email exists
      setTimeout(() => {
        setSent(false);
        navigate('/login/customer');
      }, 3000);
    } catch (err: any) {
      setSubmitting(false);
      setMessage('Failed to send reset link. Please try again.');
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
        <h1>Forgot Password</h1>
      </div>

      {sent && (
        <div className="alert alert-success">
          If an account with that email exists, a password reset link has been sent. Please check your email.
        </div>
      )}

      {!sent && (
        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <div className="field">
            <label htmlFor="email">Email address</label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </div>

          <div className="field actions">
            <button type="submit" className="btn primary" disabled={submitting}>
              {submitting ? 'Sending…' : 'Send reset link'}
              <svg width="18" height="18"><use href="#arrow" /></svg>
            </button>
          </div>
        </form>
      )}
    </section>
  );
}