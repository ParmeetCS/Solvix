import { useCallback, useEffect, useMemo, useState } from 'react';

import PortalLayout from '@/components/PortalLayout';
import { quotationsApi } from '@/services/api';
import {
  Plus,
  Pencil,
  Archive,
  Trash2,
  X,
  AlertTriangle,
  Layers,
  Package,
  Tags,
  RefreshCw,
} from 'lucide-react';
import { formatCurrency, formatNumber } from '@/lib/quotation';
import '../../sales/quotations.css';

const UNITS = ['piece', 'kw', 'kva', 'meter', 'set', 'kg', 'box'];
const ITEM_TYPES = ['product', 'installation', 'service', 'other'];
const SYSTEM_TYPES = ['on-grid', 'off-grid', 'hybrid'];

const EMPTY_PRODUCT = {
  sku: '',
  name: '',
  category_id: '',
  unit: 'piece',
  base_price: 0,
  tax_rate: 0,
  warranty_years: 0,
  item_type: 'product',
  brand: '',
  model_number: '',
  hsn_code: '',
  description: '',
  system_types: [],
  is_active: true,
  is_quotable: true,
};

const EMPTY_PACKAGE = {
  package_code: '',
  name: '',
  system_type: 'on-grid',
  capacity_kw: 3,
  tax_rate: 0,
  description: '',
  warranty_terms: '',
  is_active: true,
  items: [],
};

const EMPTY_CATEGORY = { name: '', code: '', description: '' };

function toProductForm(product) {
  return {
    ...EMPTY_PRODUCT,
    ...product,
    category_id: product.category_id || '',
    brand: product.brand || '',
    model_number: product.model_number || '',
    hsn_code: product.hsn_code || '',
    description: product.description || '',
    system_types: product.system_types || [],
  };
}

function toPackageForm(pkg) {
  return {
    ...EMPTY_PACKAGE,
    ...pkg,
    description: pkg.description || '',
    warranty_terms: pkg.warranty_terms || '',
    items: (pkg.items || []).map((item) => ({
      product_id: item.product_id,
      quantity: item.quantity,
      is_optional: Boolean(item.is_optional),
      notes: item.notes || '',
    })),
  };
}

