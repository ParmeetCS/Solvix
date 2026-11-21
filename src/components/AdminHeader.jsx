import { Link } from 'react-router-dom';
import { Bell, LogOut } from 'lucide-react';
import { useShell } from '@/hooks/useShell';

// Fixed 64px header to the right of the 240px AdminSidebar.
const AdminHeader = () => {
  const { user, handleLogout } = useShell();

  return (
    <header
      style={{
        padding: '0 1.5rem',
        background: 'var(--solvix-navy, #1a237e)',
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: 64,
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        position: 'fixed',
        top: 0,
        left: 240,
        right: 0,
        zIndex: 999,
      }}
    >
      <strong style={{ fontSize: '0.95rem', letterSpacing: '0.04em' }}>Administrator Console</strong>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
        <Link to="/admin/notifications" style={{ color: 'white', display: 'flex' }} aria-label="Notifications">
          <Bell size={20} />
        </Link>
        <div style={{ textAlign: 'right', lineHeight: 1.2 }}>
          <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{user?.full_name || user?.email}</div>
          <div style={{ fontSize: '0.7rem', opacity: 0.7 }}>{user?.email}</div>
        </div>
        <button
          onClick={handleLogout}
          style={{
            display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.12)',
            border: 0, color: 'white', padding: '0.45rem 0.8rem', borderRadius: 8, cursor: 'pointer',
          }}
        >
          <LogOut size={16} /> Sign out
        </button>
      </div>
    </header>
  );
};

export default AdminHeader;
