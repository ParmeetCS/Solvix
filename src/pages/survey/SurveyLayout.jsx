import { NavLink, useNavigate, Link } from 'react-router-dom';
import { useShell } from '@/hooks/useShell';
import {
  Compass,
  LayoutDashboard,
  ClipboardList,
  CalendarCheck2,
  Calendar,
  CheckCheck,
  Home,
  LogOut,
  Layers,
  ShieldCheck
} from 'lucide-react';
import './survey.css';

export default function SurveyLayout({ children, title, subtitle, actions }) {
  const { user, navItems, handleLogout } = useShell();



  return (
    <div className="survey-layout">
      {/* Sidebar */}
      <aside className="survey-sidebar">
        <div className="survey-brand">
          <div className="survey-brand-icon">
            <Compass size={20} />
          </div>
          <span>SOLVIX SURVEY</span>
        </div>

        <nav className="survey-nav">

          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `survey-nav-item ${isActive ? 'active' : ''}`
                }
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* User Card */}
        <div className="survey-user-card">
          <div className="survey-user-info">
            <div className="survey-user-name">
              {user?.full_name || user?.email || 'Survey Engineer'}
            </div>
            <div className="survey-user-role">
              {user?.role || user?.department || 'Survey Department'}
            </div>
          </div>
          <button
            onClick={handleLogout}
            title="Sign Out"
            style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '6px' }}
          >
            <LogOut size={16} />
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="survey-main">
        <header className="survey-header">
          <div className="survey-title-section">
            <h1>{title}</h1>
            {subtitle && <p>{subtitle}</p>}
          </div>
          {actions && <div className="survey-actions">{actions}</div>}
        </header>

        <div className="survey-content">
          {children}
        </div>
      </main>
    </div>
  );
}
