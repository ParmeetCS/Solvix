import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import WarehouseLayout from './WarehouseLayout';
import { warehouseApi } from '@/services/api/warehouse';
import {
  FileSpreadsheet,
  Plus,
  Trash2,
  ArrowLeft,
  Save,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';

export default function NewPurchaseOrder() {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const [poData, setPoData] = useState({
    po_number: `PO-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
    supplier_name: '',
    supplier_contact: '',
    supplier_email: '',
    warehouse_id: '',
    expected_delivery_date: '',
    notes: '',
    items: [
      { product_id: '', quantity_ordered: 10, unit_price: 0 }
    ]
  });

  useEffect(() => {
    async function init() {
      try {
        const [prodRes, dashRes] = await Promise.all([
          warehouseApi.getProducts({ status: 'active' }),
          warehouseApi.getDashboard()
        ]);
        if (prodRes && prodRes.success) {
          setProducts(prodRes.data);
          if (prodRes.data.length > 0) {
            setPoData(prev => ({
              ...prev,
              items: [{ product_id: prodRes.data[0].id, quantity_ordered: 10, unit_price: prodRes.data[0].purchase_price || 0 }]
            }));
          }
        }
        if (dashRes && dashRes.success && dashRes.data.warehouses) {
          setWarehouses(dashRes.data.warehouses);
          if (dashRes.data.warehouses.length > 0) {
            setPoData(prev => ({ ...prev, warehouse_id: dashRes.data.warehouses[0].id }));
          }
        }
      } catch (e) {
        console.error('Failed to init PO data:', e);
      }
    }
    init();
  }, []);

  const handleItemChange = (index, field, value) => {
    const updated = [...poData.items];
    updated[index][field] = value;

    if (field === 'product_id') {
      const selected = products.find(p => p.id === value);
      if (selected) {
        updated[index].unit_price = selected.purchase_price || 0;
      }
    }

    setPoData({ ...poData, items: updated });
  };

  const addItemRow = () => {
    setPoData({
      ...poData,
      items: [
        ...poData.items,
        { product_id: products[0]?.id || '', quantity_ordered: 5, unit_price: products[0]?.purchase_price || 0 }
      ]
    });
  };

  const removeItemRow = (index) => {
    if (poData.items.length === 1) return;
    const updated = poData.items.filter((_, i) => i !== index);
    setPoData({ ...poData, items: updated });
  };

  const calculateTotal = () => {
    return poData.items.reduce((sum, item) => {
      const qty = parseFloat(item.quantity_ordered) || 0;
      const price = parseFloat(item.unit_price) || 0;
      return sum + (qty * price);
    }, 0);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!poData.supplier_name) {
      setError('Supplier name is required');
      return;
    }

    try {
      setLoading(true);
      const payload = {
        ...poData,
        items: poData.items.map(i => ({
          product_id: i.product_id,
          quantity_ordered: parseInt(i.quantity_ordered, 10),
          unit_price: parseFloat(i.unit_price)
        }))
      };

      const res = await warehouseApi.createPurchaseOrder(payload);
      if (res && res.success) {
        setSuccess('Purchase order created successfully!');
        setTimeout(() => {
          navigate('/warehouse/purchase-orders');
        }, 1200);
      } else {
        setError(res?.error || 'Failed to create purchase order');
      }
    } catch (err) {
      setError(err.message || 'Error creating purchase order');
    } finally {
      setLoading(false);
    }
  };

  return (
    <WarehouseLayout
      title="Create Purchase Order"
      subtitle="Issue a procurement order to equipment vendors & manufacturers"
      actions={
        <Link to="/warehouse/purchase-orders" className="btn-wh-secondary">
          <ArrowLeft size={16} />
          <span>Back to Purchase Orders</span>
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
              <FileSpreadsheet size={18} style={{ color: '#10b981' }} />
              <span>Purchase Order Details</span>
            </div>
          </div>

          <div className="wh-form-grid">
            <div className="wh-form-group">
              <label>PO Number</label>
              <input
                type="text"
                className="wh-input"
                value={poData.po_number}
                onChange={(e) => setPoData({ ...poData, po_number: e.target.value })}
                required
              />
            </div>

            <div className="wh-form-group">
              <label>Target Warehouse / Receiving Hub *</label>
              <select
                className="wh-select"
                value={poData.warehouse_id}
                onChange={(e) => setPoData({ ...poData, warehouse_id: e.target.value })}
                required
              >
                {warehouses.map(w => (
                  <option key={w.id} value={w.id}>{w.name} ({w.city})</option>
                ))}
              </select>
            </div>

            <div className="wh-form-group">
              <label>Supplier / Manufacturer Name *</label>
              <input
                type="text"
                className="wh-input"
                placeholder="e.g. Waaree Energies Ltd."
                value={poData.supplier_name}
                onChange={(e) => setPoData({ ...poData, supplier_name: e.target.value })}
                required
              />
            </div>

            <div className="wh-form-group">
              <label>Supplier Contact Number</label>
              <input
                type="text"
                className="wh-input"
                placeholder="+91 98765 43210"
                value={poData.supplier_contact}
                onChange={(e) => setPoData({ ...poData, supplier_contact: e.target.value })}
              />
            </div>

            <div className="wh-form-group">
              <label>Supplier Email</label>
              <input
                type="email"
                className="wh-input"
                placeholder="sales@waaree.com"
                value={poData.supplier_email}
                onChange={(e) => setPoData({ ...poData, supplier_email: e.target.value })}
              />
            </div>

            <div className="wh-form-group">
              <label>Expected Delivery Date</label>
              <input
                type="date"
                className="wh-input"
                value={poData.expected_delivery_date}
                onChange={(e) => setPoData({ ...poData, expected_delivery_date: e.target.value })}
              />
            </div>
          </div>
        </div>

        {/* PO Line Items */}
        <div className="wh-card">
          <div className="wh-card-header">
            <div className="wh-card-title">
              <span>Order Line Items</span>
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
                  <th style={{ width: '15%' }}>Quantity</th>
                  <th style={{ width: '20%' }}>Unit Cost (₹)</th>
                  <th style={{ width: '15%' }}>Line Total (₹)</th>
                  <th style={{ width: '5%' }}></th>
                </tr>
              </thead>
              <tbody>
                {poData.items.map((item, idx) => {
                  const lineTotal = (parseFloat(item.quantity_ordered) || 0) * (parseFloat(item.unit_price) || 0);
                  return (
                    <tr key={idx}>
                      <td>
                        <select
                          className="wh-select"
                          value={item.product_id}
                          onChange={(e) => handleItemChange(idx, 'product_id', e.target.value)}
                          required
                        >
                          {products.map(p => (
                            <option key={p.id} value={p.id}>
                              {p.name} ({p.sku})
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <input
                          type="number"
                          className="wh-input"
                          min="1"
                          value={item.quantity_ordered}
                          onChange={(e) => handleItemChange(idx, 'quantity_ordered', e.target.value)}
                          required
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          className="wh-input"
                          min="0"
                          step="0.01"
                          value={item.unit_price}
                          onChange={(e) => handleItemChange(idx, 'unit_price', e.target.value)}
                          required
                        />
                      </td>
                      <td style={{ fontWeight: 600, color: '#34d399' }}>
                        ₹{lineTotal.toLocaleString()}
                      </td>
                      <td>
                        {poData.items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeItemRow(idx)}
                            style={{ background: 'transparent', border: 'none', color: '#f87171', cursor: 'pointer' }}
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px', fontSize: '1.1rem', fontWeight: 700, color: '#fff' }}>
            <span>Estimated Total: ₹{calculateTotal().toLocaleString()}</span>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <button
            type="button"
            className="btn-wh-secondary"
            onClick={() => navigate('/warehouse/purchase-orders')}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn-wh-primary"
            disabled={loading}
          >
            <Save size={16} />
            <span>{loading ? 'Creating PO...' : 'Create Purchase Order'}</span>
          </button>
        </div>
      </form>
    </WarehouseLayout>
  );
}
