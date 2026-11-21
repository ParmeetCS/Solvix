import { useState } from 'react';
import { postJson } from '../api';

/* ─── Design tokens matching the landing page night theme ──────────────── */
const T = {
  bg:       '#000000',
  card:     'rgba(5, 10, 25, 0.80)',
  line:     'rgba(255,255,255,0.11)',
  ink:      '#ffffff',
  muted:    '#9fb0c8',
  accent:   '#60a5fa',
  accentDk: '#1d4ed8',
  input:    'rgba(255,255,255,0.045)',
  inputBd:  'rgba(255,255,255,0.10)',
  focus:    'rgba(96,165,250,0.55)',
  err:      '#f87171',
  errBg:    'rgba(248,113,113,0.10)',
  ok:       'var(--c-green-soft)',
  okBg:     'rgba(134,239,172,0.10)',
};

// Same names as the departments in the database, so an administrator can approve
// the request without translating it. "portal" tells the employee where they will sign in.
const DEPARTMENTS = [
  'Sales & CRM',
  'Site Survey & Engineering',
  'Installation & Technical Operations',
  'Warehouse & Logistics',
  'Support & Warranty',
  'Accounts & Finance',
  'Subsidy & Documentation',
];
const DEPARTMENT_PORTAL = {
  'Sales & CRM': 'the Sales portal',
  'Site Survey & Engineering': 'the Technician portal',
  'Installation & Technical Operations': 'the Technician portal',
  'Warehouse & Logistics': 'the Operations portal',
  'Support & Warranty': 'the Operations portal',
  'Accounts & Finance': 'the Operations portal',
  'Subsidy & Documentation': 'the Operations portal',
};

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
          boxShadow: focused ? `0 0 0 3px rgba(96,165,250,0.14)` : 'none',
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
        boxShadow: focused ? `0 0 0 3px rgba(96,165,250,0.14)` : 'none',
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
          boxShadow: focused ? `0 0 0 3px rgba(96,165,250,0.14)` : 'none',
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
  const [submitted, setSubmitted]         = useState(false);

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
  const switchMode = () => navigate(role === 'customer' ? '/login/customer' : '/login/employee');

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
        return;
      }

      const res  = await postJson(endpoint, payload);
      const data = await res.json().catch(() => null);

      if (!res.ok) throw new Error(data?.message || data?.error || (mode === 'signup' ? 'Registration failed.' : 'Login failed.'));

      // Handle sign up
      if (mode === 'signup') {
        if (role === 'customer') {
          setMessage({
            kind: 'ok',
            text: 'Account created successfully! Please sign in to access your portal.',
          });
          setTimeout(() => navigate('/login/customer', { replace: true }), 1200);
        } else {
          setSubmitted(true);
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
      background: '#000000',
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
              <path d="M9.5 2L4 9.5H8.5L7.5 15L13 7.5H8.5L9.5 2Z" fill="#ffffff"/>
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
            background: 'rgba(var(--ink-rgb), 0.03)',
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
                  ? { background: T.accent, color: '#ffffff', boxShadow: '0 2px 10px rgba(0,0,0,0.3)' }
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
                ? (role === 'customer' ? 'Customer Sign Up' : 'Request employee access')
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
              {isSignUp ? (role === 'employee' ? 'Already approved? Sign in' : 'Already have an account? Sign in') : 'New here? Create account'}
            </button>
          </div>

          {submitted && role === 'employee' ? (
            <div style={{ textAlign: 'center', padding: '8px 0 4px' }}>
              <div style={{ fontSize: '40px', lineHeight: 1, marginBottom: '12px' }} aria-hidden="true">&#10003;</div>
              <h2 style={{ fontSize: '20px', fontWeight: 600, color: T.ink, margin: '0 0 8px' }}>Request sent</h2>
              <p style={{ fontSize: '14px', color: T.muted, lineHeight: 1.6, margin: '0 0 6px' }}>
                An administrator will review your request and assign your department.
              </p>
              <p style={{ fontSize: '14px', color: T.muted, lineHeight: 1.6, margin: '0 0 20px' }}>
                Once approved, sign in with the email and password you just chose.
              </p>
              <button
                type="button"
                onClick={() => navigate('/login/employee', { replace: true })}
                style={{
                  width: '100%', padding: '13px 16px', borderRadius: '10px', border: 'none', cursor: 'pointer',
                  background: T.accent, color: 'var(--on-fill)', fontWeight: 700, fontSize: '15px', fontFamily: 'inherit',
                }}
              >
                Go to employee sign in
              </button>
            </div>
          ) : (
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
                  placeholder="+91 98765 43210" autoComplete="tel"
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
                    <option key={d} value={d} style={{ background: '#000000', color: '#fff' }}>{d}</option>
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
                color: '#ffffff',
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
                An administrator reviews every request and assigns your department. You can sign in as soon as it is approved.
              </p>
            )}
            {isSignUp && role === 'customer' && (
              <p style={{ fontSize: '12px', color: T.muted, textAlign: 'center', lineHeight: 1.5 }}>
                By signing up you agree to Solvix's Terms of Service and Privacy Policy.
              </p>
            )}
          </form>
          )}
        </div>
      </div>
    </div>
  );
}
