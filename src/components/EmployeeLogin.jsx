import { useState } from 'react';
import { postJson } from '../api';

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');

  .solvix-login-root {
    min-height: 100vh;
    background: #0F1623;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 24px 16px;
    font-family: 'Inter', system-ui, sans-serif;
  }

  .solvix-login-card {
    width: 100%;
    max-width: 420px;
  }

  /* ── Back link ── */
  .solvix-back {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    color: #6B7A99;
    font-size: 13px;
    font-weight: 500;
    text-decoration: none;
    letter-spacing: 0.01em;
    margin-bottom: 32px;
    transition: color 0.15s;
  }
  .solvix-back:hover { color: #E8EDF5; }
  .solvix-back svg { flex-shrink: 0; }

  /* ── Brand mark ── */
  .solvix-brand {
    margin-bottom: 28px;
  }
  .solvix-wordmark {
    display: inline-flex;
    align-items: center;
    gap: 10px;
  }
  .solvix-icon {
    width: 32px;
    height: 32px;
    background: #4B9EFF;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .solvix-name {
    font-size: 17px;
    font-weight: 700;
    color: #E8EDF5;
    letter-spacing: 0.08em;
  }

  /* ── Heading ── */
  .solvix-heading {
    font-size: 26px;
    font-weight: 600;
    color: #E8EDF5;
    margin: 0 0 6px;
    letter-spacing: -0.02em;
    line-height: 1.2;
  }
  .solvix-subheading {
    font-size: 14px;
    color: #6B7A99;
    margin: 0 0 32px;
    line-height: 1.5;
    max-width: 340px;
  }

  /* ── Form surface ── */
  .solvix-form-surface {
    background: #1A2438;
    border: 1px solid #263150;
    border-radius: 14px;
    padding: 28px;
  }

  /* ── Fields ── */
  .solvix-field {
    margin-bottom: 18px;
  }
  .solvix-label {
    display: block;
    font-size: 12px;
    font-weight: 600;
    color: #8A98B8;
    letter-spacing: 0.04em;
    margin-bottom: 7px;
  }
  .solvix-input {
    width: 100%;
    box-sizing: border-box;
    background: #0F1623;
    border: 1px solid #263150;
    border-radius: 8px;
    padding: 11px 14px;
    font-size: 15px;
    font-family: inherit;
    color: #E8EDF5;
    outline: none;
    transition: border-color 0.15s, box-shadow 0.15s;
  }
  .solvix-input::placeholder { color: #3A4A6B; }
  .solvix-input:focus {
    border-color: #4B9EFF;
    box-shadow: 0 0 0 3px rgba(75, 158, 255, 0.12);
  }

  /* ── Forgot row ── */
  .solvix-forgot-row {
    display: flex;
    justify-content: flex-end;
    margin-top: -10px;
    margin-bottom: 24px;
  }
  .solvix-forgot {
    font-size: 12px;
    font-weight: 500;
    color: #4B9EFF;
    text-decoration: none;
    transition: color 0.15s;
  }
  .solvix-forgot:hover { color: #7DBDFF; }

  /* ── Primary button ── */
  .solvix-btn-primary {
    width: 100%;
    background: #4B9EFF;
    color: #0F1623;
    border: none;
    border-radius: 8px;
    padding: 12px;
    font-size: 15px;
    font-weight: 600;
    font-family: inherit;
    cursor: pointer;
    letter-spacing: 0.01em;
    transition: background 0.15s, transform 0.1s;
  }
  .solvix-btn-primary:hover:not(:disabled) { background: #6BBAFF; }
  .solvix-btn-primary:active:not(:disabled) { transform: scale(0.99); }
  .solvix-btn-primary:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }

  /* ── Message ── */
  .solvix-message {
    margin-top: 14px;
    padding: 11px 14px;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 500;
    line-height: 1.4;
  }
  .solvix-message.ok {
    background: rgba(52, 211, 153, 0.1);
    border: 1px solid rgba(52, 211, 153, 0.25);
    color: #34D399;
  }
  .solvix-message.error {
    background: rgba(248, 113, 113, 0.1);
    border: 1px solid rgba(248, 113, 113, 0.25);
    color: #F87171;
  }

  /* ── Divider ── */
  .solvix-divider {
    display: flex;
    align-items: center;
    gap: 12px;
    margin: 22px 0;
    color: #3A4A6B;
    font-size: 12px;
    font-weight: 500;
  }
  .solvix-divider::before,
  .solvix-divider::after {
    content: '';
    flex: 1;
    height: 1px;
    background: #263150;
  }

  /* ── Ghost button ── */
  .solvix-btn-ghost {
    display: block;
    width: 100%;
    box-sizing: border-box;
    text-align: center;
    background: transparent;
    color: #E8EDF5;
    border: 1px solid #263150;
    border-radius: 8px;
    padding: 11px;
    font-size: 14px;
    font-weight: 500;
    font-family: inherit;
    text-decoration: none;
    cursor: pointer;
    transition: border-color 0.15s, background 0.15s;
  }
  .solvix-btn-ghost:hover {
    border-color: #4B9EFF;
    background: rgba(75, 158, 255, 0.06);
  }

  /* ── Note text ── */
  .solvix-note {
    margin: 0 0 18px;
    font-size: 13px;
    color: #6B7A99;
    line-height: 1.55;
  }
`;

export default function EmployeeLogin({ navigate }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);
    try {
      const res = await postJson('/api/auth/employee/login', { email, password });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(text || 'Login failed');
      }
      const data = await res.text().catch(() => '');
      setMessage({ kind: 'ok', text: data || 'Signed in successfully.' });
    } catch (err) {
      setMessage({ kind: 'error', text: err.message || 'Unable to reach the server. Please try again later.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <style>{styles}</style>
      <div className="solvix-login-root">
        <div className="solvix-login-card">

          {/* Back link */}
          <a
            href="/"
            className="solvix-back"
            onClick={(e) => { e.preventDefault(); navigate('/'); }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M8.5 3L4.5 7L8.5 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Back to home
          </a>

          {/* Brand mark */}
          <div className="solvix-brand">
            <span className="solvix-wordmark">
              <span className="solvix-icon">
                {/* Lightning bolt icon */}
                <svg width="17" height="17" viewBox="0 0 17 17" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M9.5 2L4 9.5H8.5L7.5 15L13 7.5H8.5L9.5 2Z" fill="#0F1623"/>
                </svg>
              </span>
              <span className="solvix-name">SOLVIX</span>
            </span>
          </div>

          {/* Heading */}
          <h1 className="solvix-heading">Employee portal</h1>
          <p className="solvix-subheading">
            Sign in to access your department tools and assignments.
          </p>

          {/* Form surface */}
          <div className="solvix-form-surface">
            <form onSubmit={handleSubmit} noValidate>

              <div className="solvix-field">
                <label className="solvix-label" htmlFor="employee-email">Work email address</label>
                <input
                  id="employee-email"
                  className="solvix-input"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="name@solvix.example"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="solvix-field">
                <label className="solvix-label" htmlFor="employee-password">Password</label>
                <input
                  id="employee-password"
                  className="solvix-input"
                  type="password"
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              <div className="solvix-forgot-row">
                <a href="#" className="solvix-forgot" onClick={(e) => e.preventDefault()}>
                  Forgot password?
                </a>
              </div>

              <button
                type="submit"
                className="solvix-btn-primary"
                disabled={submitting}
              >
                {submitting ? 'Signing in…' : 'Sign in'}
              </button>

              {message && (
                <p
                  className={`solvix-message ${message.kind}`}
                  role="status"
                  aria-live="polite"
                >
                  {message.text}
                </p>
              )}

              <div className="solvix-divider">Employee onboarding</div>

              <p className="solvix-note">
                New employee accounts are created by invitation only. Your department and access level are assigned by an Administrator&mdash;employees cannot grant themselves department access.
              </p>

              <a
                href="/register/employee"
                className="solvix-btn-ghost"
                onClick={(e) => { e.preventDefault(); navigate('/register/employee'); }}
              >
                Request an employee invitation
              </a>

            </form>
          </div>

        </div>
      </div>
    </>
  );
}
