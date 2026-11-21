import { NavLink, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
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
    { label: 'Warehouse Dashboard', path: '/warehouse/dashboard', icon: LayoutDashboard },
    { label: 'Products & Catalog', path: '/warehouse/products', icon: Package },
    { label: 'Stock & Inventory', path: '/warehouse/inventory', icon: Layers },
    { label: 'Purchase Orders', path: '/warehouse/purchase-orders', icon: FileSpreadsheet },
    { label: 'Order Packing', path: '/warehouse/packing', icon: CheckSquare },
    { label: 'Serial & QR Registry', path: '/warehouse/serial-numbers', icon: QrCode },
    { label: 'Dispatches & Delivery', path: '/warehouse/dispatches', icon: Truck },
  ];

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
          <NavLink
            to="/"
            className="warehouse-nav-item"
            style={{ marginBottom: '4px', opacity: 0.8 }}
          >
            <Home size={18} />
            <span>Public Site</span>
          </NavLink>

          <Link
            to="/sales/dashboard"
            className="warehouse-nav-item"
            style={{ marginBottom: '8px', opacity: 0.8 }}
          >
            <Boxes size={18} />
            <span>Sales & CRM</span>
          </Link>

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
              {(user?.email?.[0] || 'W').toUpperCase()}
            </div>
            <div style={{ overflow: 'hidden', flex: 1 }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#f8fafc', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                {user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Warehouse Staff'}
              </div>
              <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                {user?.app_metadata?.role || 'Inventory Specialist'}
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
