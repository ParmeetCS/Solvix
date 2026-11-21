import { NavLink } from 'react-router-dom';
import { LogOut, Sun } from 'lucide-react';
import { useShell } from '@/hooks/useShell';
import { PORTAL_TITLE } from '@/config/navigation';
import '@/pages/sales/crm.css';
import '@/pages/sales/quotations.css';

/** Generic role-aware dashboard layout (sidebar from the user's portal navigation). */
export default function PortalLayout({ children, title, subtitle, actions }) {
  const { user, navItems, handleLogout } = useShell();

  return (
    <div className="crm-layout">
      <aside className="crm-sidebar">
        <div className="crm-brand">
          <div className="crm-brand-icon"><Sun size={20} /></div>
          <span>SOLVIX</span>
        </div>
        <nav className="crm-nav">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink key={item.path} to={item.path} className={({ isActive }) => `crm-nav-item ${isActive ? 'active' : ''}`}>
                <Icon size={18} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
        <div className="crm-user-card">
          <div className="crm-user-info">
            <div className="crm-user-name">{user?.full_name || user?.email}</div>
            <div className="crm-user-role">{PORTAL_TITLE[user?.portal] || 'User'}</div>
          </div>
          <button onClick={handleLogout} title="Sign out" style={{ color: '#94a3b8', padding: 6 }}>
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
