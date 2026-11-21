import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import PortalLayout from '@/components/PortalLayout';
import { warehouseApi } from '@/services/api/warehouse';
import {
  Layers,
  ArrowLeft,
  RefreshCw,
  Clock,
  Warehouse,
  AlertTriangle,
  FileText
} from 'lucide-react';

export default function InventoryDetail() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadDetail = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await warehouseApi.getInventoryById(id);
      if (res && res.success) {
        setData(res.data);
      } else {
        setError(res?.error || 'Inventory record not found');
      }
    } catch (err) {
      setError(err.message || 'Error loading inventory detail');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDetail();
  }, [id]);

  const inv = data?.inventory;
  const movements = data?.movements || [];

  return (
    <PortalLayout
      title={`Inventory Details: ${inv?.product?.name || 'Stock Item'}`}
      subtitle={`Warehouse: ${inv?.warehouse?.name || '-'} | SKU: ${inv?.product?.sku || '-'}`}
      actions={
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={loadDetail} className="btn-wh-secondary">
            <RefreshCw size={15} />
            <span>Refresh</span>
          </button>
          <Link to="/warehouse/inventory" className="btn-wh-primary">
            <ArrowLeft size={15} />
            <span>Back to Inventory</span>
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

      {/* Overview Cards */}
      <div className="wh-kpi-grid">
        <div className="wh-kpi-card">
          <div className="wh-kpi-card-inner">
            <div>
              <div className="wh-kpi-label">Quantity On Hand</div>
              <div className="wh-kpi-val">{inv?.quantity_on_hand ?? 0}</div>
            </div>
            <div className="wh-kpi-icon" style={{ background: 'rgba(56, 189, 248, 0.15)', color: 'var(--c-blue)' }}>
              <Layers size={22} />
            </div>
          </div>
        </div>

        <div className="wh-kpi-card">
          <div className="wh-kpi-card-inner">
            <div>
              <div className="wh-kpi-label">Quantity Reserved</div>
              <div className="wh-kpi-val" style={{ color: (inv?.quantity_reserved || 0) > 0 ? 'var(--c-amber-soft)' : 'var(--text-strong)' }}>
                {inv?.quantity_reserved ?? 0}
              </div>
            </div>
            <div className="wh-kpi-icon" style={{ background: 'rgba(245, 158, 11, 0.15)', color: 'var(--c-amber-soft)' }}>
              <Clock size={22} />
            </div>
          </div>
        </div>

        <div className="wh-kpi-card">
          <div className="wh-kpi-card-inner">
            <div>
              <div className="wh-kpi-label">Available for Orders</div>
              <div className="wh-kpi-val" style={{ color: 'var(--c-green)' }}>
                {inv?.quantity_available ?? ((inv?.quantity_on_hand || 0) - (inv?.quantity_reserved || 0))}
              </div>
            </div>
            <div className="wh-kpi-icon" style={{ background: 'rgba(16, 185, 129, 0.15)', color: 'var(--c-green)' }}>
              <Layers size={22} />
            </div>
          </div>
        </div>

        <div className="wh-kpi-card">
          <div className="wh-kpi-card-inner">
            <div>
              <div className="wh-kpi-label">Bin Location</div>
              <div className="wh-kpi-val" style={{ fontSize: '1.2rem', marginTop: '10px' }}>
                {inv?.bin_location || 'Aisle 1-A'}
              </div>
            </div>
            <div className="wh-kpi-icon" style={{ background: 'rgba(168, 85, 247, 0.15)', color: 'var(--c-violet)' }}>
              <Warehouse size={22} />
            </div>
          </div>
        </div>
      </div>

      {/* Movement History */}
      <div className="wh-card">
        <div className="wh-card-header">
          <div className="wh-card-title">
            <Clock size={18} style={{ color: 'var(--c-emerald)' }} />
            <span>Stock Movement Audit Trail for this Item</span>
          </div>
        </div>

        <div className="wh-table-container">
          <table className="wh-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Movement Type</th>
                <th>Quantity</th>
                <th>Reference</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {movements.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '30px' }}>
                    No recorded movements for this item yet.
                  </td>
                </tr>
              ) : (
                movements.map((mov) => {
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
                          {mov.movement_type.replace('_', ' ')}
                        </span>
                      </td>
                      <td style={{ fontWeight: 600, color: isPositive ? 'var(--c-green)' : 'var(--c-red)' }}>
                        {isPositive ? `+${mov.quantity}` : `-${Math.abs(mov.quantity)}`}
                      </td>
                      <td>
                        <code style={{ fontSize: '0.78rem', background: 'rgba(var(--ink-rgb), 0.06)', padding: '2px 6px', borderRadius: '4px' }}>
                          {mov.reference_type ? `${mov.reference_type}: ${mov.reference_id || '-'}` : '-'}
                        </code>
                      </td>
                      <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{mov.notes || '-'}</td>
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
