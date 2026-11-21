import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, LogIn, ShieldCheck, Sun, Wrench, UserRound, Briefcase, Boxes } from 'lucide-react';
import { useAuth } from '@/context/auth';
import { homeFor, LOGIN_PATHS } from '@/lib/session';
import './auth.css';

export const PORTAL_CONFIG = {
  admin: {
    title: 'Administrator sign in',
    subtitle: 'Company-wide control: people, departments, finance and reports.',
    icon: ShieldCheck,
    button: 'Sign in as Administrator',
    note: 'Administrator accounts are created by the company owner and cannot be self-registered.',
  },
  sales: {
    title: 'Sales team sign in',
    subtitle: 'Leads, follow-ups, site surveys and quotations.',
    icon: Briefcase,
    button: 'Sign in to Sales',
    register: { to: '/register/employee', label: 'Request employee access' },
  },
  technician: {
    title: 'Technician sign in',
    subtitle: 'Your assignments, site surveys, equipment scanning and installation reports.',
    icon: Wrench,
    button: 'Sign in as Technician',
    register: { to: '/register/employee', label: 'Request employee access' },
  },
  staff: {
    title: 'Operations staff sign in',
    subtitle: 'Warehouse, support & warranty, accounts and subsidy documentation.',
    icon: Boxes,
    button: 'Sign in to Operations',
    register: { to: '/register/employee', label: 'Request employee access' },
  },
  customer: {
    title: 'Customer sign in',
    subtitle: 'Track your orders, installation progress, warranty and service requests.',
    icon: UserRound,
    button: 'Sign in',
    register: { to: '/signup', label: 'Create a customer account' },
  },
};

const OTHER_PORTALS = [
  ['customer', 'Customer'],
  ['sales', 'Sales'],
  ['technician', 'Technician'],
  ['staff', 'Operations'],
  ['admin', 'Administrator'],
];

export default function RoleLogin({ portal }) {
  const cfg = PORTAL_CONFIG[portal];
  const Icon = cfg.icon;
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setError('Enter a valid email address.');
    if (!password) return setError('Enter your password.');
    setBusy(true);
    try {
      const user = await login(portal, email, password);
      // replace: the sign-in page must not stay in the Back history.
      const wanted = location.state?.from;
      const canResume = wanted && user.approved && !wanted.startsWith('/login');
      navigate(canResume ? wanted : homeFor(user), { replace: true });
    } catch (err) {
      setError(err.message || 'Sign-in failed.');
      setBusy(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <Link to="/" className="auth-back">&larr; Back to home</Link>

        <div className="auth-brand">
          <span className="auth-brand-mark"><Sun size={20} /></span>
          <span>SOLVIX</span>
        </div>

        <div className="auth-heading">
          <span className="auth-icon"><Icon size={20} /></span>
          <div>
            <h1>{cfg.title}</h1>
            <p>{cfg.subtitle}</p>
          </div>
        </div>

        <form onSubmit={onSubmit} noValidate>
          <label className="auth-label" htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            autoComplete="username"
            className="auth-input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
            disabled={busy}
          />

          <label className="auth-label" htmlFor="password">Password</label>
          <div className="auth-password">
            <input
              id="password"
              type={show ? 'text' : 'password'}
              autoComplete="current-password"
              className="auth-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={busy}
            />
            <button type="button" className="auth-eye" onClick={() => setShow((s) => !s)} aria-label={show ? 'Hide password' : 'Show password'}>
              {show ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          {error && <div className="auth-error" role="alert">{error}</div>}

          <button type="submit" className="auth-submit" disabled={busy}>
            <LogIn size={16} />
            {busy ? 'Signing in…' : cfg.button}
          </button>
        </form>

        {cfg.register && (
          <p className="auth-foot">
            New here? <Link to={cfg.register.to}>{cfg.register.label}</Link>
          </p>
        )}
        {cfg.note && <p className="auth-note">{cfg.note}</p>}

        <div className="auth-switch">
          <span>Sign in as</span>
          {OTHER_PORTALS.filter(([p]) => p !== portal).map(([p, label]) => (
            <Link key={p} to={LOGIN_PATHS[p]} replace>{label}</Link>
          ))}
        </div>
      </div>
    </div>
  );
}

/** /login/employee - pick the right staff portal. */
export function EmployeePortalChooser() {
  const options = [
    ['sales', 'Sales team', 'Leads, quotations and orders'],
    ['technician', 'Technicians', 'Assignments, surveys and installations'],
    ['staff', 'Operations', 'Warehouse, support, accounts, subsidy'],
  ];
  return (
    <div className="auth-page">
      <div className="auth-card">
        <Link to="/" className="auth-back">&larr; Back to home</Link>
        <div className="auth-brand">
          <span className="auth-brand-mark"><Sun size={20} /></span>
          <span>SOLVIX</span>
        </div>
        <div className="auth-heading">
          <div>
            <h1>Employee sign in</h1>
            <p>Choose the portal for your department.</p>
          </div>
        </div>
        <div className="auth-choices">
          {options.map(([p, name, desc]) => (
            <Link key={p} to={LOGIN_PATHS[p]} className="auth-choice">
              <strong>{name}</strong>
              <span>{desc}</span>
            </Link>
          ))}
        </div>
        <p className="auth-foot">
          Administrator? <Link to={LOGIN_PATHS.admin}>Sign in here</Link>
        </p>
      </div>
    </div>
  );
}
