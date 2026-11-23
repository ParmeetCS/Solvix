import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import PortalLayout from '@/components/PortalLayout';
import { warehouseApi } from '@/services/api/warehouse';
import {
  Plus,
  Search,
  Edit,
} from 'lucide-react';

const CATEGORIES = [
  { id: 'all', name: 'All Categories' },
  { id: 'solar_panel', name: 'Solar Panels' },
  { id: 'inverter', name: 'Inverters' },
  { id: 'battery', name: 'Batteries' },
  { id: 'mounting_structure', name: 'Mounting Structures' },
  { id: 'cable', name: 'Cables' },
  { id: 'protection', name: 'Protection Equipment' },
  { id: 'accessory', name: 'Accessories' },
];

export default function ProductsList() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const navigate = useNavigate();

  const loadProducts = async () => {
    try {
      setLoading(false);
      const params = {};
      if (selectedCategory !== 'all') params.category = selectedCategory;
      if (search) params.search = search;
      if (statusFilter !== 'all') params.status = statusFilter;

      const res = await warehouseApi.getProducts(params);
      if (res && res.success) {
        setProducts(res.data);
      }
    } catch (err) {
      console.error('Failed to load products:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, [selectedCategory, statusFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadProducts();
  };

  return (
    <PortalLayout
      title="Products & Solar Equipment Catalog"
      subtitle="Manage solar panels, inverters, batteries, structures, cables and accessories"
      actions={
        <Link to="/warehouse/products/new" className="btn-wh-primary">
          <Plus size={16} />
          <span>Add New Product</span>
        </Link>
      }
    >
      {/* Category Tabs */}
      <div className="wh-tabs" style={{ marginBottom: '16px' }}>
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            className={`wh-tab ${selectedCategory === cat.id ? 'active' : ''}`}
            onClick={() => setSelectedCategory(cat.id)}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Filter and Search Bar */}
      <div className="wh-filter-bar">
        <form onSubmit={handleSearchSubmit} className="wh-search-box">
          <Search size={16} style={{ color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Search by SKU, product name, or manufacturer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </form>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <select
            className="wh-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="discontinued">Discontinued</option>
          </select>
        </div>
      </div>

      {/* Products Table Card */}
      <div className="wh-card">
        <div className="wh-table-container">
          <table className="wh-table">
            <thead>
              <tr>
                <th>SKU</th>
                <th>Product Name</th>
                <th>Category</th>
                <th>Manufacturer</th>
                <th>Purchase Price</th>
                <th>Selling Price</th>
                <th>Total Stock</th>
                <th>Min Threshold</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.length === 0 ? (
                <tr>
                  <td colSpan="10" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '36px' }}>
                    {loading ? 'Loading catalog items...' : 'No products found matching filters.'}
                  </td>
                </tr>
              ) : (
                products.map((prod) => {
                  const isLow = (prod.total_stock || 0) <= prod.min_stock_threshold;
                  const isOut = (prod.total_stock || 0) === 0;

                  return (
                    <tr key={prod.id}>
                      <td>
                        <code style={{ fontSize: '0.82rem', color: 'var(--c-blue)', background: 'rgba(56, 189, 248, 0.08)', padding: '2px 6px', borderRadius: '4px' }}>
                          {prod.sku}
                        </code>
                      </td>
                      <td style={{ fontWeight: 600, color: 'var(--text)' }}>
                        <Link to={`/warehouse/products/${prod.id}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                          {prod.name}
                        </Link>
                      </td>
                      <td>
                        <span className="wh-badge wh-badge-blue" style={{ textTransform: 'capitalize' }}>
                          {String((prod.category && typeof prod.category === 'object' ? (prod.category.name || prod.category.code) : prod.category) || prod.category_name || '').replace('_', ' ')}
                        </span>
                      </td>
                      <td>{prod.manufacturer || '-'}</td>
                      <td>₹{(prod.purchase_price || 0).toLocaleString()}</td>
                      <td style={{ fontWeight: 600, color: 'var(--c-green)' }}>
                        ₹{(prod.selling_price || 0).toLocaleString()}
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontWeight: 700, color: isOut ? 'var(--c-red)' : isLow ? 'var(--c-amber-soft)' : 'var(--text-strong)' }}>
                            {prod.total_stock || 0}
                          </span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{prod.unit}</span>
                          {isOut ? (
                            <span className="wh-badge wh-badge-red" style={{ fontSize: '0.68rem', padding: '1px 5px' }}>Out</span>
                          ) : isLow ? (
                            <span className="wh-badge wh-badge-yellow" style={{ fontSize: '0.68rem', padding: '1px 5px' }}>Low</span>
                          ) : null}
                        </div>
                      </td>
                      <td>{prod.min_stock_threshold} {prod.unit}</td>
                      <td>
                        <span className={`wh-badge ${prod.status === 'active' ? 'wh-badge-green' : 'wh-badge-gray'}`}>
                          {prod.status}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <Link
                            to={`/warehouse/products/${prod.id}`}
                            className="btn-wh-secondary"
                            style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                            title="View / Edit Product"
                          >
                            <Edit size={13} />
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
    </PortalLayout>
  );
}
