import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import WarehouseLayout from './WarehouseLayout';
import { warehouseApi } from '@/services/api/warehouse';
import {
  CheckSquare,
  Package,
  Clock,
  ArrowRight,
  AlertTriangle,
  RefreshCw,
  Search
} from 'lucide-react';

export default function PackingQueue() {
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const loadQueue = async () => {
    try {
      setLoading(true);
      const res = await warehouseApi.getPackingQueue();
      if (res && res.success) {
        setQueue(res.data);
      }
    } catch (err) {
      console.error('Error loading packing queue:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQueue();
  }, []);

  const filteredQueue = queue.filter(item => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (item.order_number && item.order_number.toLowerCase().includes(q)) ||
      (item.customer_name && item.customer_name.toLowerCase().includes(q))
    );
  });

  return (
    <WarehouseLayout
      title="Order Packing & Preparation Queue"
      subtitle="Eligible confirmed orders awaiting warehouse stock reservation, packing, and serial assignment"
      actions={
        <button onClick={loadQueue} className="btn-wh-secondary">
          <RefreshCw size={15} />
          <span>Refresh Queue</span>
        </button>
      }
    >
      <div className="wh-filter-bar">
        <div className="wh-search-box">
          <Search size={16} style={{ color: '#94a3b8' }} />
          <input
            type="text"
            placeholder="Search order number or customer name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="wh-card">
        <div className="wh-table-container">
          <table className="wh-table">
            <thead>
              <tr>
                <th>Order Number</th>
                <th>Customer</th>
                <th>System Type / Size</th>
                <th>Order Date</th>
                <th>BOM Items</th>
                <th>Packing Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredQueue.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', color: '#94a3b8', padding: '36px' }}>
                    {loading ? 'Loading orders eligible for packing...' : 'No orders in packing queue.'}
                  </td>
                </tr>
              ) : (
                filteredQueue.map((order) => {
                  const isPacked = order.packing_status === 'packed';
                  const isPacking = order.packing_status === 'packing';

                  return (
                    <tr key={order.order_id}>
                      <td>
                        <strong style={{ color: '#38bdf8' }}>{order.order_number}</strong>
                      </td>
                      <td style={{ fontWeight: 600, color: '#f8fafc' }}>
                        {order.customer_name || 'Retail Client'}
                      </td>
                      <td>
                        <span style={{ fontSize: '0.82rem', color: '#cbd5e1' }}>
                          {order.system_type || 'Rooftop Solar'} ({order.system_capacity_kw || 10} kW)
                        </span>
                      </td>
                      <td>{new Date(order.order_date).toLocaleDateString()}</td>
                      <td>{order.bom_items?.length || 0} line items</td>
                      <td>
                        <span className={`wh-badge ${
                          isPacked ? 'wh-badge-green' :
                          isPacking ? 'wh-badge-yellow' : 'wh-badge-purple'
                        }`}>
                          {order.packing_status || 'Pending'}
                        </span>
                      </td>
                      <td>
                        <Link
                          to={`/warehouse/packing/${order.order_id}`}
                          className={isPacked ? 'btn-wh-secondary' : 'btn-wh-primary'}
                          style={{ padding: '4px 12px', fontSize: '0.8rem' }}
                        >
                          <span>{isPacked ? 'View Checklist' : 'Start Packing'}</span>
                          <ArrowRight size={14} />
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
    </WarehouseLayout>
  );
}
