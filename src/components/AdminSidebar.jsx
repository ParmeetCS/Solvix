import { NavLink } from 'react-router-dom';
import { Sun } from 'lucide-react';
import { getNavItems } from '@/config/navigation';
import { useAuth } from '@/context/auth';

// Fixed 240px sidebar. Pages that render it offset their content by 240px.
const AdminSidebar = () => {
  const { user } = useAuth();
  const items = getNavItems({ portal: 'admin', modules: user?.modules });

  return (
    <aside
      className="sidebar"
      style={{
        width: 240,
        background: 'var(--solvix-navy, #1a237e)',
        height: '100vh',
        color: 'white',
        position: 'fixed',
        left: 0,
        top: 0,
        bottom: 0,
        display: 'flex',
        flexDirection: 'column',
        zIndex: 1000,
      }}
    >
      <div
        style={{
          padding: '1rem 1.5rem',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          height: 64,
          boxSizing: 'border-box',
        }}
      >
        <Sun size={22} color="#f57f17" />
        <span style={{ fontWeight: 700, letterSpacing: '0.08em', color: '#f57f17' }}>SOLVIX</span>
        <span style={{ fontSize: 11, opacity: 0.6, marginLeft: 'auto' }}>Admin</span>
      </div>

      <nav style={{ flex: 1, overflowY: 'auto', padding: '0.75rem 0.75rem' }}>
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '0.65rem 0.85rem',
                margin: '2px 0',
                color: 'white',
                textDecoration: 'none',
                borderRadius: 8,
                fontSize: '0.875rem',
                background: isActive ? 'rgba(245, 127, 23, 0.18)' : 'transparent',
                borderLeft: isActive ? '3px solid #f57f17' : '3px solid transparent',
              })}
            >
              <Icon size={18} style={{ flexShrink: 0 }} />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
};

export default AdminSidebar;
