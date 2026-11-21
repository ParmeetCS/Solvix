import { Component } from 'react';

// Without this, any error thrown while rendering unmounts the whole app and
// the user sees a blank page. This keeps the message on screen instead.
export default class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('Page crashed:', error, info?.componentStack);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: 'var(--app-bg)', color: 'var(--text)', padding: 24 }}>
        <div style={{ maxWidth: 520, textAlign: 'center' }}>
          <h2 style={{ margin: '0 0 8px' }}>This page hit a problem</h2>
          <p style={{ color: 'var(--text-muted)', margin: '0 0 6px' }}>Your data is safe. Reload the page, or go back and try again.</p>
          <pre style={{ whiteSpace: 'pre-wrap', fontSize: 12, color: 'var(--text-dim)', margin: '12px 0 16px' }}>{String(error?.message || error)}</pre>
          <button type="button" onClick={() => window.location.reload()} style={{ padding: '9px 18px', borderRadius: 9, border: '1px solid var(--text-dim)', background: 'transparent', color: 'inherit', cursor: 'pointer', fontWeight: 600 }}>Reload</button>
        </div>
      </div>
    );
  }
}
