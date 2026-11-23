import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import PortalLayout from '@/components/PortalLayout';
import { warehouseApi } from '@/services/api/warehouse';
import {
  Plus,
  Search,
  Eye,
  RefreshCw,
} from 'lucide-react';

export default function DispatchesList() {
  const [dispatches, setDispatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const loadDispatches = async () => {
    try {
      setLoading(true);
      const res = await warehouseApi.getDispatches({
        status: statusFilter !== 'all' ? statusFilter : undefined
      });
      if (res && res.success) {
        setDispatches(res.data);
      }
    } catch (err) {
      console.error('Failed to load dispatches:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDispatches();
  }, [statusFilter]);

  const filtered = dispatches.filter(d => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (d.dispatch_number && d.dispatch_number.toLowerCase().includes(q)) ||
      (d.tracking_number && d.tracking_number.toLowerCase().includes(q)) ||
      (d.transporter_name && d.transporter_name.toLowerCase().includes(q)) ||
      (d.customer_name && d.customer_name.toLowerCase().includes(q))
    );
  });

  return (
    <PortalLayout
      title="Dispatches & Equipment Logistics"
      subtitle="Outbound shipments, carrier tracking numbers, and equipment delivery confirmations"
      actions={
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={loadDispatches} className="btn-wh-secondary">
            <RefreshCw size={15} />
            <span>Refresh</span>
          </button>
          <Link to="/warehouse/dispatches/new" className="btn-wh-primary">
            <Plus size={15} />
            <span>New Dispatch</span>
          </Link>
        </div>
      }
    >
      <div className="wh-filter-bar">
        <div className="wh-search-box">
          <Search size={16} style={{ color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Search dispatch #, tracking #, or carrier..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <select
            className="wh-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Dispatch Statuses</option>
            <option value="draft">Draft</option>
            <option value="in_transit">In Transit</option>
            <option value="delivered">Delivered (Warranties Active)</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      <div className="wh-card">
        <div className="wh-table-container">
          <table className="wh-table">
            <thead>
              <tr>
                <th>Dispatch Number</th>
                <th>Order Ref</th>
                <th>Customer & Destination</th>
                <th>Carrier / Transporter</th>
                <th>Tracking AWB</th>
                <th>Dispatch Date</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '36px' }}>
                    {loading ? 'Loading dispatches...' : 'No dispatches found.'}
                  </td>
                </tr>
              ) : (
                filtered.map((d) => {
                  const isDelivered = d.status === 'delivered';
                  const isInTransit = d.status === 'in_transit';

                  return (
                    <tr key={d.id}>
                      <td>
                        <strong style={{ color: 'var(--c-blue)' }}>{d.dispatch_number}</strong>
                      </td>
                      <td>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-soft)' }}>
                          {d.order_number || d.order_id || 'Direct'}
                        </span>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--text)' }}>{d.customer_name || 'Client'}</div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                          {d.destination_city || d.shipping_address?.substring(0, 25) || '-'}
                        </div>
                      </td>
                      <td>{d.transporter_name || 'Logistics Provider'}</td>
                      <td>
                        <code style={{ fontSize: '0.8rem', background: 'rgba(var(--ink-rgb), 0.06)', padding: '2px 6px', borderRadius: '4px' }}>
                          {d.tracking_number || 'N/A'}
                        </code>
                      </td>
                      <td>
                        {d.dispatched_at ? new Date(d.dispatched_at).toLocaleDateString() : 'Pending'}
                      </td>
                      <td>
                        <span className={`wh-badge ${
                          isDelivered ? 'wh-badge-green' :
                          isInTransit ? 'wh-badge-blue' : 'wh-badge-yellow'
                        }`}>
                          {String(d.status || '').replace('_', ' ')}
                        </span>
                      </td>
                      <td>
                        <Link
                          to={`/warehouse/dispatches/${d.id}`}
                          className="btn-wh-secondary"
                          style={{ padding: '4px 10px', fontSize: '0.78rem' }}
                        >
                          <Eye size={13} />
                          <span>{isDelivered ? 'Challan & Warranty' : 'Manage / Deliver'}</span>
                        </Link>
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
