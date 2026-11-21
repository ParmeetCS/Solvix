import { useState } from 'react';
import { postJson } from '../api';

/* ─── Design tokens matching the landing page night theme ──────────────── */
const T = {
  bg:       '#0a1224',
  card:     'rgba(16, 27, 51, 0.72)',
  line:     'rgba(255,255,255,0.11)',
  ink:      '#ffffff',
  muted:    '#9fb0c8',
  accent:   '#d8ee8e',
  accentDk: '#6d8f2a',
  input:    'rgba(255,255,255,0.045)',
  inputBd:  'rgba(255,255,255,0.10)',
  focus:    'rgba(216,238,142,0.55)',
  err:      '#f87171',
  errBg:    'rgba(248,113,113,0.10)',
  ok:       '#86efac',
  okBg:     'rgba(134,239,172,0.10)',
};

const DEPARTMENTS = [
  'Sales & CRM',
  'Quotations & Sizing',
  'Inventory & Supply',
  'Field & Installation',
  'Warranty & Service',
  'Finance & Accounting',
  'Executive & Admin',
];

/* ─── Shared input style object ────────────────────────────────────────── */
const inputStyle = {
  width: '100%',
  boxSizing: 'border-box',
  background: T.input,
  border: `1px solid ${T.inputBd}`,
  borderRadius: '10px',
  padding: '11px 14px',
  fontSize: '15px',
  fontFamily: 'inherit',
  color: T.ink,
  outline: 'none',
  transition: 'border-color 0.18s, box-shadow 0.18s',
};

/* ─── Helper: controlled field with focus ring ──────────────────────────── */
function Field({ label, error, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <label style={{ fontSize: '12px', fontWeight: 600, letterSpacing: '0.04em', color: T.muted }}>
        {label}
      </label>
      {children}
      {error && (
        <span style={{ fontSize: '12px', color: T.err }}>{error}</span>
      )}
    </div>
  );
}

/* ─── Password field with show/hide toggle ──────────────────────────────── */
function PasswordInput({ id, value, onChange, placeholder = '••••••••', autoComplete }) {
  const [show, setShow] = useState(false);
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ position: 'relative' }}>
      <input
        id={id}
        type={show ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoComplete={autoComplete}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          ...inputStyle,
          paddingRight: '42px',
          borderColor: focused ? T.accentDk : T.inputBd,
          boxShadow: focused ? `0 0 0 3px rgba(216,238,142,0.14)` : 'none',
        }}
      />
      <button
        type="button"
        onClick={() => setShow(s => !s)}
        aria-label={show ? 'Hide password' : 'Show password'}
        style={{
          position: 'absolute',
          right: '12px',
          top: '50%',
          transform: 'translateY(-50%)',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: T.muted,
          display: 'flex',
          alignItems: 'center',
          padding: 0,
        }}
      >
        {show ? (
          /* eye-off icon */
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
            <line x1="1" y1="1" x2="23" y2="23" />
          </svg>
        ) : (
          /* eye icon */
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        )}
      </button>
    </div>
  );
}

/* ─── FocusInput: a plain text/email/tel input with focus ring ──────────── */
function TextInput({ id, type = 'text', value, onChange, placeholder, autoComplete }) {
  const [focused, setFocused] = useState(false);
  return (
    <input
      id={id}
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      autoComplete={autoComplete}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={{
        ...inputStyle,
        borderColor: focused ? T.accentDk : T.inputBd,
        boxShadow: focused ? `0 0 0 3px rgba(216,238,142,0.14)` : 'none',
      }}
    />
  );
}

/* ─── FocusSelect ───────────────────────────────────────────────────────── */
function FocusSelect({ id, value, onChange, children }) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ position: 'relative' }}>
      <select
        id={id}
        value={value}
        onChange={onChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          ...inputStyle,
          appearance: 'none',
          cursor: 'pointer',
          paddingRight: '36px',
          borderColor: focused ? T.accentDk : T.inputBd,
          boxShadow: focused ? `0 0 0 3px rgba(216,238,142,0.14)` : 'none',
        }}
      >
        {children}
      </select>
      {/* chevron icon */}
      <svg
        width="14" height="14" viewBox="0 0 14 14" fill="none"
        style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: T.muted }}
      >
        <path d="M4.5 6L7 8.5L9.5 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </div>
  );
}

