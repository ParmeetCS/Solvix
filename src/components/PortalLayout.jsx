import { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { LogOut, Menu, Sun, X } from 'lucide-react';
import { useShell } from '@/hooks/useShell';
import { PORTAL_TITLE } from '@/config/navigation';
import { ThemeToggle } from '@/theme/theme';

// One layout for every signed-in screen (admin, sales, survey, installation,
// warehouse, support, finance, subsidy, customer). Module stylesheets only style
// the page content, so they are loaded here once.
import '@/pages/sales/crm.css';
import '@/pages/sales/quotations.css';
import '@/pages/survey/survey.css';
import '@/pages/installation/installation.css';
import '@/pages/warehouse/warehouse.css';
import '@/pages/support/support.css';
import './portal-layout.css';
import '@/theme/dashboard-ui.css';

export default function PortalLayout({ children, title, subtitle, actions }) {
  const { user, navItems, handleLogout } = useShell();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  // Browser tab title: "Quotations · SOLVIX"
  useEffect(() => {
    if (title) document.title = `${title} · SOLVIX`;
  }, [title]);

  // Close the mobile menu after navigating.
  useEffect(() => setOpen(false), [location.pathname]);

  let lastGroup = null;

  return (
    <div className="crm-layout">
      <aside className={`crm-sidebar ${open ? 'is-open' : ''}`}>
        <div className="crm-brand">
          <div className="crm-brand-icon"><Sun size={20} /></div>
          <span>SOLVIX</span>
          <button className="crm-menu-close" onClick={() => setOpen(false)} aria-label="Close menu"><X size={18} /></button>
        </div>

        <nav className="crm-nav" aria-label="Main">
          {navItems.map((item) => {
            const Icon = item.icon;
            const showGroup = item.group && item.group !== lastGroup;
            lastGroup = item.group || lastGroup;
            return (
              <div key={item.path} className="crm-nav-entry">
                {showGroup && <div className="crm-nav-group">{item.group}</div>}
                <NavLink to={item.path} className={({ isActive }) => `crm-nav-item ${isActive ? 'active' : ''}`}>
                  <Icon size={18} />
                  <span>{item.label}</span>
                </NavLink>
              </div>
            );
          })}
        </nav>

        <div className="crm-user-card">
          <div className="crm-user-info">
            <div className="crm-user-name">{user?.full_name || user?.email}</div>
            <div className="crm-user-role">{PORTAL_TITLE[user?.portal] || 'User'}</div>
          </div>
          <button onClick={handleLogout} title="Sign out" aria-label="Sign out" className="crm-signout">
            <LogOut size={16} />
          </button>
        </div>
      </aside>
      {open && <div className="crm-backdrop" onClick={() => setOpen(false)} />}

      <main className="crm-main">
        <header className="crm-header">
          <button className="crm-menu-btn" onClick={() => setOpen(true)} aria-label="Open menu"><Menu size={20} /></button>
          <div className="crm-title-section">
            <h1>{title}</h1>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <div className="crm-header-actions">{actions}<ThemeToggle /></div>
        </header>
        <div className="crm-body">{children}</div>
      </main>
    </div>
  );
}
