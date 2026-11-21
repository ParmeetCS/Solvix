import { NavLink, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
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
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login/employee');
    } catch (e) {
      navigate('/login/employee');
    }
  };

  const navItems = [
    { label: 'Installation Dashboard', path: '/installation/dashboard', icon: LayoutDashboard },
    { label: 'Installation Projects', path: '/installation/jobs', icon: FolderGit2 },
    { label: 'Team Assignments', path: '/installation/assignments', icon: Users },
    { label: 'Installation Schedule', path: '/installation/schedule', icon: Calendar },
    { label: 'Technicians Directory', path: '/installation/technicians', icon: Wrench },
  ];

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
          <NavLink
            to="/"
            className="inst-nav-item"
            style={{ marginBottom: '4px', opacity: 0.8 }}
          >
            <Home size={18} />
            <span>Public Site</span>
          </NavLink>

          <Link
            to="/sales/dashboard"
            className="inst-nav-item"
            style={{ marginBottom: '4px', opacity: 0.8 }}
          >
            <ShoppingCart size={18} />
            <span>Sales & CRM</span>
          </Link>

          <Link
            to="/survey/dashboard"
            className="inst-nav-item"
            style={{ marginBottom: '4px', opacity: 0.8 }}
          >
            <Compass size={18} />
            <span>Site Survey</span>
          </Link>

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

          <div className="inst-nav-divider" />

          {/* Direct link to mobile technician view */}
          <NavLink
            to="/technician/dashboard"
            className={({ isActive }) =>
              `inst-nav-item ${isActive ? 'active' : ''}`
            }
            style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#34d399' }}
          >
            <Smartphone size={18} />
            <span>Field Technician App</span>
          </NavLink>
        </nav>

        {/* User Info & Logout */}
        <div className="inst-sidebar-footer">
          <div className="inst-user-info">
            <div className="inst-user-avatar">
              {(user?.email?.[0] || 'T').toUpperCase()}
            </div>
            <div className="inst-user-details">
              <div className="inst-user-name">
                {user?.user_metadata?.full_name || 'Ops Team'}
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
