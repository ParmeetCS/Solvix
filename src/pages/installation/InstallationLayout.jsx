import { NavLink, useNavigate, Link } from 'react-router-dom';
import { useShell } from '@/hooks/useShell';
import {
  Wrench,
  LayoutDashboard,
  ClipboardCheck,
  Users,
  Calendar,
  Smartphone,
  Home,
  LogOut,
  FolderGit2,
  Compass,
  ShoppingCart
} from 'lucide-react';
import './installation.css';

export default function InstallationLayout({ children, title, subtitle, actions }) {
  const { user, navItems, handleLogout } = useShell();



  return (
    <div className="inst-layout">
      {/* Sidebar */}
      <aside className="inst-sidebar">
        <div className="inst-brand">
          <div className="inst-brand-icon">
            <Wrench size={20} />
          </div>
          <span>SOLVIX INSTALL</span>
        </div>

        <nav className="inst-nav">


          <div className="inst-nav-divider" />

          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `inst-nav-item ${isActive ? 'active' : ''}`
                }
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* User Info & Logout */}
        <div className="inst-sidebar-footer">
          <div className="inst-user-info">
            <div className="inst-user-avatar">
              {((user?.full_name || user?.email || 'T')[0]).toUpperCase()}
            </div>
            <div className="inst-user-details">
              <div className="inst-user-name">
                {user?.full_name || 'Ops Team'}
              </div>
              <div className="inst-user-role">Technical Operations</div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="inst-logout-btn"
            title="Sign Out"
          >
            <LogOut size={18} />
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="inst-main">
        <header className="inst-header">
          <div className="inst-header-title">
            <h1>{title || 'Installation & Technical Operations'}</h1>
            {subtitle && <p>{subtitle}</p>}
          </div>
          {actions && <div className="inst-header-actions">{actions}</div>}
        </header>

        <main className="inst-content">{children}</main>
      </div>
    </div>
  );
}
