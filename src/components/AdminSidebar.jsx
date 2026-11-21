import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, Folder, Users, Settings, Logout, Bell, ChartPie, Users as Users2, Folder as Folder2, Mail, Shield, LogOut } from 'lucide-react';

const AdminSidebar = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const path = location.pathname;

  const navItems = [
    { key: 'dashboard', label: 'Dashboard', icon: Layout, href: '/admin/dashboard' },
    { key: 'employees', label: 'Employee Management', icon: Users, href: '/admin/employees' },
    { key: 'departments', label: 'Department Management', icon: Folder, href: '/admin/departments' },
    { key: 'customers', label: 'Customer Management', icon: Users2, href: '/admin/customers' },
    { key: 'leads', label: 'Lead Overview', icon: Mail, href: '/admin/leads' },
    { key: 'projects', label: 'Project Management', icon: Folder2, href: '/admin/projects' },
    { key: 'inventory', label: 'Inventory Overview', icon: Box, href: '/admin/inventory' },
    { key: 'finance', label: 'Finance Overview', icon: Coin, href: '/admin/finance' },
    { key: 'reports', label: 'Reports & Analytics', icon: BarChart, href: '/admin/reports' },
    { key: 'activity-logs', label: 'Activity Logs', icon: Shield, href: '/admin/activity-logs' },
    { key: 'notifications', label: 'Notifications', icon: Bell, href: '/admin/notifications' },
    { key: 'settings', label: 'Settings', icon: Settings, href: '/admin/settings' },
  ];

  const isActive = (key) => {
    const exactMatch = `/admin/${key}` === path;
    const prefixMatch = path.startsWith(`/admin/${key}/`);
    return exactMatch || prefixMatch;
  };

  return (
    <aside
      className="sidebar"
      style={{
        width: collapsed ? '80px' : '240px',
        transition: 'width 0.3s ease',
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
      <div className="sidebar-brand" style={{
        padding: '1rem 1.5rem',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <svg width="32" height="32" viewBox="0 0 40 40" style={{ marginRight: '0.5rem' }}>
          <use href="#sun" width="32" height="32" />
        </svg>
        <span style={{ fontWeight: 'bold', color: 'var(--solvix-accent, #f57f17)'' }}>SOLVIX</span>
      </div>

      <nav className="sidebar-nav" style={{
        flex: 1,
        overflowY: 'auto',
        padding: '1rem 0',
      }}>
        {navItems.map((item) => (
          <div
            key={item.key}
            style={{
              margin: '0.25rem 1rem',
              borderRadius: '8px',
            }}
            onmouseenter={() => setCollapsed(false)}
          >
            <Link
              to={item.href}
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '0.75rem 1rem',
                color: 'white',
                textDecoration: 'none',
                borderRadius: '8px',
                margin: '0.125rem 1rem',
                transition: 'background 0.2s',
                width: '100%',
              }
            }
            style={{ background: isActive(item.key) ? 'rgba(245, 127, 23, 0.15)' : 'transparent' }}
            aria-current={isActive(item.key) ? 'page' : 'false'}
            >
              <svg
                width="20"
                height="20"
                style={{ marginRight: '0.75rem', flexShrink: 0, opacity: collapsed ? 0 : 1 }}
                style={{ width: collapsed ? 0 : 20, height: collapsed ? 0 : 20 }}
              >
                {item.icon && <item.icon />}

                {/* Fallback for collapsed mode */}
                {collapsed && item.icon && (
                  <span
                    style={{
                      width: 20,
                      height: 20,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.875rem',
                    }}
                  >
                    {item.icon && item.icon.startsWith('<') ? item.icon : ''}
                  </span>
                )}
              </Link>
              <span
                style={{
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  color: 'white',
                  fontSize: '0.875rem',
                  marginLeft: collapsed ? -1rem : 0.5,
                  display: 'block',
                  width: collapsed ? '80px' : 'auto',
                }}
              >
                {collapsed ? '' : item.label}
              </span>
            </Link>
          </div>
        ))}
      </nav>

      <div className="sidebar-footer" style={{
        padding: '1rem 1.5rem',
        borderTop: '1px solid rgba(255,255,255,0.1)',
        marginTop: 'auto',
        display: 'flex',
        flexDirection: 'column',
      }}>
        <button
          onClick={() => setMobileOpen(true)}
          style={{
            background: 'none',
            border: 'none',
            color: 'rgba(255,255,255,0.5)',
            padding: '0.5rem',
            cursor: 'pointer',
            alignSelf: 'flex-end',
            fontSize: '1.2rem',
          }}
          aria-label="Toggle sidebar"
        >
          {collapsed ? '⦿' : '☰'}
        </button>
        <div
          style={{
            marginTop: '0.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
          }}
        >
          <span
            style={{
              marginRight: '1rem',
              fontSize: '0.75rem',
              color: 'rgba(255,255,255,0.5)',
            }}
          >
            Admin
          </span>
          <svg
            width="20"
            height="20"
            style={{ marginLeft: '0.5rem', color: 'rgba(255,255,255,0.5)' }}
            aria-hidden="true"
          >
            <use href="#log-out" width="20" height="20" />
          </svg>
        </div>
      </div>
    </aside>
  );
};

export default AdminSidebar;