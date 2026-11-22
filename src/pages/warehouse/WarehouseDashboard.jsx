import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import PortalLayout from '@/components/PortalLayout';
import { ChartCard, StripedBars, TickDonut, AreaLine } from '@/components/charts';
import { warehouseApi } from '@/services/api/warehouse';
import {
  Package,
  Layers,
  AlertTriangle,
  XCircle,
  Clock,
  Truck,
  QrCode,
  ArrowUpRight,
  ArrowDownLeft,
  RefreshCw,
  Plus,
  Warehouse,
  ExternalLink,
  ShieldCheck
} from 'lucide-react';

export default function WarehouseDashboard() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await warehouseApi.getDashboard();
      if (res && res.success) {
        setData(res.data);
      } else {
        setError(res?.error || 'Failed to load warehouse metrics');
      }
    } catch (err) {
      console.error('Error loading dashboard:', err);
      setError(err.message || 'Network error loading metrics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  // Accept snake_case or camelCase figures and never leave one undefined.
  const k = data?.kpis || {};
  const pick = (snake, camel) => Number(k[snake] ?? k[camel] ?? 0) || 0;
  const stats = {
    total_products: pick('total_products', 'totalProducts'),
    total_stock_quantity: pick('total_stock_quantity', 'totalStockQuantity'),
    low_stock_products: pick('low_stock_products', 'lowStockProducts'),
    out_of_stock_products: pick('out_of_stock_products', 'outOfStockProducts'),
    pending_packing: pick('pending_packing', 'pendingPacking'),
    pending_dispatches: pick('pending_dispatches', 'pendingDispatches'),
    registered_serials: pick('registered_serials', 'totalSerialNumbers'),
    recent_movements_count: pick('recent_movements_count', 'recentMovementsCount'),
  };


  return (
    <PortalLayout
      title="Warehouse & Inventory Operations"
      subtitle="Real-time stock levels, purchase orders, packing checklists & dispatches"
      actions={
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={loadDashboard}
            className="btn-wh-secondary"
            disabled={loading}
          >
            <RefreshCw size={15} className={loading ? 'spin' : ''} />
            <span>Refresh</span>
          </button>
          <Link to="/warehouse/dispatches/new" className="btn-wh-primary">
            <Truck size={15} />
            <span>New Dispatch</span>
          </Link>
        </div>
      }
    >
      {error && (
        <div className="wh-alert wh-alert-danger">
          <AlertTriangle size={18} />
          <div>{error}</div>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="wh-kpi-grid">
        <div className="wh-kpi-card">
          <div className="wh-kpi-card-inner">
            <div>
              <div className="wh-kpi-label">Total Catalog Products</div>
              <div className="wh-kpi-val">{stats.total_products}</div>
            </div>
            <div className="wh-kpi-icon" style={{ background: 'rgba(56, 189, 248, 0.15)', color: 'var(--c-blue)' }}>
              <Package size={22} />
            </div>
          </div>
        </div>

        <div className="wh-kpi-card">
          <div className="wh-kpi-card-inner">
            <div>
              <div className="wh-kpi-label">Total Stock On Hand</div>
              <div className="wh-kpi-val">{stats.total_stock_quantity.toLocaleString()}</div>
            </div>
            <div className="wh-kpi-icon" style={{ background: 'rgba(16, 185, 129, 0.15)', color: 'var(--c-green)' }}>
              <Layers size={22} />
            </div>
          </div>
        </div>

        <div className="wh-kpi-card">
          <div className="wh-kpi-card-inner">
            <div>
              <div className="wh-kpi-label">Low-Stock Warnings</div>
              <div className="wh-kpi-val" style={{ color: stats.low_stock_products > 0 ? 'var(--c-amber-soft)' : 'var(--text-strong)' }}>
                {stats.low_stock_products}
              </div>
            </div>
            <div className="wh-kpi-icon" style={{ background: 'rgba(245, 158, 11, 0.15)', color: 'var(--c-amber-soft)' }}>
              <AlertTriangle size={22} />
            </div>
          </div>
        </div>

        <div className="wh-kpi-card">
          <div className="wh-kpi-card-inner">
            <div>
              <div className="wh-kpi-label">Out of Stock</div>
              <div className="wh-kpi-val" style={{ color: stats.out_of_stock_products > 0 ? 'var(--c-red)' : 'var(--text-strong)' }}>
                {stats.out_of_stock_products}
              </div>
            </div>
            <div className="wh-kpi-icon" style={{ background: 'rgba(239, 68, 68, 0.15)', color: 'var(--c-red)' }}>
              <XCircle size={22} />
            </div>
          </div>
        </div>

        <div className="wh-kpi-card">
          <div className="wh-kpi-card-inner">
            <div>
              <div className="wh-kpi-label">Orders Pending Packing</div>
              <div className="wh-kpi-val">{stats.pending_packing}</div>
            </div>
            <div className="wh-kpi-icon" style={{ background: 'rgba(168, 85, 247, 0.15)', color: 'var(--c-violet)' }}>
              <Clock size={22} />
            </div>
          </div>
        </div>

        <div className="wh-kpi-card">
          <div className="wh-kpi-card-inner">
            <div>
              <div className="wh-kpi-label">Pending Dispatches</div>
              <div className="wh-kpi-val">{stats.pending_dispatches}</div>
            </div>
            <div className="wh-kpi-icon" style={{ background: 'rgba(14, 165, 233, 0.15)', color: 'var(--c-blue)' }}>
              <Truck size={22} />
            </div>
          </div>
        </div>

        <div className="wh-kpi-card">
          <div className="wh-kpi-card-inner">
            <div>
              <div className="wh-kpi-label">Registered Serials</div>
              <div className="wh-kpi-val">{stats.registered_serials}</div>
            </div>
            <div className="wh-kpi-icon" style={{ background: 'rgba(236, 72, 153, 0.15)', color: 'var(--c-violet)' }}>
              <QrCode size={22} />
            </div>
          </div>
        </div>

        <div className="wh-kpi-card">
          <div className="wh-kpi-card-inner">
            <div>
              <div className="wh-kpi-label">Stock Movements</div>
              <div className="wh-kpi-val">{stats.recent_movements_count}</div>
            </div>
            <div className="wh-kpi-icon" style={{ background: 'rgba(100, 116, 139, 0.15)', color: 'var(--text-muted)' }}>
              <RefreshCw size={22} />
            </div>
          </div>
        </div>
      </div>

      {/* Low-Stock Alert Banner if any */}
      {data?.low_stock_alerts && data.low_stock_alerts.length > 0 && (
        <div className="wh-alert wh-alert-warning" style={{ display: 'block' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, marginBottom: '8px' }}>
            <AlertTriangle size={18} />
            <span>Low Stock Attention Required ({data.low_stock_alerts.length} Items Below Threshold)</span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
            {data.low_stock_alerts.map((item, idx) => (
              <div
                key={idx}
                style={{
                  background: 'rgba(0,0,0,0.25)',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  fontSize: '0.82rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <strong>{item.product_name}</strong>
                <span>Available: {item.quantity_available} (Min: {item.min_threshold})</span>
                <Link to="/warehouse/purchase-orders/new" style={{ color: 'var(--c-amber-soft)', textDecoration: 'underline' }}>
                  Create PO
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="sx-grid cols-32" style={{ marginBottom: 20 }}>
        <ChartCard title="Work in progress" note="Open items">
          <StripedBars data={[
            { label: 'Packing', value: stats.pending_packing }, { label: 'Dispatch', value: stats.pending_dispatches },
            { label: 'Low stock', value: stats.low_stock_products }, { label: 'Out', value: stats.out_of_stock_products },
            { label: 'Moves', value: stats.recent_movements_count }, { label: 'Serials', value: stats.registered_serials },
          ]} />
        </ChartCard>
        <ChartCard title="Stock health" note={`${stats.total_products} products`}>
          <TickDonut centerLabel="Products" centerValue={stats.total_products}
            items={[
              { label: 'Healthy', value: Math.max(stats.total_products - stats.low_stock_products - stats.out_of_stock_products, 0) },
              { label: 'Low stock', value: stats.low_stock_products }, { label: 'Out of stock', value: stats.out_of_stock_products },
            ]} />
        </ChartCard>
      </div>

      {/* Regional Warehouses Breakdown */}
      <div className="wh-card">
        <div className="wh-card-header">
          <div className="wh-card-title">
            <Warehouse size={18} style={{ color: 'var(--c-emerald)' }} />
            <span>Regional Warehouse Facilities</span>
          </div>
          <Link to="/warehouse/inventory" className="btn-wh-secondary" style={{ padding: '4px 10px', fontSize: '0.8rem' }}>
            View Full Inventory
          </Link>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
          {(data?.warehouses || []).map((wh) => (
            <div
              key={wh.id}
              style={{
                background: 'rgba(var(--ink-rgb), 0.02)',
                border: '1px solid rgba(var(--ink-rgb), 0.06)',
                borderRadius: '10px',
                padding: '16px'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontWeight: 600, color: 'var(--text)' }}>{wh.name}</span>
                <span className="wh-badge wh-badge-green">{wh.code}</span>
              </div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '12px' }}>
                {wh.city}, {wh.state}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-soft)' }}>
                <span>Facility Type:</span>
                <span style={{ textTransform: 'capitalize' }}>{wh.type || 'Primary Hub'}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Stock Movements Table */}
      <div className="wh-card">
        <div className="wh-card-header">
          <div className="wh-card-title">
            <RefreshCw size={18} style={{ color: 'var(--c-blue)' }} />
            <span>Recent Stock Movements & Audit Trail</span>
          </div>
          <Link to="/warehouse/inventory" className="btn-wh-secondary" style={{ padding: '4px 10px', fontSize: '0.8rem' }}>
            <span>Manage Stock</span>
          </Link>
        </div>

        <div className="wh-table-container">
          <table className="wh-table">
            <thead>
              <tr>
                <th>Date & Time</th>
                <th>Type</th>
                <th>Product</th>
                <th>Warehouse</th>
                <th>Quantity</th>
                <th>Reference</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {(!data?.recent_movements || data.recent_movements.length === 0) ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '30px' }}>
                    No stock movements recorded yet.
                  </td>
                </tr>
              ) : (
                data.recent_movements.map((mov) => {
                  const isPositive = mov.movement_type === 'stock_in' || mov.quantity > 0;
                  return (
                    <tr key={mov.id}>
                      <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                        {new Date(mov.created_at).toLocaleString()}
                      </td>
                      <td>
                        <span className={`wh-badge ${
                          mov.movement_type === 'stock_in' ? 'wh-badge-green' :
                          mov.movement_type === 'stock_out' ? 'wh-badge-red' :
                          mov.movement_type === 'reserved' ? 'wh-badge-yellow' : 'wh-badge-blue'
                        }`}>
                          {String(mov.movement_type || '').replace('_', ' ')}
                        </span>
                      </td>
                      <td style={{ fontWeight: 500, color: 'var(--text)' }}>
                        {mov.product_name || mov.product_sku || mov.product_id}
                      </td>
                      <td>{mov.warehouse_name || mov.warehouse_id}</td>
                      <td style={{ fontWeight: 600, color: isPositive ? 'var(--c-green)' : 'var(--c-red)' }}>
                        {isPositive ? `+${mov.quantity}` : `-${Math.abs(mov.quantity)}`}
                      </td>
                      <td>
                        <code style={{ fontSize: '0.78rem', background: 'rgba(var(--ink-rgb), 0.06)', padding: '2px 6px', borderRadius: '4px' }}>
                          {mov.reference_type ? `${mov.reference_type}: ${mov.reference_id || '-'}` : '-'}
                        </code>
                      </td>
                      <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                        {mov.notes || '-'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </PortalLayout>
  );
}
