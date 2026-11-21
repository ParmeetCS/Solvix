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
