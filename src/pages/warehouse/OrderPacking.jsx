import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import WarehouseLayout from './WarehouseLayout';
import { warehouseApi } from '@/services/api/warehouse';
import {
  CheckSquare,
  Package,
  Layers,
  ArrowLeft,
  CheckCircle,
  AlertTriangle,
  QrCode,
  Save,
  Lock,
  Plus
} from 'lucide-react';

export default function OrderPacking() {
  const { orderId } = useParams();
  const navigate = useNavigate();

  const [orderData, setOrderData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionSuccess, setActionSuccess] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Packing Checklist state
  const [packedItems, setPackedItems] = useState({});
  const [assignedSerials, setAssignedSerials] = useState({});

  const loadOrderDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await warehouseApi.getOrderPackingDetails(orderId);
      if (res && res.success) {
        setOrderData(res.data);

        // Pre-fill packed status & existing serial assignments if any
        const initialPacked = {};
        const initialSerials = {};
        (res.data.bom_items || []).forEach(item => {
          initialPacked[item.product_id] = item.is_packed || false;
          initialSerials[item.product_id] = item.assigned_serials || [];
        });
        setPackedItems(initialPacked);
        setAssignedSerials(initialSerials);
      } else {
        setError(res?.error || 'Order packing details not found');
      }
    } catch (err) {
      setError(err.message || 'Error loading packing details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrderDetails();
  }, [orderId]);

  const togglePacked = (productId) => {
    setPackedItems(prev => ({
      ...prev,
      [productId]: !prev[productId]
    }));
  };

  const addSerialNumber = (productId, serial) => {
    if (!serial || !serial.trim()) return;
    const current = assignedSerials[productId] || [];
    if (current.includes(serial.trim())) return;
    setAssignedSerials(prev => ({
      ...prev,
      [productId]: [...current, serial.trim()]
    }));
  };

  const removeSerialNumber = (productId, serialToRemove) => {
    const current = assignedSerials[productId] || [];
    setAssignedSerials(prev => ({
      ...prev,
      [productId]: current.filter(s => s !== serialToRemove)
    }));
  };

  // Action: Reserve Inventory
  const handleReserveStock = async () => {
    try {
      setActionLoading(true);
      setActionSuccess(null);
      setError(null);

      const res = await warehouseApi.updateOrderPacking(orderId, {
        action: 'reserve'
      });

      if (res && res.success) {
        setActionSuccess('Inventory reserved successfully! Stock availability confirmed.');
        await loadOrderDetails();
      } else {
        setError(res?.error || 'Failed to reserve inventory');
      }
    } catch (err) {
      setError(err.message || 'Error reserving inventory');
    } finally {
      setActionLoading(false);
    }
  };

  // Action: Complete Packing
  const handleCompletePacking = async () => {
    try {
      setActionLoading(true);
      setActionSuccess(null);
      setError(null);

      // Verify all items are marked packed
      const bomItems = orderData?.bom_items || [];
      const unpacked = bomItems.filter(i => !packedItems[i.product_id]);
      if (unpacked.length > 0) {
        setError(`Please check off all items before completing packing. ${unpacked.length} item(s) remaining.`);
        setActionLoading(false);
        return;
      }

      const res = await warehouseApi.updateOrderPacking(orderId, {
        action: 'complete_packing',
        packed_items: packedItems,
        serial_numbers: assignedSerials
      });

      if (res && res.success) {
        setActionSuccess('Order packing completed! Ready for dispatch.');
        setTimeout(() => {
          navigate('/warehouse/dispatches/new', { state: { orderId } });
        }, 1500);
      } else {
        setError(res?.error || 'Failed to complete packing');
      }
    } catch (err) {
      setError(err.message || 'Error completing packing');
    } finally {
      setActionLoading(false);
    }
  };

  const isAllPacked = orderData?.bom_items?.every(i => packedItems[i.product_id]);

  return (
    <WarehouseLayout
      title={`Packing Order: ${orderData?.order_number || orderId}`}
      subtitle={`Customer: ${orderData?.customer_name || '-'} | Delivery: ${orderData?.delivery_address || '-'}`}
      actions={
        <Link to="/warehouse/packing" className="btn-wh-secondary">
          <ArrowLeft size={16} />
          <span>Back to Packing Queue</span>
        </Link>
      }
    >
      {error && (
        <div className="wh-alert wh-alert-danger">
          <AlertTriangle size={18} />
          <div>{error}</div>
        </div>
      )}

      {actionSuccess && (
        <div className="wh-alert wh-alert-success">
          <CheckCircle size={18} />
          <div>{actionSuccess}</div>
        </div>
      )}

      {/* Reservation Status & Action Header */}
      <div className="wh-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Inventory Allocation Status</div>
          <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fff', marginTop: '4px' }}>
            {orderData?.is_reserved ? (
              <span style={{ color: '#34d399', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <CheckCircle size={18} /> Reserved & Secured Against Stock
              </span>
            ) : (
              <span style={{ color: '#fbbf24', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <AlertTriangle size={18} /> Unreserved — Stock at risk of depletion
              </span>
            )}
          </div>
        </div>

        <div>
          {!orderData?.is_reserved && (
            <button
              onClick={handleReserveStock}
              className="btn-wh-primary"
              disabled={actionLoading}
            >
              <Lock size={15} />
              <span>{actionLoading ? 'Reserving...' : 'Reserve Stock for Order'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Interactive Packing Checklist */}
      <div className="wh-card">
        <div className="wh-card-header">
          <div className="wh-card-title">
            <CheckSquare size={18} style={{ color: '#10b981' }} />
            <span>Bill of Materials (BOM) Packing Checklist</span>
          </div>
          <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
            Check off physical items and record equipment serial numbers
          </span>
        </div>

        <div>
          {(!orderData?.bom_items || orderData.bom_items.length === 0) ? (
            <div style={{ textAlign: 'center', color: '#94a3b8', padding: '30px' }}>
              No BOM items associated with this order.
            </div>
          ) : (
            orderData.bom_items.map((item) => {
              const isPacked = Boolean(packedItems[item.product_id]);
              const serials = assignedSerials[item.product_id] || [];
              const requiresSerials = item.requires_serial_number;

              return (
                <div
                  key={item.product_id}
                  className={`packing-item-card ${isPacked ? 'packed' : ''}`}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', flex: 1 }}>
                    <input
                      type="checkbox"
                      checked={isPacked}
                      onChange={() => togglePacked(item.product_id)}
                      style={{ width: '20px', height: '20px', marginTop: '3px', cursor: 'pointer' }}
                    />
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.95rem', color: '#f8fafc' }}>
                        {item.product_name}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '2px' }}>
                        SKU: {item.product_sku} | Quantity to Pack: <strong>{item.quantity} {item.unit || 'pcs'}</strong>
                      </div>

                      {/* Serial Number Assignment Section if required */}
                      {requiresSerials && (
                        <div style={{ marginTop: '10px' }}>
                          <div style={{ fontSize: '0.78rem', color: '#cbd5e1', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <QrCode size={13} style={{ color: '#38bdf8' }} />
                            <span>Assigned Serial Numbers ({serials.length} / {item.quantity}):</span>
                          </div>

                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '6px' }}>
                            {serials.map((s, sIdx) => (
                              <span
                                key={sIdx}
                                style={{
                                  background: 'rgba(56, 189, 248, 0.15)',
                                  border: '1px solid rgba(56, 189, 248, 0.3)',
                                  color: '#38bdf8',
                                  padding: '2px 8px',
                                  borderRadius: '6px',
                                  fontSize: '0.75rem',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '6px'
                                }}
                              >
                                {s}
                                <button
                                  type="button"
                                  onClick={() => removeSerialNumber(item.product_id, s)}
                                  style={{ background: 'transparent', border: 'none', color: '#f87171', cursor: 'pointer', padding: 0 }}
                                >
                                  ×
                                </button>
                              </span>
                            ))}
                          </div>

                          {serials.length < item.quantity && (
                            <div style={{ display: 'flex', gap: '6px', maxWidth: '300px' }}>
                              <input
                                type="text"
                                className="wh-input"
                                placeholder="Scan or enter Serial #"
                                style={{ padding: '4px 8px', fontSize: '0.8rem' }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    addSerialNumber(item.product_id, e.target.value);
                                    e.target.value = '';
                                  }
                                }}
                              />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <span className={`wh-badge ${isPacked ? 'wh-badge-green' : 'wh-badge-gray'}`}>
                      {isPacked ? 'Packed' : 'Pending Packing'}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
          <button
            type="button"
            onClick={handleCompletePacking}
            className="btn-wh-primary"
            disabled={actionLoading || !isAllPacked}
            style={{ opacity: !isAllPacked ? 0.6 : 1 }}
          >
            <CheckSquare size={16} />
            <span>{actionLoading ? 'Finalizing Packing...' : 'Mark Packing Complete & Proceed to Dispatch'}</span>
          </button>
        </div>
      </div>
    </WarehouseLayout>
  );
}
