import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import WarehouseLayout from './WarehouseLayout';
import { warehouseApi } from '@/services/api/warehouse';
import {
  Save,
  ArrowLeft,
  Package,
  Layers,
  AlertCircle,
  CheckCircle,
  ShieldAlert
} from 'lucide-react';

const CATEGORIES = [
  { id: 'solar_panel', name: 'Solar Panels' },
  { id: 'inverter', name: 'Inverters' },
  { id: 'battery', name: 'Batteries' },
  { id: 'mounting_structure', name: 'Mounting Structures' },
  { id: 'cable', name: 'Cables' },
  { id: 'protection', name: 'Protection Equipment' },
  { id: 'accessory', name: 'Accessories' },
];

const UNITS = ['pcs', 'm', 'kg', 'set', 'box', 'roll'];

export default function ProductForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(isEdit);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    category: 'solar_panel',
    manufacturer: '',
    description: '',
    unit: 'pcs',
    purchase_price: '',
    selling_price: '',
    min_stock_threshold: '10',
    status: 'active',
    requires_serial_number: true,
    warranty_months: '120',
    specifications: {
      wattage: '',
      efficiency: '',
      phase: '',
      capacity_kwh: '',
      dimensions: ''
    }
  });

  useEffect(() => {
    if (isEdit) {
      loadProduct();
    }
  }, [id]);

  const loadProduct = async () => {
    try {
      setFetching(true);
      const res = await warehouseApi.getProductById(id);
      if (res && res.success) {
        const p = res.data;
        setFormData({
          name: p.name || '',
          sku: p.sku || '',
          category: p.category || 'solar_panel',
          manufacturer: p.manufacturer || '',
          description: p.description || '',
          unit: p.unit || 'pcs',
          purchase_price: p.purchase_price ?? '',
          selling_price: p.selling_price ?? '',
          min_stock_threshold: p.min_stock_threshold ?? '10',
          status: p.status || 'active',
          requires_serial_number: p.requires_serial_number ?? false,
          warranty_months: p.warranty_months ?? '120',
          specifications: p.specifications || {}
        });
      } else {
        setError(res?.error || 'Product not found');
      }
    } catch (err) {
      setError(err.message || 'Failed to load product');
    } finally {
      setFetching(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (name.startsWith('spec_')) {
      const specField = name.replace('spec_', '');
      setFormData(prev => ({
        ...prev,
        specifications: { ...prev.specifications, [specField]: value }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!formData.name || !formData.sku) {
      setError('Product Name and SKU are required');
      return;
    }

    try {
      setLoading(true);
      const payload = {
        ...formData,
        purchase_price: parseFloat(formData.purchase_price) || 0,
        selling_price: parseFloat(formData.selling_price) || 0,
        min_stock_threshold: parseInt(formData.min_stock_threshold, 10) || 0,
        warranty_months: parseInt(formData.warranty_months, 10) || 0
      };

      let res;
      if (isEdit) {
        res = await warehouseApi.updateProduct(id, payload);
      } else {
        res = await warehouseApi.createProduct(payload);
      }

      if (res && res.success) {
        setSuccess(`Product ${isEdit ? 'updated' : 'created'} successfully!`);
        setTimeout(() => {
          navigate('/warehouse/products');
        }, 1200);
      } else {
        setError(res?.error || 'Failed to save product');
      }
    } catch (err) {
      setError(err.message || 'Error occurred while saving product');
    } finally {
      setLoading(false);
    }
  };

  return (
    <WarehouseLayout
      title={isEdit ? `Edit Product: ${formData.name || 'Catalog Item'}` : 'Register New Solar Product'}
      subtitle={isEdit ? `SKU: ${formData.sku}` : 'Add a solar panel, inverter, battery, or accessory to the master catalog'}
      actions={
        <Link to="/warehouse/products" className="btn-wh-secondary">
          <ArrowLeft size={16} />
          <span>Back to Products</span>
        </Link>
      }
    >
      {error && (
        <div className="wh-alert wh-alert-danger">
          <AlertCircle size={18} />
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
              <Package size={18} style={{ color: '#10b981' }} />
              <span>General Product Specifications</span>
            </div>
          </div>

          <div className="wh-form-grid">
            <div className="wh-form-group span-2">
              <label>Product Title / Name *</label>
              <input
                type="text"
                name="name"
                className="wh-input"
                placeholder="e.g. Waaree 545Wp Bifacial Dual-Glass Solar Panel"
                value={formData.name}
                onChange={handleChange}
                required
              />
            </div>

            <div className="wh-form-group">
              <label>SKU (Stock Keeping Unit) *</label>
              <input
                type="text"
                name="sku"
                className="wh-input"
                placeholder="e.g. SP-WAA-545B"
                value={formData.sku}
                onChange={handleChange}
                required
              />
            </div>

            <div className="wh-form-group">
              <label>Equipment Category *</label>
              <select
                name="category"
                className="wh-select"
                value={formData.category}
                onChange={handleChange}
              >
                {CATEGORIES.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div className="wh-form-group">
              <label>Manufacturer / Brand</label>
              <input
                type="text"
                name="manufacturer"
                className="wh-input"
                placeholder="e.g. Waaree, Solis, Growatt, Havells"
                value={formData.manufacturer}
                onChange={handleChange}
              />
            </div>

            <div className="wh-form-group">
              <label>Unit of Measurement</label>
              <select
                name="unit"
                className="wh-select"
                value={formData.unit}
                onChange={handleChange}
              >
                {UNITS.map(u => (
                  <option key={u} value={u}>{u.toUpperCase()}</option>
                ))}
              </select>
            </div>

            <div className="wh-form-group">
              <label>Purchase Price (₹)</label>
              <input
                type="number"
                name="purchase_price"
                className="wh-input"
                placeholder="Cost price per unit"
                value={formData.purchase_price}
                onChange={handleChange}
                min="0"
                step="0.01"
              />
            </div>

            <div className="wh-form-group">
              <label>Selling Price (₹)</label>
              <input
                type="number"
                name="selling_price"
                className="wh-input"
                placeholder="Selling price per unit"
                value={formData.selling_price}
                onChange={handleChange}
                min="0"
                step="0.01"
              />
            </div>

            <div className="wh-form-group">
              <label>Minimum Stock Threshold</label>
              <input
                type="number"
                name="min_stock_threshold"
                className="wh-input"
                placeholder="Alert when stock falls below this"
                value={formData.min_stock_threshold}
                onChange={handleChange}
                min="0"
              />
            </div>

            <div className="wh-form-group">
              <label>Default Warranty Duration (Months)</label>
              <input
                type="number"
                name="warranty_months"
                className="wh-input"
                placeholder="120 (10 years), 300 (25 years)"
                value={formData.warranty_months}
                onChange={handleChange}
                min="0"
              />
            </div>

            <div className="wh-form-group">
              <label>Catalog Status</label>
              <select
                name="status"
                className="wh-select"
                value={formData.status}
                onChange={handleChange}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="discontinued">Discontinued</option>
              </select>
            </div>

            <div className="wh-form-group" style={{ justifyContent: 'center' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', marginTop: '16px' }}>
                <input
                  type="checkbox"
                  name="requires_serial_number"
                  checked={formData.requires_serial_number}
                  onChange={handleChange}
                />
                <span style={{ color: '#fff', fontSize: '0.88rem' }}>Requires Individual Serial Number Tracking</span>
              </label>
            </div>

            <div className="wh-form-group span-2">
              <label>Product Description & Notes</label>
              <textarea
                name="description"
                className="wh-textarea"
                rows="3"
                placeholder="Technical description, cell count, certifications (IEC/BIS), etc."
                value={formData.description}
                onChange={handleChange}
              />
            </div>
          </div>
        </div>

        {/* Technical Specs Card */}
        <div className="wh-card">
          <div className="wh-card-header">
            <div className="wh-card-title">
              <Layers size={18} style={{ color: '#38bdf8' }} />
              <span>Technical Data & Solar Ratings</span>
            </div>
          </div>

          <div className="wh-form-grid col-3">
            <div className="wh-form-group">
              <label>Wattage (Wp) / Power Rating</label>
              <input
                type="text"
                name="spec_wattage"
                className="wh-input"
                placeholder="e.g. 545Wp"
                value={formData.specifications.wattage || ''}
                onChange={handleChange}
              />
            </div>

            <div className="wh-form-group">
              <label>Efficiency (%)</label>
              <input
                type="text"
                name="spec_efficiency"
                className="wh-input"
                placeholder="e.g. 21.3%"
                value={formData.specifications.efficiency || ''}
                onChange={handleChange}
              />
            </div>

            <div className="wh-form-group">
              <label>Phase / Type</label>
              <input
                type="text"
                name="spec_phase"
                className="wh-input"
                placeholder="e.g. 3-Phase / Monocrystalline"
                value={formData.specifications.phase || ''}
                onChange={handleChange}
              />
            </div>

            <div className="wh-form-group">
              <label>Battery Capacity (kWh / Ah)</label>
              <input
                type="text"
                name="spec_capacity_kwh"
                className="wh-input"
                placeholder="e.g. 15 kWh / 300Ah"
                value={formData.specifications.capacity_kwh || ''}
                onChange={handleChange}
              />
            </div>

            <div className="wh-form-group span-2">
              <label>Dimensions / Form Factor</label>
              <input
                type="text"
                name="spec_dimensions"
                className="wh-input"
                placeholder="e.g. 2278 x 1134 x 35 mm"
                value={formData.specifications.dimensions || ''}
                onChange={handleChange}
              />
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <button
            type="button"
            className="btn-wh-secondary"
            onClick={() => navigate('/warehouse/products')}
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
            <span>{loading ? 'Saving...' : isEdit ? 'Update Product' : 'Create Product'}</span>
          </button>
        </div>
      </form>
    </WarehouseLayout>
  );
}
