import { NavLink } from 'react-router-dom';
import { useShell } from '@/hooks/useShell';
import {
  LayoutDashboard,
  Users2,
  CalendarClock,
  MessageSquare,
  UserCheck,
  LogOut,
  Sun,
  Home,
  FileText,
  ShoppingCart,
  Package,
  Compass,
  Boxes,
  LifeBuoy
} from 'lucide-react';
import './crm.css';

export default function SalesLayout({ children, title, subtitle, actions }) {
  const { user, navItems, handleLogout } = useShell();




  return (
    <div className="crm-layout">
      {/* Sidebar */}
      <aside className="crm-sidebar">
        <div className="crm-brand">
          <div className="crm-brand-icon">
            <Sun size={20} />
          </div>
          <span>SOLVIX CRM</span>
        </div>

        <nav className="crm-nav">

          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `crm-nav-item ${isActive ? 'active' : ''}`
                }
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* User Card */}
        <div className="crm-user-card">
          <div className="crm-user-info">
            <div className="crm-user-name">
              {user?.full_name || user?.email || 'Sales Specialist'}
            </div>
            <div className="crm-user-role">
              {user?.role || user?.account_type || 'Sales Team'}
            </div>
          </div>
          <button
            onClick={handleLogout}
            title="Sign Out"
            style={{ color: '#94a3b8', padding: '6px' }}
          >
            <LogOut size={16} />
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
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
