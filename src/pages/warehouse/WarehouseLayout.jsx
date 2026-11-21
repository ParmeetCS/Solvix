import { NavLink, useNavigate, Link } from 'react-router-dom';
import { useShell } from '@/hooks/useShell';
import {
  Boxes,
  LayoutDashboard,
  Package,
  Layers,
  FileSpreadsheet,
  CheckSquare,
  QrCode,
  Truck,
  Home,
  LogOut,
  Warehouse
} from 'lucide-react';
import './warehouse.css';

export default function WarehouseLayout({ children, title, subtitle, actions }) {
  const { user, navItems, handleLogout } = useShell();



  return (
    <div className="warehouse-layout">
      {/* Sidebar */}
      <aside className="warehouse-sidebar">
        <div className="warehouse-brand">
          <div className="warehouse-brand-icon">
            <Warehouse size={20} />
          </div>
          <span>SOLVIX WAREHOUSE</span>
        </div>

        <nav className="warehouse-nav">

          <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)', margin: '6px 0' }} />

          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `warehouse-nav-item ${isActive ? 'active' : ''}`
                }
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="warehouse-sidebar-footer">
          <div className="warehouse-user-card">
            <div className="warehouse-avatar">
              {((user?.full_name || user?.email || 'W')[0]).toUpperCase()}
            </div>
            <div style={{ overflow: 'hidden', flex: 1 }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#f8fafc', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                {user?.full_name || user?.email?.split('@')[0] || 'Warehouse Staff'}
              </div>
              <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                {user?.department || 'Inventory Specialist'}
              </div>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="warehouse-nav-item"
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', width: '100%' }}
          >
            <LogOut size={16} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Container */}
      <main className="warehouse-main">
        <header className="warehouse-header">
          <div className="warehouse-header-title">
            <h1>{title || 'Warehouse Management'}</h1>
            {subtitle && <p>{subtitle}</p>}
          </div>
          {actions && <div className="warehouse-header-actions">{actions}</div>}
        </header>

        <div className="warehouse-content">
          {children}
        </div>
      </main>
    </div>
  );
}
