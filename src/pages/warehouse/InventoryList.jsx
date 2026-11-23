import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import PortalLayout from '@/components/PortalLayout';
import { warehouseApi } from '@/services/api/warehouse';
import {
  ArrowDownLeft,
  ArrowUpRight,
  RefreshCw,
  Sliders,
  Search,
  AlertTriangle,
  CheckCircle,
  Eye,
  X,
} from 'lucide-react';

export default function InventoryList() {
  const [inventory, setInventory] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedWh, setSelectedWh] = useState('all');

  // Modal State
  const [activeModal, setActiveModal] = useState(null); // 'stock_in' | 'stock_out' | 'adjustment' | 'transfer'
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState(null);
  const [modalSuccess, setModalSuccess] = useState(null);

  // Form State for Stock Operations
  const [opForm, setOpForm] = useState({
    productId: '',
    warehouseId: '',
    toWarehouseId: '',
    quantity: '',
    actualCount: '',
    reason: '',
    referenceType: '',
    referenceId: '',
    unitCost: '',
    notes: ''
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const [invRes, dashRes] = await Promise.all([
        warehouseApi.getInventory({ warehouse_id: selectedWh !== 'all' ? selectedWh : undefined, search }),
        warehouseApi.getDashboard()
      ]);

      if (invRes && invRes.success) {
        setInventory(invRes.data);
      }
      if (dashRes && dashRes.success && dashRes.data.warehouses) {
        setWarehouses(dashRes.data.warehouses);
      }
    } catch (err) {
      console.error('Error loading inventory:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedWh]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadData();
  };

  const openOperationModal = (opType, preselectedItem = null) => {
    setModalError(null);
    setModalSuccess(null);
    setActiveModal(opType);
    setOpForm({
      productId: preselectedItem ? preselectedItem.product_id : (inventory[0]?.product_id || ''),
      warehouseId: preselectedItem ? preselectedItem.warehouse_id : (warehouses[0]?.id || ''),
      toWarehouseId: warehouses.length > 1 ? warehouses[1].id : '',
      quantity: '',
      actualCount: preselectedItem ? preselectedItem.quantity_on_hand : '',
      reason: opType === 'stock_out' ? 'damaged' : opType === 'adjustment' ? 'cycle_count' : 'routine',
      referenceType: opType === 'stock_in' ? 'purchase_order' : opType === 'transfer' ? 'transfer_order' : 'internal',
      referenceId: '',
      unitCost: '',
      notes: ''
    });
  };

  const handleModalSubmit = async (e) => {
    e.preventDefault();
    setModalError(null);
    setModalSuccess(null);

    const qty = parseInt(opForm.quantity, 10);
    if (activeModal !== 'adjustment' && (!qty || qty <= 0)) {
      setModalError('Quantity must be a positive integer');
      return;
    }

    try {
      setModalLoading(true);
      const payload = {
        operation: activeModal,
        productId: opForm.productId,
        warehouseId: opForm.warehouseId,
        toWarehouseId: opForm.toWarehouseId,
        quantity: qty,
        actualCount: parseInt(opForm.actualCount, 10),
        reason: opForm.reason,
        referenceType: opForm.referenceType,
        referenceId: opForm.referenceId,
        unitCost: parseFloat(opForm.unitCost) || undefined,
        notes: opForm.notes
      };

      const res = await warehouseApi.performStockOperation(payload);
      if (res && res.success) {
        setModalSuccess('Stock operation executed successfully!');
        await loadData();
        setTimeout(() => {
          setActiveModal(null);
        }, 1000);
      } else {
        setModalError(res?.error || 'Operation failed');
      }
    } catch (err) {
      setModalError(err.message || 'Error executing operation');
    } finally {
      setModalLoading(false);
    }
  };

  return (
    <PortalLayout
      title="Stock Inventory & Warehouses"
      subtitle="Multi-warehouse stock levels, reservations, adjustments, and location tracking"
      actions={
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={() => openOperationModal('stock_in')} className="btn-wh-primary">
            <ArrowDownLeft size={16} />
            <span>Stock-In</span>
          </button>
          <button onClick={() => openOperationModal('stock_out')} className="btn-wh-secondary">
            <ArrowUpRight size={16} />
            <span>Stock-Out</span>
          </button>
          <button onClick={() => openOperationModal('adjustment')} className="btn-wh-secondary">
            <Sliders size={16} />
            <span>Adjustment</span>
          </button>
          <button onClick={() => openOperationModal('transfer')} className="btn-wh-accent">
            <RefreshCw size={16} />
            <span>Transfer</span>
          </button>
        </div>
      }
    >
      {/* Filter and Facility Selector */}
      <div className="wh-filter-bar">
        <form onSubmit={handleSearchSubmit} className="wh-search-box">
          <Search size={16} style={{ color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Search product name, SKU, or bin location..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </form>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Facility:</label>
          <select
            className="wh-select"
            value={selectedWh}
            onChange={(e) => setSelectedWh(e.target.value)}
          >
            <option value="all">All Regional Warehouses</option>
            {warehouses.map(w => (
              <option key={w.id} value={w.id}>{w.name} ({w.code})</option>
            ))}
          </select>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="wh-card">
        <div className="wh-table-container">
          <table className="wh-table">
            <thead>
              <tr>
                <th>Product SKU</th>
                <th>Product Name</th>
                <th>Warehouse</th>
                <th>Bin / Location</th>
                <th>On Hand</th>
                <th>Reserved</th>
                <th>Available</th>
                <th>Min Threshold</th>
                <th>Status</th>
                <th>Quick Actions</th>
              </tr>
            </thead>
            <tbody>
              {inventory.length === 0 ? (
                <tr>
                  <td colSpan="10" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '36px' }}>
                    {loading ? 'Loading inventory data...' : 'No inventory records found.'}
                  </td>
                </tr>
              ) : (
                inventory.map((item) => {
                  const onHand = item.quantity_on_hand || 0;
                  const reserved = item.quantity_reserved || 0;
                  const available = item.quantity_available !== undefined ? item.quantity_available : (onHand - reserved);
                  const isLow = available <= (item.min_stock_threshold || 10);
                  const isOut = available === 0;

                  return (
                    <tr key={item.id}>
                      <td>
                        <code style={{ fontSize: '0.82rem', color: 'var(--c-blue)', background: 'rgba(56, 189, 248, 0.08)', padding: '2px 6px', borderRadius: '4px' }}>
                          {item.product_sku || item.product?.sku}
                        </code>
                      </td>
                      <td style={{ fontWeight: 600, color: 'var(--text)' }}>
                        <Link to={`/warehouse/inventory/${item.id}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                          {item.product_name || item.product?.name}
                        </Link>
                      </td>
                      <td>
                        <span style={{ fontSize: '0.85rem' }}>{item.warehouse_name || item.warehouse?.name}</span>
                      </td>
                      <td>
                        <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                          {item.bin_location || 'Aisle 1-A'}
                        </span>
                      </td>
                      <td style={{ fontWeight: 700, color: 'var(--text-strong)' }}>
                        {onHand}
                      </td>
                      <td style={{ color: reserved > 0 ? 'var(--c-amber-soft)' : 'var(--text-muted)' }}>
                        {reserved}
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontWeight: 700, color: isOut ? 'var(--c-red)' : isLow ? 'var(--c-amber-soft)' : 'var(--c-green)' }}>
                            {available}
                          </span>
                          {isOut ? (
                            <span className="wh-badge wh-badge-red" style={{ fontSize: '0.68rem', padding: '1px 5px' }}>Out</span>
                          ) : isLow ? (
                            <span className="wh-badge wh-badge-yellow" style={{ fontSize: '0.68rem', padding: '1px 5px' }}>Low</span>
                          ) : (
                            <span className="wh-badge wh-badge-green" style={{ fontSize: '0.68rem', padding: '1px 5px' }}>Good</span>
                          )}
                        </div>
                      </td>
                      <td>{item.min_stock_threshold || 10}</td>
                      <td>
                        <span className={`wh-badge ${available > 0 ? 'wh-badge-green' : 'wh-badge-red'}`}>
                          {available > 0 ? 'In Stock' : 'Depleted'}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button
                            onClick={() => openOperationModal('stock_in', item)}
                            className="btn-wh-secondary"
                            style={{ padding: '3px 8px', fontSize: '0.72rem' }}
                            title="Quick Stock In"
                          >
                            +In
                          </button>
                          <button
                            onClick={() => openOperationModal('adjustment', item)}
                            className="btn-wh-secondary"
                            style={{ padding: '3px 8px', fontSize: '0.72rem' }}
                            title="Adjust Stock"
                          >
                            Adj
                          </button>
                          <Link
                            to={`/warehouse/inventory/${item.id}`}
                            className="btn-wh-secondary"
                            style={{ padding: '3px 8px', fontSize: '0.72rem' }}
                            title="Audit History"
                          >
                            <Eye size={12} />
                          </Link>
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

      {/* Stock Operation Modal */}
      {activeModal && (
        <div className="wh-modal-overlay">
          <div className="wh-modal">
            <div className="wh-modal-header">
              <h3 style={{ margin: 0, textTransform: 'capitalize' }}>
                {activeModal.replace('_', ' ')} Operation
              </h3>
              <button
                onClick={() => setActiveModal(null)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleModalSubmit}>
              <div className="wh-modal-body">
                {modalError && (
                  <div className="wh-alert wh-alert-danger" style={{ marginBottom: '16px' }}>
                    <AlertTriangle size={16} />
                    <span>{modalError}</span>
                  </div>
                )}
                {modalSuccess && (
                  <div className="wh-alert wh-alert-success" style={{ marginBottom: '16px' }}>
                    <CheckCircle size={16} />
                    <span>{modalSuccess}</span>
                  </div>
                )}

                <div className="wh-form-grid full">
                  <div className="wh-form-group">
                    <label>Select Product *</label>
                    <select
                      className="wh-select"
                      value={opForm.productId}
                      onChange={(e) => setOpForm({ ...opForm, productId: e.target.value })}
                      required
                    >
                      {inventory.map(i => (
                        <option key={i.product_id} value={i.product_id}>
                          {i.product_name} ({i.product_sku})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="wh-form-group">
                    <label>Target Warehouse *</label>
                    <select
                      className="wh-select"
                      value={opForm.warehouseId}
                      onChange={(e) => setOpForm({ ...opForm, warehouseId: e.target.value })}
                      required
                    >
                      {warehouses.map(w => (
                        <option key={w.id} value={w.id}>{w.name} ({w.code})</option>
                      ))}
                    </select>
                  </div>

                  {activeModal === 'transfer' && (
                    <div className="wh-form-group">
                      <label>Destination Warehouse *</label>
                      <select
                        className="wh-select"
                        value={opForm.toWarehouseId}
                        onChange={(e) => setOpForm({ ...opForm, toWarehouseId: e.target.value })}
                        required
                      >
                        {warehouses
                          .filter(w => w.id !== opForm.warehouseId)
                          .map(w => (
                            <option key={w.id} value={w.id}>{w.name} ({w.code})</option>
                          ))}
                      </select>
                    </div>
                  )}

                  {activeModal === 'adjustment' ? (
                    <div className="wh-form-group">
                      <label>Actual Verified Physical Count *</label>
                      <input
                        type="number"
                        className="wh-input"
                        placeholder="Current physical count"
                        value={opForm.actualCount}
                        onChange={(e) => setOpForm({ ...opForm, actualCount: e.target.value })}
                        min="0"
                        required
                      />
                    </div>
                  ) : (
                    <div className="wh-form-group">
                      <label>Quantity *</label>
                      <input
                        type="number"
                        className="wh-input"
                        placeholder="Units to process"
                        value={opForm.quantity}
                        onChange={(e) => setOpForm({ ...opForm, quantity: e.target.value })}
                        min="1"
                        required
                      />
                    </div>
                  )}

                  {activeModal === 'stock_in' && (
                    <div className="wh-form-group">
                      <label>Unit Cost (₹ Optional)</label>
                      <input
                        type="number"
                        className="wh-input"
                        placeholder="Per unit purchase cost"
                        value={opForm.unitCost}
                        onChange={(e) => setOpForm({ ...opForm, unitCost: e.target.value })}
                        min="0"
                        step="0.01"
                      />
                    </div>
                  )}

                  <div className="wh-form-group">
                    <label>Reference Document / Reason</label>
                    <input
                      type="text"
                      className="wh-input"
                      placeholder="e.g. PO-2026-004, Cycle Count Feb, Discard Damaged"
                      value={opForm.referenceId}
                      onChange={(e) => setOpForm({ ...opForm, referenceId: e.target.value })}
                    />
                  </div>

                  <div className="wh-form-group">
                    <label>Operational Notes</label>
                    <textarea
                      className="wh-textarea"
                      rows="2"
                      placeholder="Notes, inspected by, condition, etc."
                      value={opForm.notes}
                      onChange={(e) => setOpForm({ ...opForm, notes: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="wh-modal-footer">
                <button
                  type="button"
                  className="btn-wh-secondary"
                  onClick={() => setActiveModal(null)}
                  disabled={modalLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-wh-primary"
                  disabled={modalLoading}
                >
                  {modalLoading ? 'Executing...' : 'Confirm Operation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PortalLayout>
  );
}
