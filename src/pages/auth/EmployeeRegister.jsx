import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '@/services/api';

export default function EmployeeRegister() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [requestedDepartment, setRequestedDepartment] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  [submitting, setSubmitting] = useState(false);
  [message, setMessage] = useState<string | null>(null);
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

    // Validate password confirmation
    if (password !== confirmPassword) {
      setMessage('Passwords do not match');
      setSubmitting(false);
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setMessage('Invalid email format');
      setSubmitting(false);
      return;
    }

    // Validate password length
    if (password.length < 6) {
      setMessage('Password must be at least 6 characters');
      setSubmitting(false);
      return;
    }

    // Validate department selection
    if (!requestedDepartment) {
      setMessage('Please select a requested department');
      setSubmitting(false);
      return;
    }

    try {
      const res = await apiClient.post('/api/auth/register/employee', {
        fullName,
        email,
        phone,
        employeeId,
        requestedDepartment,
        password,
        confirmPassword,
      });

      // Access request submitted - account is pending Admin approval
      setMessage('Employee access request submitted successfully. Account pending Admin approval.');
      setTimeout(() => navigate('/'), 2000);
    } catch (err: any) {
      setMessage(err?.message || 'Failed to submit access request. Please try again.');
      setSubmitting(false);
    }
  };

  const departments = [
    'Administration',
    'Sales & CRM',
    'Site Survey',
    'Warehouse & Inventory',
    'Installation & Technical',
    'Customer Support & Warranty',
    'Accounts & Finance',
    'Subsidy & Documentation',
  ];

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
        <h1>Employee Access Request</h1>
      </div>

      {message && (
        <div className="alert alert-{message.includes('success') ? 'success' : 'error'}">
          {message}
        </div>
      )}

      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        <div className="field">
          <label htmlFor="full-name">Full name</label>
          <input
            id="full-name"
            type="text"
            required
            autoComplete="name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="John Doe"
          />
        </div>

        <div className="field">
          <label htmlFor="email">Email address</label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@solvix.example"
          />
        </div>

        <div className="field">
          <label htmlFor="phone">Phone number</label>
          <input
            id="phone"
            type="tel"
            autoComplete="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+1 (555) 000-0000"
          />
        </div>

        <div className="field">
          <label htmlFor="employee-id">Employee ID (if applicable)</label>
          <input
            id="employee-id"
            type="text"
            autoComplete="employee-id"
            value={employeeId}
            onChange={(e) => setEmployeeId(e.target.value)}
            placeholder="EMP-12345"
          />
        </div>

        <div className="field">
          <label htmlFor="requested-department">Requested department</label>
          <select
            id="requested-department"
            required
            value={requestedDepartment}
            onChange={(e) => setRequestedDepartment(e.target.value)}
          >
            <option value="">Select a department</option>
            {departments.map((dept) => (
              <option key={dept} value={dept}>
                {dept}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            required
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />
        </div>

        <div className="field">
          <label htmlFor="confirm-password">Confirm password</label>
          <input
            id="confirm-password"
            type="password"
            required
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="••••••••"
          />
        </div>

        <div className="field actions">
          <button type="submit" className="btn primary" disabled={submitting}>
            {submitting ? 'Submitting…' : 'Submit request'}
            <svg width="18" height="18"><use href="#arrow" /></svg>
          </button>
          <a
            href="/login/employee"
            className="btn ghost"
          >
            Already have an account?
          </a>
        </div>
      </form>
    </section>
  );
}