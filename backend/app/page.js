export default function RootPage() {
  return (
    <div style={{
      fontFamily: 'system-ui, -apple-system, sans-serif',
      backgroundColor: '#0b1120',
      color: '#f8fafc',
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem',
      textAlign: 'center'
    }}>
      <div style={{
        maxWidth: '540px',
        padding: '2.5rem',
        borderRadius: '16px',
        backgroundColor: '#1e293b',
        border: '1px solid #334155',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
      }}>
        <div style={{
          display: 'inline-block',
          padding: '0.5rem 1rem',
          borderRadius: '9999px',
          backgroundColor: 'rgba(34, 197, 94, 0.1)',
          color: '#4ade80',
          fontSize: '0.875rem',
          fontWeight: '600',
          marginBottom: '1.25rem'
        }}>
          ● SOLVIX Backend API is Running
        </div>
        <h1 style={{ fontSize: '1.75rem', fontWeight: '700', marginBottom: '0.75rem' }}>
          SOLVIX API Server (Port 3001)
        </h1>
        <p style={{ color: '#94a3b8', lineHeight: '1.6', marginBottom: '1.75rem' }}>
          This server provides backend REST endpoints for Solvix. To access the user interface, please open the Vite frontend.
        </p>
        <a
          href="http://localhost:5173"
          style={{
            display: 'inline-block',
            backgroundColor: '#84cc16',
            color: '#0f172a',
            padding: '0.75rem 1.5rem',
            borderRadius: '8px',
            fontWeight: '600',
            textDecoration: 'none',
            fontSize: '1rem',
            transition: 'opacity 0.2s'
          }}
        >
          Open SOLVIX Frontend (localhost:5173) &rarr;
        </a>
      </div>
    </div>
  );
}
