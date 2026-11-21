import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '@/services/api';

export default function EmployeeLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
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
    setMessage(null);

    try {
      const res = await apiClient.post('/api/auth/login', {
        email,
        password,
      });

      // Login successful - store token
      const token = res.headers.get('x-supabase-auth-token');
      if (token) {
        localStorage.setItem('solvix_token', token);
      }

      setMessage('Login successful');
      setTimeout(() => navigate('/'), 2000);
    } catch (err: any) {
      setMessage(err?.message || 'Login failed. Please check your credentials.');
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
        <h1>Employee Login</h1>
      </div>

      {message && (
        <div className="alert alert-{message.includes('success') ? 'success' : 'error'}">
          {message}
        </div>
      )}

      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        <div className="field">
          <label htmlFor="employee-email">Official email</label>
          <input
            id="employee-email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@solvix.example"
          />
        </div>

        <div className="field">
          <label htmlFor="employee-password">Password</label>
          <div className="password-input">
            <input
              id="employee-password"
              type={showPassword ? 'text' : 'password'}
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="toggle-password"
            >
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>
        </div>

        <div className="field actions">
          <button type="submit" className="btn primary" disabled={submitting}>
            {submitting ? 'Signing in…' : 'Sign in'}
            <svg width="18" height="18"><use href="#arrow" /></svg>
          </button>
          <a
            href="/register/employee"
            className="btn ghost"
          >
            Request employee access
          </a>
        </div>
      </form>
    </section>
  );
}