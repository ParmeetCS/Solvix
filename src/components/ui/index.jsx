import React from 'react';

export function Card({ children, className = '', style = {}, ...props }) {
  return (
    <div className={`solvix-card ${className}`} style={{ borderRadius: '12px', background: '#1e293b', border: '1px solid #334155', padding: '1.25rem', ...style }} {...props}>
      {children}
    </div>
  );
}

export function Alert({ children, type = 'info', className = '', ...props }) {
  const bg = type === 'error' ? 'rgba(239, 68, 68, 0.15)' : type === 'success' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(59, 130, 246, 0.15)';
  const color = type === 'error' ? '#f87171' : type === 'success' ? '#4ade80' : '#60a5fa';
  return (
    <div className={`solvix-alert ${className}`} style={{ padding: '0.75rem 1rem', borderRadius: '8px', background: bg, color: color, marginBottom: '1rem' }} {...props}>
      {children}
    </div>
  );
}

export * from './button';
export * from './input';
export * from './label';
export * from './select';
export * from './tabs';

// ---- Table -----------------------------------------------------------------
export function Table({ children, style = {}, ...props }) {
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', ...style }} {...props}>
      {children}
    </table>
  );
}
Table.TableHead = ({ children, ...props }) => <thead {...props}>{children}</thead>;
Table.TableBody = ({ children, ...props }) => <tbody {...props}>{children}</tbody>;
Table.Row = ({ children, ...props }) => (
  <tr style={{ borderBottom: '1px solid rgba(148,163,184,0.25)' }} {...props}>{children}</tr>
);
Table.Head = ({ children, ...props }) => (
  <th style={{ textAlign: 'left', padding: '0.6rem 0.75rem', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em', opacity: 0.75 }} {...props}>{children}</th>
);
Table.Cell = ({ children, ...props }) => (
  <td style={{ padding: '0.6rem 0.75rem', fontSize: '0.875rem', verticalAlign: 'top' }} {...props}>{children}</td>
);

// ---- Badge -----------------------------------------------------------------
const BADGE_COLORS = {
  success: ['#14532d', '#bbf7d0'],
  error: ['#7f1d1d', '#fecaca'],
  critical: ['#7f1d1d', '#fecaca'],
  warning: ['#78350f', '#fde68a'],
  info: ['#1e3a8a', '#bfdbfe'],
  default: ['#334155', '#e2e8f0'],
};
export function Badge({ children, status = 'default', style = {}, ...props }) {
  const [bg, fg] = BADGE_COLORS[status] || BADGE_COLORS.default;
  return (
    <span style={{ display: 'inline-block', padding: '0.15rem 0.55rem', borderRadius: 999, fontSize: '0.72rem', fontWeight: 600, background: bg, color: fg, ...style }} {...props}>
      {children}
    </span>
  );
}

// ---- Overlays and misc (kept minimal; some pages import them) ----------------
export function Notification({ children, type = 'info', onClose }) {
  if (!children) return null;
  return (
    <Alert type={type}>
      {children}
      {onClose && <button onClick={onClose} style={{ marginLeft: 12, background: 'none', border: 0, color: 'inherit', cursor: 'pointer' }}>×</button>}
    </Alert>
  );
}
export function Dialog({ open = true, children }) {
  return open ? <div role="dialog">{children}</div> : null;
}
export function DialogAction({ children, ...props }) {
  return <button {...props}>{children}</button>;
}
export function Drawer({ open = true, children }) {
  return open ? <aside>{children}</aside> : null;
}
export function Icon({ children }) {
  return <span aria-hidden="true">{children}</span>;
}
