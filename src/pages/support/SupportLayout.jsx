import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import {
  LifeBuoy,
  LayoutDashboard,
  Ticket,
  PlusCircle,
  ShieldCheck,
  FileCheck2,
  LogOut,
  ArrowLeft,
  Sun
} from 'lucide-react';
import './support.css';

export default function SupportLayout({ children, title, subtitle, actions }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login/customer');
    } catch (e) {
      navigate('/login/customer');
    }
  };

  const navItems = [
    { label: 'Support Dashboard', path: '/support/dashboard', icon: LayoutDashboard },
    { label: 'Service Tickets', path: '/support/tickets', icon: Ticket },
    { label: 'New Ticket', path: '/support/tickets/new', icon: PlusCircle },
    { label: 'Warranty Registry', path: '/support/warranties', icon: ShieldCheck },
    { label: 'Warranty Claims', path: '/support/claims', icon: FileCheck2 },
  ];

  const isCustomer = user?.account_type === 'customer';

  return (
    <div className="support-layout">
      {/* Sidebar */}
      <aside className="support-sidebar">
        <div className="support-brand">
          <div className="support-brand-icon">
            <LifeBuoy size={20} />
          </div>
          <span>SOLVIX SUPPORT</span>
        </div>

        <nav className="support-nav">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `support-nav-item ${isActive ? 'active' : ''}`
                }
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}

          <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid #1e293b' }}>
            {isCustomer ? (
              <NavLink to="/customer/dashboard" className="support-nav-item">
                <ArrowLeft size={16} />
                <span>Customer Portal</span>
              </NavLink>
            ) : (
              <NavLink to="/sales/dashboard" className="support-nav-item">
                <Sun size={16} />
                <span>Sales & Operations</span>
              </NavLink>
            )}
          </div>
        </nav>

        <div className="support-sidebar-footer">
          <div className="support-user-info">
            <div className="support-user-avatar">
              {(user?.full_name || user?.email || 'U')[0].toUpperCase()}
            </div>
            <div className="support-user-details">
              <span className="support-user-name">
                {user?.full_name || user?.email || 'User'}
              </span>
              <span className="support-user-role">
                {user?.account_type || 'User'}
              </span>
            </div>
          </div>

          <button className="support-logout-btn" onClick={handleLogout}>
            <LogOut size={16} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Area */}
      <main className="support-main">
        {(title || actions) && (
          <header className="support-header">
            <div className="support-header-title">
              {title && <h1>{title}</h1>}
              {subtitle && <p>{subtitle}</p>}
            </div>
            {actions && <div className="support-header-actions">{actions}</div>}
          </header>
        )}
        <div className="support-content">{children}</div>
      </main>
    </div>
  );
}
