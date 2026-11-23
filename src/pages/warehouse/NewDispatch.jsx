import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import PortalLayout from '@/components/PortalLayout';
import { warehouseApi } from '@/services/api/warehouse';
import {
  Truck,
  ArrowLeft,
  AlertTriangle,
  CheckCircle,
  Plus,
  Trash2,
} from 'lucide-react';

export default function NewDispatch() {
  const navigate = useNavigate();
  const location = useLocation();
  const preselectedOrderId = location.state?.orderId;

  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const [dispatchData, setDispatchData] = useState({
    dispatch_number: `DSP-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
    order_id: preselectedOrderId || '',
    warehouse_id: '',
    transporter_name: 'BlueDart Logistics',
    tracking_number: `BD-${Math.floor(10000000 + Math.random() * 90000000)}`,
    vehicle_number: 'DL-01-AB-1234',
    driver_name: '',
    driver_phone: '',
    destination_address: '',
    destination_city: '',
    notes: '',
    items: [
      { product_id: '', quantity: 1, serial_numbers: [] }
    ]
  });

  useEffect(() => {
    async function init() {
      try {
        const [ordersRes, prodRes, dashRes] = await Promise.all([
          warehouseApi.getPackingQueue(),
          warehouseApi.getProducts({ status: 'active' }),
          warehouseApi.getDashboard()
        ]);

        if (ordersRes && ordersRes.success) {
          setOrders(ordersRes.data);
        }
        if (prodRes && prodRes.success) {
          setProducts(prodRes.data);
          if (prodRes.data.length > 0 && !dispatchData.items[0].product_id) {
            setDispatchData(prev => ({
              ...prev,
              items: [{ product_id: prodRes.data[0].id, quantity: 10, serial_numbers: [] }]
            }));
          }
        }
        if (dashRes && dashRes.success && dashRes.data.warehouses) {
          setWarehouses(dashRes.data.warehouses);
          if (dashRes.data.warehouses.length > 0) {
            setDispatchData(prev => ({ ...prev, warehouse_id: dashRes.data.warehouses[0].id }));
          }
        }

        // If preselected order, load its items
        if (preselectedOrderId) {
          const detailRes = await warehouseApi.getOrderPackingDetails(preselectedOrderId);
          if (detailRes && detailRes.success) {
            const ord = detailRes.data;
            setDispatchData(prev => ({
              ...prev,
              destination_address: ord.delivery_address || '',
              destination_city: ord.city || '',
              items: (ord.bom_items || []).map(bi => ({
                product_id: bi.product_id,
                quantity: bi.quantity,
                serial_numbers: bi.assigned_serials || []
              }))
            }));
          }
        }
      } catch (err) {
        console.error('Failed to init dispatch form:', err);
      }
    }
    init();
  }, [preselectedOrderId]);

  const handleOrderSelect = async (orderId) => {
    setDispatchData(prev => ({ ...prev, order_id: orderId }));
    if (!orderId) return;

    try {
      const detailRes = await warehouseApi.getOrderPackingDetails(orderId);
      if (detailRes && detailRes.success) {
        const ord = detailRes.data;
        setDispatchData(prev => ({
          ...prev,
          destination_address: ord.delivery_address || '',
          destination_city: ord.city || '',
          items: (ord.bom_items || []).map(bi => ({
            product_id: bi.product_id,
            quantity: bi.quantity,
            serial_numbers: bi.assigned_serials || []
          }))
        }));
      }
    } catch (e) {
      console.error('Failed to load order packing details for dispatch:', e);
    }
  };

  const addItemRow = () => {
    setDispatchData({
      ...dispatchData,
      items: [
        ...dispatchData.items,
        { product_id: products[0]?.id || '', quantity: 1, serial_numbers: [] }
      ]
    });
  };

  const removeItemRow = (idx) => {
    if (dispatchData.items.length === 1) return;
    const updated = dispatchData.items.filter((_, i) => i !== idx);
    setDispatchData({ ...dispatchData, items: updated });
  };

  const handleItemChange = (idx, field, value) => {
    const updated = [...dispatchData.items];
    updated[idx][field] = value;
    setDispatchData({ ...dispatchData, items: updated });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!dispatchData.transporter_name) {
      setError('Transporter / Logistics carrier is required');
      return;
    }

    try {
      setLoading(true);
      const res = await warehouseApi.createDispatch({
        ...dispatchData,
        authorize_immediate: true
      });

      if (res && res.success) {
        setSuccess('Dispatch authorized and marked In-Transit! Stock successfully deducted.');
        setTimeout(() => {
          navigate(`/warehouse/dispatches/${res.data.id}`);
        }, 1500);
      } else {
        setError(res?.error || 'Failed to create dispatch');
      }
    } catch (err) {
      setError(err.message || 'Error creating dispatch');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PortalLayout
      title="Create New Dispatch Shipment"
      subtitle="Prepare shipping manifest, vehicle details, carrier tracking, and authorize stock deduction"
      actions={
        <Link to="/warehouse/dispatches" className="btn-wh-secondary">
          <ArrowLeft size={16} />
          <span>Back to Dispatches</span>
        </Link>
      }
    >
      {error && (
        <div className="wh-alert wh-alert-danger">
          <AlertTriangle size={18} />
          <div>{error}</div>
        </div>
      )}

      {success && (
        <div className="wh-alert wh-alert-success">
          <CheckCircle size={18} />
          <div>{success}</div>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="wh-card">
          <div className="wh-card-header">
            <div className="wh-card-title">
              <Truck size={18} style={{ color: 'var(--c-emerald)' }} />
              <span>Logistics & Shipment Details</span>
            </div>
          </div>

          <div className="wh-form-grid">
            <div className="wh-form-group">
              <label>Dispatch Manifest Number *</label>
              <input
                type="text"
                className="wh-input"
                value={dispatchData.dispatch_number}
                onChange={(e) => setDispatchData({ ...dispatchData, dispatch_number: e.target.value })}
                required
              />
            </div>

            <div className="wh-form-group">
              <label>Origin Warehouse Facility *</label>
              <select
                className="wh-select"
                value={dispatchData.warehouse_id}
                onChange={(e) => setDispatchData({ ...dispatchData, warehouse_id: e.target.value })}
                required
              >
                {warehouses.map(w => (
                  <option key={w.id} value={w.id}>{w.name} ({w.city})</option>
                ))}
              </select>
            </div>

            <div className="wh-form-group">
              <label>Attach Packed Order (Optional)</label>
              <select
                className="wh-select"
                value={dispatchData.order_id}
                onChange={(e) => handleOrderSelect(e.target.value)}
              >
                <option value="">Direct Dispatch / Manual Line Items</option>
                {orders.map(o => (
                  <option key={o.order_id} value={o.order_id}>
                    {o.order_number} - {o.customer_name} ({o.packing_status})
                  </option>
                ))}
              </select>
            </div>

            <div className="wh-form-group">
              <label>Logistics Transporter / Carrier *</label>
              <input
                type="text"
                className="wh-input"
                placeholder="e.g. BlueDart Express, Gati, VRL Logistics"
                value={dispatchData.transporter_name}
                onChange={(e) => setDispatchData({ ...dispatchData, transporter_name: e.target.value })}
                required
              />
            </div>

            <div className="wh-form-group">
              <label>Air Waybill (AWB) / Tracking Number</label>
              <input
                type="text"
                className="wh-input"
                placeholder="e.g. BD-8921892"
                value={dispatchData.tracking_number}
                onChange={(e) => setDispatchData({ ...dispatchData, tracking_number: e.target.value })}
              />
            </div>

            <div className="wh-form-group">
              <label>Vehicle Number</label>
              <input
                type="text"
                className="wh-input"
                placeholder="e.g. MH-04-AX-9912"
                value={dispatchData.vehicle_number}
                onChange={(e) => setDispatchData({ ...dispatchData, vehicle_number: e.target.value })}
              />
            </div>

            <div className="wh-form-group">
              <label>Driver / Transporter Contact Name</label>
              <input
                type="text"
                className="wh-input"
                placeholder="Driver name"
                value={dispatchData.driver_name}
                onChange={(e) => setDispatchData({ ...dispatchData, driver_name: e.target.value })}
              />
            </div>

            <div className="wh-form-group">
              <label>Driver Phone Number</label>
              <input
                type="text"
                className="wh-input"
                placeholder="+91 98111 22334"
                value={dispatchData.driver_phone}
                onChange={(e) => setDispatchData({ ...dispatchData, driver_phone: e.target.value })}
              />
            </div>

            <div className="wh-form-group span-2">
              <label>Destination Delivery Address</label>
              <input
                type="text"
                className="wh-input"
                placeholder="Full delivery address"
                value={dispatchData.destination_address}
                onChange={(e) => setDispatchData({ ...dispatchData, destination_address: e.target.value })}
              />
            </div>
          </div>
        </div>

        {/* Dispatch Items */}
        <div className="wh-card">
          <div className="wh-card-header">
            <div className="wh-card-title">
              <span>Equipment Being Dispatched</span>
            </div>
            <button
              type="button"
              onClick={addItemRow}
              className="btn-wh-secondary"
              style={{ padding: '4px 10px', fontSize: '0.8rem' }}
            >
              <Plus size={14} />
              <span>Add Item</span>
            </button>
          </div>

          <div className="wh-table-container">
            <table className="wh-table">
              <thead>
                <tr>
                  <th style={{ width: '45%' }}>Product</th>
                  <th style={{ width: '20%' }}>Quantity to Dispatch</th>
                  <th style={{ width: '30%' }}>Serials (Comma Separated)</th>
                  <th style={{ width: '5%' }}></th>
                </tr>
              </thead>
              <tbody>
                {dispatchData.items.map((item, idx) => (
                  <tr key={idx}>
                    <td>
                      <select
                        className="wh-select"
                        value={item.product_id}
                        onChange={(e) => handleItemChange(idx, 'product_id', e.target.value)}
                        required
                      >
                        {products.map(p => (
                          <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <input
                        type="number"
                        className="wh-input"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(idx, 'quantity', parseInt(e.target.value, 10) || 1)}
                        required
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        className="wh-input"
                        placeholder="SN-1, SN-2, SN-3"
                        value={Array.isArray(item.serial_numbers) ? item.serial_numbers.join(', ') : item.serial_numbers}
                        onChange={(e) => handleItemChange(idx, 'serial_numbers', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                      />
                    </td>
                    <td>
                      {dispatchData.items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeItemRow(idx)}
                          style={{ background: 'transparent', border: 'none', color: 'var(--c-red)', cursor: 'pointer' }}
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <button
            type="button"
            className="btn-wh-secondary"
            onClick={() => navigate('/warehouse/dispatches')}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn-wh-primary"
            disabled={loading}
          >
            <Truck size={16} />
            <span>{loading ? 'Authorizing Dispatch...' : 'Authorize Dispatch & Deduct Stock'}</span>
          </button>
        </div>
      </form>
    </PortalLayout>
  );
}