export default function AdminCatalogue() {
  const [tab, setTab] = useState('products');
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);

  const [productModal, setProductModal] = useState(null);
  const [packageModal, setPackageModal] = useState(null);
  const [categoryModal, setCategoryModal] = useState(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [categoryRes, productRes, packageRes] = await Promise.all([
        quotationsApi.getAdminCategories(),
        quotationsApi.getAdminProducts(),
        quotationsApi.getAdminPackages(),
      ]);
      setCategories(categoryRes.data?.categories || []);
      setProducts(productRes.data?.products || []);
      setPackages(packageRes.data?.packages || []);
    } catch (err) {
      setError(err?.message || 'Failed to load the catalogue.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const run = async (action, message) => {
    try {
      setBusy(true);
      setError(null);
      setNotice(null);
      await action();
      setNotice(message);
      await load();
      return true;
    } catch (err) {
      setError(err?.message || 'Action failed.');
      return false;
    } finally {
      setBusy(false);
    }
  };

  const productCountByCategory = useMemo(() => {
    const map = {};
    for (const product of products) {
      if (!product.category_id) continue;
      map[product.category_id] = (map[product.category_id] || 0) + 1;
    }
    return map;
  }, [products]);

  // ---------------------------------------------------------------- products
  const openNewProduct = () =>
    setProductModal({ editing: null, form: { ...EMPTY_PRODUCT, category_id: categories[0]?.id || '' } });
  const openEditProduct = (product) => setProductModal({ editing: product, form: toProductForm(product) });
  const setProductField = (key, value) =>
    setProductModal((prev) => ({ ...prev, form: { ...prev.form, [key]: value } }));
  const toggleProductSystem = (systemType) =>
    setProductModal((prev) => {
      const current = prev.form.system_types || [];
      return {
        ...prev,
        form: {
          ...prev.form,
          system_types: current.includes(systemType)
            ? current.filter((value) => value !== systemType)
            : [...current, systemType],
        },
      };
    });

  const saveProduct = async (event) => {
    event.preventDefault();
    const form = productModal.form;
    const payload = {
      sku: form.sku,
      name: form.name,
      category_id: form.category_id || null,
      unit: form.unit,
      base_price: Number(form.base_price) || 0,
      tax_rate: Number(form.tax_rate) || 0,
      warranty_years: Number(form.warranty_years) || 0,
      item_type: form.item_type,
      brand: form.brand || null,
      model_number: form.model_number || null,
      hsn_code: form.hsn_code || null,
      description: form.description || null,
      system_types: form.system_types || [],
      is_active: Boolean(form.is_active),
      is_quotable: Boolean(form.is_quotable),
    };
    const ok = productModal.editing
      ? await run(() => quotationsApi.updateProduct(productModal.editing.id, payload), 'Product updated.')
      : await run(() => quotationsApi.createProduct(payload), 'Product created.');
    if (ok) setProductModal(null);
  };

  const archiveProduct = async (product) => {
    if (!window.confirm(`Archive ${product.name}? Existing quotations keep their historical lines.`)) return;
    await run(() => quotationsApi.archiveProduct(product.id), 'Product archived.');
  };

  // ---------------------------------------------------------------- packages
  const openNewPackage = () =>
    setPackageModal({ editing: null, form: { ...EMPTY_PACKAGE, items: [{ product_id: '', quantity: 1, is_optional: false, notes: '' }] } });
  const openEditPackage = (pkg) =>
    setPackageModal({ editing: pkg, form: toPackageForm(pkg) });
  const setPackageField = (key, value) =>
    setPackageModal((prev) => ({ ...prev, form: { ...prev.form, [key]: value } }));
  const updatePackageItem = (index, key, value) =>
    setPackageModal((prev) => ({
      ...prev,
      form: {
        ...prev.form,
        items: prev.form.items.map((item, itemIndex) =>
          itemIndex === index ? { ...item, [key]: value } : item
        ),
      },
    }));
  const addPackageItem = () =>
    setPackageModal((prev) => ({
      ...prev,
      form: {
        ...prev.form,
        items: [...prev.form.items, { product_id: '', quantity: 1, is_optional: false, notes: '' }],
      },
    }));
  const removePackageItem = (index) =>
    setPackageModal((prev) => ({
      ...prev,
      form: { ...prev.form, items: prev.form.items.filter((_, itemIndex) => itemIndex !== index) },
    }));

  const savePackage = async (event) => {
    event.preventDefault();
    const form = packageModal.form;
    const payload = {
      package_code: form.package_code,
      name: form.name,
      system_type: form.system_type,
      capacity_kw: Number(form.capacity_kw),
      tax_rate: Number(form.tax_rate) || 0,
      description: form.description || null,
      warranty_terms: form.warranty_terms || null,
      is_active: Boolean(form.is_active),
      items: form.items
        .filter((item) => item.product_id)
        .map((item) => ({
          product_id: item.product_id,
          quantity: Number(item.quantity) || 1,
          is_optional: Boolean(item.is_optional),
          notes: item.notes || null,
        })),
    };
    if (payload.items.length === 0) {
      setError('A package must contain at least one product.');
      return;
    }
    const ok = packageModal.editing
      ? await run(() => quotationsApi.updatePackage(packageModal.editing.id, payload), 'Package updated.')
      : await run(() => quotationsApi.createPackage(payload), 'Package created.');
    if (ok) setPackageModal(null);
  };

  const archivePackage = async (pkg) => {
    if (!window.confirm(`Archive ${pkg.name}? Existing quotations keep their historical lines.`)) return;
    await run(() => quotationsApi.archivePackage(pkg.id), 'Package archived.');
  };

  // -------------------------------------------------------------- categories
  const openNewCategory = () => setCategoryModal({ editing: null, form: { ...EMPTY_CATEGORY } });
  const openEditCategory = (category) =>
    setCategoryModal({
      editing: category,
      form: { name: category.name, code: category.code, description: category.description || '' },
    });
  const setCategoryField = (key, value) =>
    setCategoryModal((prev) => ({ ...prev, form: { ...prev.form, [key]: value } }));

  const saveCategory = async (event) => {
    event.preventDefault();
    const form = categoryModal.form;
    const payload = { name: form.name, code: form.code || undefined, description: form.description || null };
    const ok = categoryModal.editing
      ? await run(() => quotationsApi.updateCategory(categoryModal.editing.id, payload), 'Category updated.')
      : await run(() => quotationsApi.createCategory(payload), 'Category created.');
    if (ok) setCategoryModal(null);
  };

  const deleteCategory = async (category) => {
    if (!window.confirm(`Delete the category "${category.name}"?`)) return;
    await run(() => quotationsApi.deleteCategory(category.id), 'Category deleted.');
  };

  const activeProducts = products.filter((product) => product.is_active).length;
  const activePackages = packages.filter((pkg) => pkg.is_active).length;

  return (
    <PortalLayout
      title="Product Catalogue"
      subtitle="Products, packages and categories used to build quotations"
      actions={
        <button type="button" className="crm-btn crm-btn-secondary crm-btn-sm" onClick={load} disabled={loading}>
          <RefreshCw size={14} /> Refresh
        </button>
      }
    >
      <>
        <div className="q-stats-grid">
          <div className="q-stat-card">
            <span className="q-stat-label">Products</span>
            <span className="q-stat-value">{activeProducts}</span>
            <span className="q-stat-meta">{products.length} total records</span>
          </div>
          <div className="q-stat-card">
            <span className="q-stat-label">Packages</span>
            <span className="q-stat-value">{activePackages}</span>
            <span className="q-stat-meta">Configurable 1–5 kW templates</span>
          </div>
          <div className="q-stat-card">
            <span className="q-stat-label">Categories</span>
            <span className="q-stat-value">{categories.length}</span>
            <span className="q-stat-meta">Used across the BOM builder</span>
          </div>
          <div className="q-stat-card accent">
            <span className="q-stat-label">Pricing source</span>
            <span className="q-stat-value">Server</span>
            <span className="q-stat-meta">Quotation totals always recalculated</span>
          </div>
        </div>

        {error && (
          <div className="q-alert error">
            <AlertTriangle size={15} style={{ verticalAlign: '-2px', marginRight: 6 }} />
            {error}
          </div>
        )}
        {notice && <div className="q-alert success">{notice}</div>}

        <div className="q-admin-tabs">
          <button
            type="button"
            className={`q-admin-tab ${tab === 'products' ? 'active' : ''}`}
            onClick={() => setTab('products')}
          >
            <Package size={14} style={{ verticalAlign: '-2px', marginRight: 6 }} /> Products
          </button>
          <button
            type="button"
            className={`q-admin-tab ${tab === 'packages' ? 'active' : ''}`}
            onClick={() => setTab('packages')}
          >
            <Layers size={14} style={{ verticalAlign: '-2px', marginRight: 6 }} /> Packages
          </button>
          <button
            type="button"
            className={`q-admin-tab ${tab === 'categories' ? 'active' : ''}`}
            onClick={() => setTab('categories')}
          >
            <Tags size={14} style={{ verticalAlign: '-2px', marginRight: 6 }} /> Categories
          </button>
        </div>

        {loading ? (
          <div className="q-loading">Loading catalogue…</div>
        ) : tab === 'products' ? (
          <section className="q-panel">
            <div className="q-panel-header">
              <span className="q-panel-title">Product catalogue</span>
              <button type="button" className="crm-btn crm-btn-primary crm-btn-sm" onClick={openNewProduct}>
                <Plus size={14} /> New product
              </button>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table className="q-line-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Category</th>
                    <th>Unit</th>
                    <th className="q-num">Base price</th>
                    <th className="q-num">Tax</th>
                    <th>Warranty</th>
                    <th>Systems</th>
                    <th>Status</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {products.map((product) => (
                    <tr key={product.id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{product.name}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                          {product.sku}
                          {product.brand ? ` · ${product.brand}` : ''}
                        </div>
                      </td>
                      <td>{product.category?.name || '—'}</td>
                      <td>{product.unit}</td>
                      <td className="q-num">{formatCurrency(product.base_price)}</td>
                      <td className="q-num">{formatNumber(product.tax_rate, 2)}%</td>
                      <td>{product.warranty_years ? `${product.warranty_years} yr` : '—'}</td>
                      <td style={{ textTransform: 'capitalize' }}>
                        {(product.system_types || []).length > 0
                          ? product.system_types.join(', ')
                          : 'All'}
                      </td>
                      <td>
                        <span className={`q-badge ${product.is_active ? 'success' : 'muted'}`}>
                          {product.is_active ? 'Active' : 'Archived'}
                        </span>
                        {!product.is_quotable && <span className="q-badge muted" style={{ marginLeft: 4 }}>Not quotable</span>}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                          <button type="button" className="q-icon-btn" onClick={() => openEditProduct(product)} title="Edit">
                            <Pencil size={14} />
                          </button>
                          {product.is_active && (
                            <button
                              type="button"
                              className="q-icon-btn"
                              onClick={() => archiveProduct(product)}
                              title="Archive"
                            >
                              <Archive size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {products.length === 0 && (
                    <tr>
                      <td colSpan={9} className="q-empty">No products yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        ) : tab === 'packages' ? (
          <section className="q-panel">
            <div className="q-panel-header">
              <span className="q-panel-title">Configurable packages</span>
              <button type="button" className="crm-btn crm-btn-primary crm-btn-sm" onClick={openNewPackage}>
                <Plus size={14} /> New package
              </button>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table className="q-line-table">
                <thead>
                  <tr>
                    <th>Package</th>
                    <th>System</th>
                    <th className="q-num">Capacity</th>
                    <th className="q-num">Components</th>
                    <th className="q-num">Tax</th>
                    <th>Status</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {packages.map((pkg) => (
                    <tr key={pkg.id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{pkg.name}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>{pkg.package_code}</div>
                      </td>
                      <td style={{ textTransform: 'capitalize' }}>{pkg.system_type}</td>
                      <td className="q-num">{pkg.capacity_kw} kW</td>
                      <td className="q-num">{pkg.items?.length || 0}</td>
                      <td className="q-num">{formatNumber(pkg.tax_rate, 2)}%</td>
                      <td>
                        <span className={`q-badge ${pkg.is_active ? 'success' : 'muted'}`}>
                          {pkg.is_active ? 'Active' : 'Archived'}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                          <button type="button" className="q-icon-btn" onClick={() => openEditPackage(pkg)} title="Edit">
                            <Pencil size={14} />
                          </button>
                          {pkg.is_active && (
                            <button type="button" className="q-icon-btn" onClick={() => archivePackage(pkg)} title="Archive">
                              <Archive size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {packages.length === 0 && (
                    <tr>
                      <td colSpan={7} className="q-empty">No packages yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        ) : (
          <section className="q-panel">
            <div className="q-panel-header">
              <span className="q-panel-title">Product categories</span>
              <button type="button" className="crm-btn crm-btn-primary crm-btn-sm" onClick={openNewCategory}>
                <Plus size={14} /> New category
              </button>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table className="q-line-table">
                <thead>
                  <tr>
                    <th>Category</th>
                    <th>Code</th>
                    <th>Description</th>
                    <th className="q-num">Products</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {categories.map((category) => (
                    <tr key={category.id}>
                      <td style={{ fontWeight: 600 }}>{category.name}</td>
                      <td>{category.code}</td>
                      <td>{category.description || '—'}</td>
                      <td className="q-num">{productCountByCategory[category.id] || 0}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                          <button type="button" className="q-icon-btn" onClick={() => openEditCategory(category)} title="Edit">
                            <Pencil size={14} />
                          </button>
                          <button type="button" className="q-icon-btn" onClick={() => deleteCategory(category)} title="Delete">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {categories.length === 0 && (
                    <tr>
                      <td colSpan={5} className="q-empty">No categories yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </>

      {productModal && (
        <div className="q-modal-backdrop" role="dialog" aria-modal="true">
          <div className="q-modal">
            <div className="q-modal-header">
              <h3>{productModal.editing ? 'Edit product' : 'New product'}</h3>
              <button type="button" className="q-icon-btn" onClick={() => setProductModal(null)}>
                <X size={15} />
              </button>
            </div>
            <form className="q-panel-body" onSubmit={saveProduct}>
              <div className="q-grid-2">
                <div className="q-field">
                  <label>SKU</label>
                  <input
                    className="q-input"
                    required
                    value={productModal.form.sku}
                    onChange={(event) => setProductField('sku', event.target.value)}
                  />
                </div>
                <div className="q-field">
                  <label>Name</label>
                  <input
                    className="q-input"
                    required
                    value={productModal.form.name}
                    onChange={(event) => setProductField('name', event.target.value)}
                  />
                </div>
              </div>
              <div className="q-grid-3">
                <div className="q-field">
                  <label>Category</label>
                  <select
                    className="q-select"
                    value={productModal.form.category_id}
                    onChange={(event) => setProductField('category_id', event.target.value)}
                  >
                    <option value="">Uncategorised</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="q-field">
                  <label>Unit</label>
                  <select
                    className="q-select"
                    value={productModal.form.unit}
                    onChange={(event) => setProductField('unit', event.target.value)}
                  >
                    {UNITS.map((unit) => (
                      <option key={unit} value={unit}>{unit}</option>
                    ))}
                  </select>
                </div>
                <div className="q-field">
                  <label>Item type</label>
                  <select
                    className="q-select"
                    value={productModal.form.item_type}
                    onChange={(event) => setProductField('item_type', event.target.value)}
                  >
                    {ITEM_TYPES.map((type) => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="q-grid-3">
                <div className="q-field">
                  <label>Base price</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="q-input"
                    value={productModal.form.base_price}
                    onChange={(event) => setProductField('base_price', event.target.value)}
                  />
                </div>
                <div className="q-field">
                  <label>Tax rate (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    className="q-input"
                    value={productModal.form.tax_rate}
                    onChange={(event) => setProductField('tax_rate', event.target.value)}
                  />
                </div>
                <div className="q-field">
                  <label>Warranty (years)</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    className="q-input"
                    value={productModal.form.warranty_years}
                    onChange={(event) => setProductField('warranty_years', event.target.value)}
                  />
                </div>
              </div>
              <div className="q-grid-3">
                <div className="q-field">
                  <label>Brand</label>
                  <input
                    className="q-input"
                    value={productModal.form.brand}
                    onChange={(event) => setProductField('brand', event.target.value)}
                  />
                </div>
                <div className="q-field">
                  <label>Model number</label>
                  <input
                    className="q-input"
                    value={productModal.form.model_number}
                    onChange={(event) => setProductField('model_number', event.target.value)}
                  />
                </div>
                <div className="q-field">
                  <label>HSN code</label>
                  <input
                    className="q-input"
                    value={productModal.form.hsn_code}
                    onChange={(event) => setProductField('hsn_code', event.target.value)}
                  />
                </div>
              </div>
              <div className="q-field">
                <label>Description</label>
                <textarea
                  className="q-textarea"
                  value={productModal.form.description}
                  onChange={(event) => setProductField('description', event.target.value)}
                />
              </div>
              <div className="q-field">
                <label>Applicable system types</label>
                <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                  {SYSTEM_TYPES.map((systemType) => (
                    <label key={systemType} style={{ display: 'flex', gap: 6, alignItems: 'center', color: 'var(--text-soft)', fontSize: '0.84rem' }}>
                      <input
                        type="checkbox"
                        checked={(productModal.form.system_types || []).includes(systemType)}
                        onChange={() => toggleProductSystem(systemType)}
                      />
                      {systemType}
                    </label>
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                <label style={{ display: 'flex', gap: 6, alignItems: 'center', color: 'var(--text-soft)', fontSize: '0.84rem' }}>
                  <input
                    type="checkbox"
                    checked={productModal.form.is_active}
                    onChange={(event) => setProductField('is_active', event.target.checked)}
                  />
                  Active
                </label>
                <label style={{ display: 'flex', gap: 6, alignItems: 'center', color: 'var(--text-soft)', fontSize: '0.84rem' }}>
                  <input
                    type="checkbox"
                    checked={productModal.form.is_quotable}
                    onChange={(event) => setProductField('is_quotable', event.target.checked)}
                  />
                  Available for quotations
                </label>
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button type="button" className="crm-btn crm-btn-secondary" onClick={() => setProductModal(null)}>
                  Cancel
                </button>
                <button type="submit" className="crm-btn crm-btn-primary" disabled={busy}>
                  {busy ? 'Saving…' : 'Save product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {packageModal && (
        <div className="q-modal-backdrop" role="dialog" aria-modal="true">
          <div className="q-modal">
            <div className="q-modal-header">
              <h3>{packageModal.editing ? 'Edit package' : 'New package'}</h3>
              <button type="button" className="q-icon-btn" onClick={() => setPackageModal(null)}>
                <X size={15} />
              </button>
            </div>
            <form className="q-panel-body" onSubmit={savePackage}>
              <div className="q-grid-2">
                <div className="q-field">
                  <label>Package code</label>
                  <input
                    className="q-input"
                    required
                    value={packageModal.form.package_code}
                    onChange={(event) => setPackageField('package_code', event.target.value)}
                  />
                </div>
                <div className="q-field">
                  <label>Name</label>
                  <input
                    className="q-input"
                    required
                    value={packageModal.form.name}
                    onChange={(event) => setPackageField('name', event.target.value)}
                  />
                </div>
              </div>
              <div className="q-grid-3">
                <div className="q-field">
                  <label>System type</label>
                  <select
                    className="q-select"
                    value={packageModal.form.system_type}
                    onChange={(event) => setPackageField('system_type', event.target.value)}
                  >
                    {SYSTEM_TYPES.map((systemType) => (
                      <option key={systemType} value={systemType}>{systemType}</option>
                    ))}
                  </select>
                </div>
                <div className="q-field">
                  <label>Capacity (kW)</label>
                  <input
                    type="number"
                    min="1"
                    max="5"
                    step="0.5"
                    className="q-input"
                    value={packageModal.form.capacity_kw}
                    onChange={(event) => setPackageField('capacity_kw', event.target.value)}
                  />
                </div>
                <div className="q-field">
                  <label>Tax rate (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    className="q-input"
                    value={packageModal.form.tax_rate}
                    onChange={(event) => setPackageField('tax_rate', event.target.value)}
                  />
                </div>
              </div>
              <div className="q-field">
                <label>Description</label>
                <textarea
                  className="q-textarea"
                  value={packageModal.form.description}
                  onChange={(event) => setPackageField('description', event.target.value)}
                />
              </div>
              <div className="q-field">
                <label>Warranty terms</label>
                <textarea
                  className="q-textarea"
                  value={packageModal.form.warranty_terms}
                  onChange={(event) => setPackageField('warranty_terms', event.target.value)}
                />
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span className="q-label">Components</span>
                  <button type="button" className="crm-btn crm-btn-secondary crm-btn-sm" onClick={addPackageItem}>
                    <Plus size={14} /> Add component
                  </button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {packageModal.form.items.map((item, index) => (
                    <div key={index} style={{ display: 'grid', gridTemplateColumns: '1fr 90px auto auto', gap: 8, alignItems: 'center' }}>
                      <select
                        className="q-select"
                        value={item.product_id}
                        onChange={(event) => updatePackageItem(index, 'product_id', event.target.value)}
                      >
                        <option value="">Select a product…</option>
                        {products.filter((product) => product.is_active).map((product) => (
                          <option key={product.id} value={product.id}>
                            {product.name} ({product.sku})
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        className="q-input"
                        value={item.quantity}
                        onChange={(event) => updatePackageItem(index, 'quantity', event.target.value)}
                      />
                      <label style={{ display: 'flex', gap: 5, alignItems: 'center', color: 'var(--text-muted)', fontSize: '0.76rem' }}>
                        <input
                          type="checkbox"
                          checked={item.is_optional}
                          onChange={(event) => updatePackageItem(index, 'is_optional', event.target.checked)}
                        />
                        Optional
                      </label>
                      <button type="button" className="q-icon-btn" onClick={() => removePackageItem(index)}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                  {packageModal.form.items.length === 0 && (
                    <div className="q-hint">Add at least one component to this package.</div>
                  )}
                </div>
              </div>

              <label style={{ display: 'flex', gap: 6, alignItems: 'center', color: 'var(--text-soft)', fontSize: '0.84rem' }}>
                <input
                  type="checkbox"
                  checked={packageModal.form.is_active}
                  onChange={(event) => setPackageField('is_active', event.target.checked)}
                />
                Active
              </label>

              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button type="button" className="crm-btn crm-btn-secondary" onClick={() => setPackageModal(null)}>
                  Cancel
                </button>
                <button type="submit" className="crm-btn crm-btn-primary" disabled={busy}>
                  {busy ? 'Saving…' : 'Save package'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {categoryModal && (
        <div className="q-modal-backdrop" role="dialog" aria-modal="true">
          <div className="q-modal" style={{ maxWidth: 520 }}>
            <div className="q-modal-header">
              <h3>{categoryModal.editing ? 'Edit category' : 'New category'}</h3>
              <button type="button" className="q-icon-btn" onClick={() => setCategoryModal(null)}>
                <X size={15} />
              </button>
            </div>
            <form className="q-panel-body" onSubmit={saveCategory}>
              <div className="q-field">
                <label>Name</label>
                <input
                  className="q-input"
                  required
                  value={categoryModal.form.name}
                  onChange={(event) => setCategoryField('name', event.target.value)}
                />
              </div>
              <div className="q-field">
                <label>Code (optional)</label>
                <input
                  className="q-input"
                  placeholder="Generated from the name when left blank"
                  value={categoryModal.form.code}
                  onChange={(event) => setCategoryField('code', event.target.value)}
                />
              </div>
              <div className="q-field">
                <label>Description</label>
                <textarea
                  className="q-textarea"
                  value={categoryModal.form.description}
                  onChange={(event) => setCategoryField('description', event.target.value)}
                />
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button type="button" className="crm-btn crm-btn-secondary" onClick={() => setCategoryModal(null)}>
                  Cancel
                </button>
                <button type="submit" className="crm-btn crm-btn-primary" disabled={busy}>
                  {busy ? 'Saving…' : 'Save category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PortalLayout>
  );
}
