import { NavLink } from 'react-router-dom';
import { useShell } from '@/hooks/useShell';
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
  const { user, navItems, handleLogout } = useShell();




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
