import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import PortalLayout from '@/components/PortalLayout';
import { warehouseApi } from '@/services/api/warehouse';
import {
  FileSpreadsheet,
  Plus,
  PackageCheck,
  Search,
  AlertTriangle,
  CheckCircle,
  Clock,
  X
} from 'lucide-react';

export default function PurchaseOrdersList() {
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Receiving Modal State
  const [selectedPO, setSelectedPO] = useState(null);
  const [receiveForm, setReceiveForm] = useState({});
  const [receiveNotes, setReceiveNotes] = useState('');
  const [receivingLoading, setReceivingLoading] = useState(false);
  const [receivingError, setReceivingError] = useState(null);
  const [receivingSuccess, setReceivingSuccess] = useState(null);

  const loadPOs = async () => {
    try {
      setLoading(true);
      const res = await warehouseApi.getPurchaseOrders({
        status: statusFilter !== 'all' ? statusFilter : undefined
      });
      if (res && res.success) {
        setPurchaseOrders(res.data);
      }
    } catch (err) {
      console.error('Failed to load POs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPOs();
  }, [statusFilter]);

  const openReceiveModal = (po) => {
    setSelectedPO(po);
    setReceivingError(null);
    setReceivingSuccess(null);
    setReceiveNotes('');

    // Pre-fill receive quantities with the remaining unreceived amounts
    const initialCounts = {};
    (po.items || []).forEach(item => {
      const remaining = Math.max(0, item.quantity_ordered - (item.quantity_received || 0));
      initialCounts[item.product_id] = remaining;
    });
    setReceiveForm(initialCounts);
  };

  const handleReceiveSubmit = async (e) => {
    e.preventDefault();
    setReceivingError(null);
    setReceivingSuccess(null);

    const receivedItems = Object.entries(receiveForm).map(([productId, qty]) => ({
      product_id: productId,
      quantity_received: parseInt(qty, 10) || 0
    })).filter(i => i.quantity_received > 0);

    if (receivedItems.length === 0) {
      setReceivingError('Please specify at least one item quantity to receive');
      return;
    }

    try {
      setReceivingLoading(true);
      const res = await warehouseApi.receivePurchaseOrder(selectedPO.id, {
        received_items: receivedItems,
        receiving_notes: receiveNotes
      });

      if (res && res.success) {
        setReceivingSuccess('Goods received & inventory successfully incremented!');
        await loadPOs();
        setTimeout(() => {
          setSelectedPO(null);
        }, 1200);
      } else {
        setReceivingError(res?.error || 'Failed to process goods receipt');
      }
    } catch (err) {
      setReceivingError(err.message || 'Error executing goods receipt');
    } finally {
      setReceivingLoading(false);
    }
  };

  return (
    <PortalLayout
      title="Purchase Orders & Goods Receiving"
      subtitle="Procurement orders, supplier tracking, verified goods receipt, and stock increment"
      actions={
        <Link to="/warehouse/purchase-orders/new" className="btn-wh-primary">
          <Plus size={16} />
          <span>Create Purchase Order</span>
        </Link>
      }
    >
      <div className="wh-filter-bar">
        <div className="wh-search-box">
          <Search size={16} style={{ color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Search PO number or supplier..."
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
            <option value="all">All PO Statuses</option>
            <option value="draft">Draft</option>
            <option value="ordered">Ordered</option>
            <option value="partially_received">Partially Received</option>
            <option value="received">Received in Full</option>
          </select>
        </div>
      </div>

      <div className="wh-card">
        <div className="wh-table-container">
          <table className="wh-table">
            <thead>
              <tr>
                <th>PO Number</th>
                <th>Supplier</th>
                <th>Target Warehouse</th>
                <th>Order Date</th>
                <th>Items Count</th>
                <th>Total Value</th>
                <th>Receiving Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {purchaseOrders.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '36px' }}>
                    {loading ? 'Loading purchase orders...' : 'No purchase orders found.'}
                  </td>
                </tr>
              ) : (
                purchaseOrders.map((po) => {
                  const isFullyReceived = po.status === 'received';
                  const isPartial = po.status === 'partially_received';

                  return (
                    <tr key={po.id}>
                      <td>
                        <strong style={{ color: 'var(--c-blue)' }}>{po.po_number}</strong>
                      </td>
                      <td style={{ fontWeight: 500, color: 'var(--text)' }}>
                        {po.supplier_name}
                      </td>
                      <td>{po.warehouse?.name || 'Primary Facility'}</td>
                      <td>{new Date(po.order_date || po.created_at).toLocaleDateString()}</td>
                      <td>{po.items?.length || 0} line items</td>
                      <td style={{ fontWeight: 600, color: 'var(--c-green)' }}>
                        ₹{(po.total_amount || 0).toLocaleString()}
                      </td>
                      <td>
                        <span className={`wh-badge ${
                          isFullyReceived ? 'wh-badge-green' :
                          isPartial ? 'wh-badge-yellow' : 'wh-badge-blue'
                        }`}>
                          {String(po.status || '').replace('_', ' ')}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          {!isFullyReceived && (
                            <button
                              onClick={() => openReceiveModal(po)}
                              className="btn-wh-primary"
                              style={{ padding: '4px 10px', fontSize: '0.78rem' }}
                            >
                              <PackageCheck size={14} />
                              <span>Receive Goods</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Goods Receiving Modal */}
      {selectedPO && (
        <div className="wh-modal-overlay">
          <div className="wh-modal" style={{ maxWidth: '680px' }}>
            <div className="wh-modal-header">
              <h3 style={{ margin: 0 }}>
                Receive Goods: {selectedPO.po_number}
              </h3>
              <button
                onClick={() => setSelectedPO(null)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleReceiveSubmit}>
              <div className="wh-modal-body">
                {receivingError && (
                  <div className="wh-alert wh-alert-danger" style={{ marginBottom: '14px' }}>
                    <AlertTriangle size={16} />
                    <span>{receivingError}</span>
                  </div>
                )}
                {receivingSuccess && (
                  <div className="wh-alert wh-alert-success" style={{ marginBottom: '14px' }}>
                    <CheckCircle size={16} />
                    <span>{receivingSuccess}</span>
                  </div>
                )}

                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
                  Verify physically arrived quantities against supplier challan. Stock will be immediately updated upon confirmation.
                </div>

                <div className="wh-table-container" style={{ marginBottom: '16px' }}>
                  <table className="wh-table">
                    <thead>
                      <tr>
                        <th>Product</th>
                        <th>Ordered</th>
                        <th>Received so far</th>
                        <th>Receive Now</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(selectedPO.items || []).map((item) => {
                        const remaining = Math.max(0, item.quantity_ordered - (item.quantity_received || 0));
                        return (
                          <tr key={item.product_id}>
                            <td style={{ fontWeight: 500, color: 'var(--text)' }}>
                              {item.product_name}
                            </td>
                            <td>{item.quantity_ordered}</td>
                            <td style={{ color: (item.quantity_received || 0) > 0 ? 'var(--c-green)' : 'var(--text-muted)' }}>
                              {item.quantity_received || 0}
                            </td>
                            <td>
                              <input
                                type="number"
                                className="wh-input"
                                style={{ width: '90px', padding: '5px 8px' }}
                                min="0"
                                max={remaining}
                                value={receiveForm[item.product_id] ?? 0}
                                onChange={(e) => setReceiveForm({
                                  ...receiveForm,
                                  [item.product_id]: e.target.value
                                })}
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="wh-form-group">
                  <label>Receiving / Inspection Notes (Challan #, Condition)</label>
                  <textarea
                    className="wh-textarea"
                    rows="2"
                    placeholder="e.g. Received via BlueDart AWB#88192, all cartons inspected and intact."
                    value={receiveNotes}
                    onChange={(e) => setReceiveNotes(e.target.value)}
                  />
                </div>
              </div>

              <div className="wh-modal-footer">
                <button
                  type="button"
                  className="btn-wh-secondary"
                  onClick={() => setSelectedPO(null)}
                  disabled={receivingLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-wh-primary"
                  disabled={receivingLoading}
                >
                  <PackageCheck size={16} />
                  <span>{receivingLoading ? 'Recording Receipt...' : 'Confirm Goods Receipt'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PortalLayout>
  );
}