/* ─── MAIN COMPONENT ────────────────────────────────────────────────────── */
export default function SignUp({ navigate, initialRole = 'customer', initialMode = 'signup' }) {
  const [role, setRole]                   = useState(initialRole);
  const [mode, setMode]                   = useState(initialMode); // 'signup' | 'signin'
  const [fullName, setFullName]           = useState('');
  const [email, setEmail]                 = useState('');
  const [phone, setPhone]                 = useState('');
  const [department, setDepartment]       = useState(DEPARTMENTS[0]);
  const [password, setPassword]           = useState('');
  const [confirmPassword, setConfirmPwd]  = useState('');
  const [errors, setErrors]               = useState({});
  const [submitting, setSubmitting]       = useState(false);
  const [message, setMessage]             = useState(null);

  /* ── Validation ────────────────────────────────────────────────────── */
  const validate = () => {
    const e = {};
    if (mode === 'signup' && !fullName.trim()) e.fullName = 'Full name is required.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = 'Enter a valid email address.';
    if (mode === 'signup' && role === 'customer' && phone && !/^[0-9+\-\s]{7,15}$/.test(phone))
      e.phone = 'Enter a valid phone number.';
    if (password.length < 8) e.password = 'Password must be at least 8 characters.';
    if (mode === 'signup' && confirmPassword !== password) e.confirmPassword = 'Passwords do not match.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  /* ── Tab switch resets errors/messages ─────────────────────────────── */
  const switchRole = (r) => { setRole(r); setErrors({}); setMessage(null); };
  const switchMode = () => { setMode(m => m === 'signup' ? 'signin' : 'signup'); setErrors({}); setMessage(null); };

  /* ── Submit ─────────────────────────────────────────────────────────── */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage(null);
    if (!validate()) return;

    setSubmitting(true);
    try {
      let endpoint, payload;
      if (mode === 'signup') {
        endpoint = role === 'customer' ? '/api/auth/register/customer' : '/api/auth/register/employee';
        payload  = role === 'customer'
          ? { full_name: fullName, email, phone, password, confirm_password: confirmPassword, role: 'customer' }
          : { full_name: fullName, email, requested_department: department, password, confirm_password: confirmPassword, role: 'employee' };
      } else {
        endpoint = '/api/auth/login';
        payload  = { email, password };
      }

      const res  = await postJson(endpoint, payload);
      const data = await res.json().catch(() => null);

      if (!res.ok) throw new Error(data?.message || data?.error || (mode === 'signup' ? 'Registration failed.' : 'Login failed.'));

      // Handle sign in
      if (mode === 'signin') {
        const token = data?.token || data?.data?.token || 'session_' + Date.now();
        const user = data?.user || data?.data?.user || { email, full_name: fullName, account_type: role };

        localStorage.setItem('solvix_token', token);
        localStorage.setItem('solvix_user', JSON.stringify(user));
        localStorage.setItem('solvix_role', user.account_type || role);

        setMessage({
          kind: 'ok',
          text: `Signed in successfully. Redirecting to your dashboard...`,
        });

        setTimeout(() => {
          if (user.account_type === 'admin') {
            navigate('/admin/dashboard');
          } else if (user.account_type === 'employee') {
            if (user.department === 'Sales' || user.department_id === 'Sales' || !user.department) {
              navigate('/sales/dashboard');
            } else {
              navigate('/pending-approval');
            }
          } else {
            // Customer Dashboard
            navigate('/customer/dashboard');
          }
        }, 700);
        return;
      }

      // Handle sign up
      if (mode === 'signup') {
        if (role === 'customer') {
          setMessage({
            kind: 'ok',
            text: 'Account created successfully! Please sign in to access your portal.',
          });
          setTimeout(() => {
            setMode('signin');
            setMessage(null);
          }, 1200);
        } else {
          setMessage({
            kind: 'ok',
            text: 'Employee registration submitted! An Administrator will review your account.',
          });
          setTimeout(() => {
            navigate('/pending-approval');
          }, 1500);
        }
      }
    } catch (err) {
      setMessage({ kind: 'error', text: err.message || 'Unable to reach the server. Please try again.' });
    } finally {
      setSubmitting(false);
    }
  };

  /* ── Derived labels ──────────────────────────────────────────────────── */
  const isSignUp = mode === 'signup';
  const submitLabel = submitting
    ? (isSignUp ? 'Submitting…' : 'Signing in…')
    : (isSignUp
        ? (role === 'customer' ? 'Create Customer Account' : 'Request Employee Account')
        : `Sign in as ${role === 'customer' ? 'Customer' : 'Employee'}`);

  const subtitle = role === 'customer'
    ? (isSignUp
        ? 'Sign up to track your solar installation, system metrics, and warranties.'
        : 'Log in to access your project documents and service requests.')
    : (isSignUp
        ? 'Join your operations, inventory, and engineering team.'
        : 'Log in to access your department tools, leads, and installations.');

  /* ── Render ──────────────────────────────────────────────────────────── */
  return (
    <div className="solvix-signup-wrap" style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '100px 20px 60px',
      position: 'relative',
      zIndex: 0,
      background: '#0a1224',
    }}>
      <div style={{ width: '100%', maxWidth: '480px' }}>

        {/* Back link */}
        <a
          href="/"
          onClick={e => { e.preventDefault(); navigate('/'); }}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            fontSize: '13px',
            fontWeight: 500,
            color: T.muted,
            textDecoration: 'none',
            marginBottom: '28px',
            transition: 'color 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.color = T.ink}
          onMouseLeave={e => e.currentTarget.style.color = T.muted}
        >
          <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
            <path d="M8.5 3L4.5 7L8.5 11" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Back to home
        </a>

        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
          <span style={{
            width: '30px', height: '30px', borderRadius: '7px',
            background: T.accent,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="16" height="16" viewBox="0 0 17 17" fill="none">
              <path d="M9.5 2L4 9.5H8.5L7.5 15L13 7.5H8.5L9.5 2Z" fill="#0a1224"/>
            </svg>
          </span>
          <span style={{ fontWeight: 700, fontSize: '14px', letterSpacing: '0.12em', color: T.ink }}>SOLVIX</span>
        </div>

        {/* Heading */}
        <h1 style={{
          fontSize: 'clamp(30px, 6vw, 42px)',
          fontWeight: 500,
          letterSpacing: '-0.03em',
          lineHeight: 1.1,
          color: T.ink,
          margin: '0 0 10px',
        }}>
          {isSignUp ? <>Create your <em style={{ fontStyle: 'italic', color: T.accent }}>Solvix</em> account</> : 'Welcome back to Solvix'}
        </h1>
        <p style={{ fontSize: '14px', color: T.muted, marginBottom: '24px', lineHeight: 1.55 }}>
          {subtitle}
        </p>

        {/* Role tabs */}
        <div
          role="tablist"
          aria-label="Account type"
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            background: 'rgba(255,255,255,0.03)',
            border: `1px solid ${T.line}`,
            borderRadius: '12px',
            padding: '4px',
            gap: '4px',
            marginBottom: '16px',
          }}
        >
          {[
            { value: 'customer', icon: (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                </svg>
              ), label: 'Customer' },
            { value: 'employee', icon: (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
                </svg>
              ), label: 'Employee' },
          ].map(tab => (
            <button
              key={tab.value}
              type="button"
              role="tab"
              aria-selected={role === tab.value}
              onClick={() => switchRole(tab.value)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '7px',
                padding: '10px 16px',
                borderRadius: '9px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 600,
                fontFamily: 'inherit',
                transition: 'all 0.2s',
                ...(role === tab.value
                  ? { background: T.accent, color: '#0a1224', boxShadow: '0 2px 10px rgba(0,0,0,0.3)' }
                  : { background: 'transparent', color: T.muted }),
              }}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Form card */}
        <div style={{
          background: T.card,
          border: `1px solid ${T.line}`,
          borderRadius: '18px',
          padding: '28px',
          backdropFilter: 'blur(18px)',
          WebkitBackdropFilter: 'blur(18px)',
        }}>
          {/* Card header */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingBottom: '16px',
            marginBottom: '20px',
            borderBottom: `1px solid ${T.line}`,
          }}>
            <span style={{ fontSize: '15px', fontWeight: 600, color: T.ink }}>
              {isSignUp
                ? (role === 'customer' ? 'Customer Sign Up' : 'Employee Onboarding')
                : (role === 'customer' ? 'Customer Sign In' : 'Employee Sign In')}
            </span>
            <button
              type="button"
              onClick={switchMode}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '12px',
                fontWeight: 500,
                color: T.accent,
                cursor: 'pointer',
                textDecoration: 'underline',
                textUnderlineOffset: '3px',
                fontFamily: 'inherit',
                padding: 0,
              }}
            >
              {isSignUp ? 'Already have an account? Sign in' : 'New here? Create account'}
            </button>
          </div>

          <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

            {/* Full name — signup only */}
            {isSignUp && (
              <Field label="Full name" error={errors.fullName}>
                <TextInput
                  id="auth-name" value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  placeholder="Jane Doe" autoComplete="name"
                />
              </Field>
            )}

            {/* Email */}
            <Field label={role === 'employee' ? 'Work email address' : 'Email address'} error={errors.email}>
              <TextInput
                id="auth-email" type="email" value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder={role === 'employee' ? 'name@solvix.example' : 'you@example.com'}
                autoComplete="email"
              />
            </Field>

            {/* Phone — customer signup only */}
            {isSignUp && role === 'customer' && (
              <Field label="Phone number (optional)" error={errors.phone}>
                <TextInput
                  id="auth-phone" type="tel" value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="+1 (555) 000-0000" autoComplete="tel"
                />
              </Field>
            )}

            {/* Department — employee signup only */}
            {isSignUp && role === 'employee' && (
              <Field label="Department">
                <FocusSelect
                  id="auth-dept" value={department}
                  onChange={e => setDepartment(e.target.value)}
                >
                  {DEPARTMENTS.map(d => (
                    <option key={d} value={d} style={{ background: '#101b33', color: '#fff' }}>{d}</option>
                  ))}
                </FocusSelect>
              </Field>
            )}

            {/* Password */}
            <Field label="Password" error={errors.password}>
              <PasswordInput
                id="auth-password" value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete={isSignUp ? 'new-password' : 'current-password'}
              />
            </Field>

            {/* Confirm password — signup only */}
            {isSignUp && (
              <Field label="Confirm password" error={errors.confirmPassword}>
                <PasswordInput
                  id="auth-confirm" value={confirmPassword}
                  onChange={e => setConfirmPwd(e.target.value)}
                  autoComplete="new-password"
                />
              </Field>
            )}

            {/* Forgot password link — signin only */}
            {!isSignUp && (
              <div style={{ textAlign: 'right', marginTop: '-6px' }}>
                <a
                  href="#"
                  onClick={e => e.preventDefault()}
                  style={{ fontSize: '12px', color: T.accent, textDecoration: 'none', fontWeight: 500 }}
                >
                  Forgot password?
                </a>
              </div>
            )}

            {/* Server message */}
            {message && (
              <div style={{
                padding: '11px 14px',
                borderRadius: '9px',
                fontSize: '13px',
                fontWeight: 500,
                lineHeight: 1.4,
                background: message.kind === 'ok' ? T.okBg : T.errBg,
                border: `1px solid ${message.kind === 'ok' ? 'rgba(134,239,172,0.3)' : 'rgba(248,113,113,0.3)'}`,
                color: message.kind === 'ok' ? T.ok : T.err,
              }}>
                {message.text}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting}
              style={{
                width: '100%',
                padding: '13px',
                borderRadius: '99px',
                border: 'none',
                background: submitting ? 'rgba(216,238,142,0.6)' : T.accent,
                color: '#0a1224',
                fontSize: '15px',
                fontWeight: 700,
                fontFamily: 'inherit',
                cursor: submitting ? 'not-allowed' : 'pointer',
                letterSpacing: '0.01em',
                transition: 'opacity 0.2s, transform 0.15s',
                marginTop: '4px',
              }}
              onMouseEnter={e => { if (!submitting) e.currentTarget.style.opacity = '0.88'; }}
              onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
              onMouseDown={e  => { if (!submitting) e.currentTarget.style.transform = 'scale(0.98)'; }}
              onMouseUp={e    => { e.currentTarget.style.transform = 'scale(1)'; }}
            >
              {submitting
                ? (isSignUp ? 'Submitting…' : 'Signing in…')
                : submitLabel}
            </button>

            {/* Footer hint */}
            {isSignUp && role === 'employee' && (
              <p style={{ fontSize: '12px', color: T.muted, textAlign: 'center', lineHeight: 1.5 }}>
                Employee registration is verified by Solvix Administrator. Access permissions are provisioned according to your department.
              </p>
            )}
            {isSignUp && role === 'customer' && (
              <p style={{ fontSize: '12px', color: T.muted, textAlign: 'center', lineHeight: 1.5 }}>
                By signing up you agree to Solvix's Terms of Service and Privacy Policy.
              </p>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
