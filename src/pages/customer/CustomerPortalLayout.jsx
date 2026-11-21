import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { FileText, ShoppingCart, Home, LogOut, Sun } from 'lucide-react';
import '../sales/crm.css';
import '../sales/quotations.css';

export default function CustomerPortalLayout({ children, title, subtitle, actions }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      navigate('/login/customer');
    }
  };

  const navItems = [
    { label: 'My Quotations', path: '/customer/quotations', icon: FileText },
    { label: 'My Orders', path: '/customer/orders', icon: ShoppingCart },
  ];

  return (
    <div className="crm-layout">
      <aside className="crm-sidebar">
        <div className="crm-brand">
          <div className="crm-brand-icon">
            <Sun size={20} />
          </div>
          <span>SOLVIX</span>
        </div>

        <nav className="crm-nav">
          <NavLink to="/" className="crm-nav-item" style={{ marginBottom: 8, opacity: 0.8 }}>
            <Home size={18} />
            <span>Public Site</span>
          </NavLink>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) => `crm-nav-item ${isActive ? 'active' : ''}`}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="crm-user-card">
          <div className="crm-user-info">
            <div className="crm-user-name">{user?.full_name || user?.email || 'Customer'}</div>
            <div className="crm-user-role">Customer Portal</div>
          </div>
          <button onClick={handleLogout} title="Sign Out" style={{ color: '#94a3b8', padding: 6 }}>
            <LogOut size={16} />
          </button>
        </div>
      </aside>

      <main className="crm-main">
        <header className="crm-header">
          <div className="crm-title-section">
            <h1>{title}</h1>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <div className="crm-header-actions">{actions}</div>
        </header>
        <div className="crm-body">{children}</div>
      </main>
    </div>
  );
}
