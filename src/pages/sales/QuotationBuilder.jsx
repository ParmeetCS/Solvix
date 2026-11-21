import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import SalesLayout from './SalesLayout';
import { quotationsApi, salesApi } from '@/services/api';
import {
  ArrowLeft,
  Save,
  Send,
  Plus,
  Trash2,
  Package,
  Search,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import { calculatePreviewTotals, formatCurrency, formatNumber } from '@/lib/quotation';

function isoDate(offsetDays = 0) {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}

const EMPTY_FORM = {
  customer_id: '',
  lead_id: '',
  site_survey_id: '',
  package_id: '',
  system_type: 'on-grid',
  system_capacity_kw: 3,
  validity_date: isoDate(30),
  tax_rate: 0,
  discount_type: 'fixed',
  discount_value: 0,
  installation_charges: 0,
  other_charges: 0,
  payment_terms: '',
  warranty_terms: '',
  terms_and_conditions: '',
  customer_notes: '',
  internal_notes: '',
};

function newManualLine(taxRate = 0) {
  return {
    product_id: null,
    line_item: '',
    quantity: 1,
    unit_price: 0,
    tax_rate: taxRate,
    item_type: 'other',
    unit: 'set',
    hsn_code: '',
    notes: '',
  };
}

export default function QuotationBuilder() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [form, setForm] = useState({
    ...EMPTY_FORM,
    customer_id: searchParams.get('customer_id') || '',
    lead_id: searchParams.get('lead_id') || '',
  });
  const [items, setItems] = useState([]);
  const [catalogue, setCatalogue] = useState({ categories: [], products: [], packages: [] });
  const [customers, setCustomers] = useState([]);
  const [leads, setLeads] = useState([]);
  const [surveys, setSurveys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [productSearch, setProductSearch] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError(null);
        const [catalogueRes, customersRes, leadsRes, surveysRes] = await Promise.all([
          quotationsApi.getCatalogue(),
          salesApi.getCustomers(),
          salesApi.getLeads({ limit: 100 }),
          quotationsApi.getSurveys(),
        ]);
        if (cancelled) return;

        setCatalogue(catalogueRes.data || { categories: [], products: [], packages: [] });
        setCustomers(Array.isArray(customersRes.data) ? customersRes.data : []);
        setLeads(leadsRes.data?.leads || []);
        setSurveys(surveysRes.data?.surveys || []);

        if (isEdit) {
          const quotationRes = await quotationsApi.getQuotation(id);
          if (cancelled) return;
          const bundle = quotationRes.data || {};
          const quotation = bundle.quotation || {};
          setForm({
            customer_id: quotation.customer_id || '',
            lead_id: quotation.lead_id || '',
            site_survey_id: quotation.site_survey_id || '',
            package_id: quotation.package_id || '',
            system_type: quotation.system_type || 'on-grid',
            system_capacity_kw: quotation.system_capacity_kw ?? 3,
            validity_date: quotation.validity_date || isoDate(30),
            tax_rate: quotation.tax_rate ?? 0,
            discount_type: quotation.discount_type || 'fixed',
            discount_value: quotation.discount_value ?? 0,
            installation_charges: quotation.installation_charges ?? 0,
            other_charges: quotation.other_charges ?? 0,
            payment_terms: quotation.payment_terms || '',
            warranty_terms: quotation.warranty_terms || '',
            terms_and_conditions: quotation.terms_and_conditions || '',
            customer_notes: quotation.customer_notes || '',
            internal_notes: quotation.internal_notes || '',
          });
          setItems(
            (bundle.items || []).map((item) => ({
              product_id: item.product_id,
              line_item: item.line_item,
              quantity: item.quantity,
              unit_price: item.unit_price,
              tax_rate: item.tax_rate ?? 0,
              item_type: item.item_type || 'product',
              unit: item.unit || 'piece',
              hsn_code: item.hsn_code || '',
              notes: item.notes || '',
            }))
          );
        }
      } catch (err) {
        if (!cancelled) setError(err?.message || 'Failed to load quotation workspace.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [id, isEdit]);

  const updateForm = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const leadsForCustomer = useMemo(() => {
    if (!form.customer_id) return leads;
    return leads.filter((lead) => !lead.customer_id || lead.customer_id === form.customer_id);
  }, [leads, form.customer_id]);

  const surveysForSelection = useMemo(() => {
    return surveys.filter((survey) => {
      if (form.lead_id && survey.lead_id && survey.lead_id !== form.lead_id) return false;
      if (form.customer_id && survey.customer_id && survey.customer_id !== form.customer_id) return false;
      return true;
    });
  }, [surveys, form.lead_id, form.customer_id]);

  const productsForPicker = useMemo(() => {
    const term = productSearch.trim().toLowerCase();
    return (catalogue.products || []).filter((product) => {
      if (!product.is_active || !product.is_quotable) return false;
      if (product.system_types?.length && !product.system_types.includes(form.system_type)) return false;
      if (!term) return true;
      return [product.name, product.sku, product.brand]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term));
    });
  }, [catalogue.products, form.system_type, productSearch]);

  const totals = useMemo(
    () =>
      calculatePreviewTotals({
        items,
        discountType: form.discount_type,
        discountValue: form.discount_value,
        taxRate: form.tax_rate,
      }),
    [items, form.discount_type, form.discount_value, form.tax_rate]
  );

  const handleCustomerChange = (customerId) => {
    setForm((prev) => {
      const lead = leads.find((row) => row.id === prev.lead_id);
      const keepLead = !customerId || !lead?.customer_id || lead.customer_id === customerId;
      return {
        ...prev,
        customer_id: customerId,
        lead_id: keepLead ? prev.lead_id : '',
        site_survey_id: '',
      };
    });
  };

  const handleLeadChange = (leadId) => {
    const lead = leads.find((row) => row.id === leadId);
    setForm((prev) => ({
      ...prev,
      lead_id: leadId,
      customer_id: lead?.customer_id || prev.customer_id,
      site_survey_id: '',
    }));
  };

  const handleSystemTypeChange = (value) => {
    setForm((prev) => {
      const pkg = catalogue.packages.find((row) => row.id === prev.package_id);
      const keepPackage =
        pkg && pkg.system_type === value && Number(pkg.capacity_kw) === Number(prev.system_capacity_kw);
      return { ...prev, system_type: value, package_id: keepPackage ? prev.package_id : '' };
    });
  };

  const handleCapacityChange = (value) => {
    setForm((prev) => {
      const pkg = catalogue.packages.find((row) => row.id === prev.package_id);
      const keepPackage =
        pkg && pkg.system_type === prev.system_type && Number(pkg.capacity_kw) === Number(value);
      return { ...prev, system_capacity_kw: value, package_id: keepPackage ? prev.package_id : '' };
    });
  };

  const handlePackageChange = (packageId) => {
    if (!packageId) {
      updateForm('package_id', '');
      return;
    }
    const pkg = catalogue.packages.find((row) => row.id === packageId);
    if (!pkg) return;
    if (items.length > 0 && !window.confirm('Replace the current bill of materials with this package?')) {
      return;
    }
    setForm((prev) => ({
      ...prev,
      package_id: pkg.id,
      system_type: pkg.system_type,
      system_capacity_kw: pkg.capacity_kw,
      tax_rate: pkg.tax_rate ?? prev.tax_rate,
    }));
    setItems(
      (pkg.items || []).map((component) => ({
        product_id: component.product_id,
        line_item: component.product?.name || 'Package component',
        quantity: component.quantity,
        unit_price: component.product?.base_price ?? 0,
        tax_rate: component.product?.tax_rate ?? pkg.tax_rate ?? 0,
        item_type: component.product?.item_type || 'product',
        unit: component.product?.unit || 'piece',
        hsn_code: '',
        notes: component.notes || '',
      }))
    );
  };

  const addProduct = (product) => {
    setItems((prev) => [
      ...prev,
      {
        product_id: product.id,
        line_item: product.name,
        quantity: 1,
        unit_price: product.base_price ?? 0,
        tax_rate: product.tax_rate ?? form.tax_rate ?? 0,
        item_type: product.item_type || 'product',
        unit: product.unit || 'piece',
        hsn_code: product.hsn_code || '',
        notes: '',
      },
    ]);
  };

  const updateItem = (index, key, value) => {
    setItems((prev) =>
      prev.map((item, itemIndex) => (itemIndex === index ? { ...item, [key]: value } : item))
    );
  };

  const removeItem = (index) => {
    setItems((prev) => prev.filter((_, itemIndex) => itemIndex !== index));
  };

  const validate = () => {
    if (!form.customer_id) return 'Select a customer.';
    if (!form.lead_id) return 'Select the lead this quotation belongs to.';
    if (!(Number(form.system_capacity_kw) > 0)) return 'Enter a system capacity greater than zero.';
    if (items.length === 0 && !(Number(form.installation_charges) > 0) && !(Number(form.other_charges) > 0)) {
      return 'Add at least one product, package or charge.';
    }
    const blankLine = items.find((item) => !item.product_id && !String(item.line_item || '').trim());
    if (blankLine) return 'Every manual line needs a description.';
    return null;
  };

  const handleSave = async (submitForApproval = false) => {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    try {
      setSaving(true);
      setError(null);
      const payload = {
        customer_id: form.customer_id,
        lead_id: form.lead_id,
        site_survey_id: form.site_survey_id || null,
        package_id: form.package_id || null,
        system_type: form.system_type,
        system_capacity_kw: Number(form.system_capacity_kw),
        validity_date: form.validity_date,
        tax_rate: Number(form.tax_rate) || 0,
        discount_type: form.discount_type,
        discount_value: Number(form.discount_value) || 0,
        installation_charges: Number(form.installation_charges) || 0,
        other_charges: Number(form.other_charges) || 0,
        payment_terms: form.payment_terms || null,
        warranty_terms: form.warranty_terms || null,
        terms_and_conditions: form.terms_and_conditions || null,
        customer_notes: form.customer_notes || null,
        internal_notes: form.internal_notes || null,
        items: items.map((item) => ({
          product_id: item.product_id || null,
          line_item: item.line_item,
          quantity: Number(item.quantity) || 0,
          unit_price: Number(item.unit_price) || 0,
          tax_rate: Number(item.tax_rate) || 0,
          item_type: item.item_type,
          unit: item.unit,
          hsn_code: item.hsn_code || null,
          notes: item.notes || null,
        })),
      };

      let savedBundle;
      if (isEdit) {
        const updated = await quotationsApi.updateQuotation(id, payload);
        savedBundle = updated.data;
        if (submitForApproval && savedBundle?.quotation?.status === 'draft') {
          const submitted = await quotationsApi.submitQuotation(id, {});
          savedBundle = submitted.data;
        }
      } else {
        const created = await quotationsApi.createQuotation({
          ...payload,
          submit_for_approval: submitForApproval,
        });
        savedBundle = created.data;
      }

      const quotationId = savedBundle?.quotation?.id || id;
      navigate(`/sales/quotations/${quotationId}`);
    } catch (err) {
      setError(err?.message || 'Failed to save quotation.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setSaving(false);
    }
  };

  const selectedPackage = catalogue.packages.find((row) => row.id === form.package_id);

  return (
    <SalesLayout
      title={isEdit ? 'Edit Quotation' : 'New Quotation'}
      subtitle="Configure the system, build the bill of materials and let the server price it"
      actions={
        <div className="q-page-actions">
          <Link to={isEdit ? `/sales/quotations/${id}` : '/sales/quotations'} className="crm-btn crm-btn-secondary crm-btn-sm">
            <ArrowLeft size={15} /> Back
          </Link>
          <button
            type="button"
            className="crm-btn crm-btn-secondary crm-btn-sm"
            onClick={() => handleSave(false)}
            disabled={saving}
          >
            <Save size={15} /> {saving ? 'Saving…' : 'Save Draft'}
          </button>
          <button
            type="button"
            className="crm-btn crm-btn-primary crm-btn-sm"
            onClick={() => handleSave(true)}
            disabled={saving}
          >
            <Send size={15} /> Save &amp; Submit
          </button>
        </div>
      }
    >
      {error && (
        <div className="q-alert error">
          <AlertTriangle size={15} style={{ verticalAlign: '-2px', marginRight: 6 }} />
          {error}
        </div>
      )}

      {loading ? (
        <div className="q-loading">Loading quotation workspace…</div>
      ) : (
        <div className="q-builder-grid">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <section className="q-panel">
              <div className="q-panel-header">
                <span className="q-panel-title">Customer &amp; system</span>
              </div>
              <div className="q-panel-body">
                <div className="q-grid-2">
                  <div className="q-field">
                    <label htmlFor="customer">Customer</label>
                    <select
                      id="customer"
                      className="q-select"
                      value={form.customer_id}
                      onChange={(event) => handleCustomerChange(event.target.value)}
                    >
                      <option value="">Select a customer…</option>
                      {customers.map((customer) => (
                        <option key={customer.id} value={customer.id}>
                          {customer.company_name || customer.contact_name} ({customer.customer_code})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="q-field">
                    <label htmlFor="lead">Lead</label>
                    <select
                      id="lead"
                      className="q-select"
                      value={form.lead_id}
                      onChange={(event) => handleLeadChange(event.target.value)}
                    >
                      <option value="">Select the source lead…</option>
                      {leadsForCustomer.map((lead) => (
                        <option key={lead.id} value={lead.id}>
                          {lead.lead_code} — {lead.customer_name || 'Enquiry'} ({lead.status})
                        </option>
                      ))}
                    </select>
                    {leadsForCustomer.length === 0 && (
                      <span className="q-hint">No leads are available for this customer yet.</span>
                    )}
                  </div>
                </div>

                <div className="q-grid-3">
                  <div className="q-field">
                    <label htmlFor="system-type">System type</label>
                    <select
                      id="system-type"
                      className="q-select"
                      value={form.system_type}
                      onChange={(event) => handleSystemTypeChange(event.target.value)}
                    >
                      <option value="on-grid">On-grid</option>
                      <option value="off-grid">Off-grid</option>
                      <option value="hybrid">Hybrid</option>
                    </select>
                  </div>
                  <div className="q-field">
                    <label htmlFor="capacity">Capacity (kW)</label>
                    <input
                      id="capacity"
                      type="number"
                      min="0.1"
                      step="0.1"
                      className="q-input"
                      value={form.system_capacity_kw}
                      onChange={(event) => handleCapacityChange(event.target.value)}
                    />
                  </div>
                  <div className="q-field">
                    <label htmlFor="validity">Valid until</label>
                    <input
                      id="validity"
                      type="date"
                      className="q-input"
                      value={form.validity_date}
                      onChange={(event) => updateForm('validity_date', event.target.value)}
                    />
                  </div>
                </div>

                <div className="q-grid-2">
                  <div className="q-field">
                    <label htmlFor="package">Package template</label>
                    <select
                      id="package"
                      className="q-select"
                      value={form.package_id}
                      onChange={(event) => handlePackageChange(event.target.value)}
                    >
                      <option value="">Custom bill of materials</option>
                      {(catalogue.packages || []).map((pkg) => (
                        <option key={pkg.id} value={pkg.id}>
                          {pkg.name} — {pkg.capacity_kw} kW {pkg.system_type}
                        </option>
                      ))}
                    </select>
                    {selectedPackage && (
                      <span className="q-hint">
                        {selectedPackage.package_code} · {selectedPackage.items?.length || 0} components
                      </span>
                    )}
                  </div>
                  <div className="q-field">
                    <label htmlFor="survey">Approved site survey</label>
                    <select
                      id="survey"
                      className="q-select"
                      value={form.site_survey_id}
                      onChange={(event) => updateForm('site_survey_id', event.target.value)}
                    >
                      <option value="">No survey linked</option>
                      {surveysForSelection.map((survey) => (
                        <option key={survey.id} value={survey.id}>
                          {survey.survey_code} — {survey.roof_area_sqm ? `${survey.roof_area_sqm} sqm` : 'survey'}
                        </option>
                      ))}
                    </select>
                    <span className="q-hint">Only approved surveys can be linked.</span>
                  </div>
                </div>
              </div>
            </section>

            <section className="q-panel">
              <div className="q-panel-header">
                <span className="q-panel-title">Bill of materials</span>
                <button
                  type="button"
                  className="crm-btn crm-btn-secondary crm-btn-sm"
                  onClick={() => setItems((prev) => [...prev, newManualLine(form.tax_rate)])}
                >
                  <Plus size={14} /> Custom line
                </button>
              </div>
              <div className="q-panel-body" style={{ gap: 18 }}>
                {items.length === 0 ? (
                  <div className="q-empty" style={{ padding: '20px 10px' }}>
                    <Package size={24} style={{ opacity: 0.4, marginBottom: 8 }} />
                    <div>Select a package or add catalogue products below.</div>
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table className="q-line-table">
                      <thead>
                        <tr>
                          <th>Description</th>
                          <th>Qty</th>
                          <th>Unit</th>
                          <th>Rate</th>
                          <th>Tax %</th>
                          <th className="q-num">Line total</th>
                          <th />
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((item, index) => {
                          const lineTotal = (Number(item.quantity) || 0) * (Number(item.unit_price) || 0);
                          return (
                            <tr key={`${item.product_id || 'manual'}-${index}`}>
                              <td className="q-line-desc">
                                {item.product_id ? (
                                  <>
                                    <div style={{ fontWeight: 600 }}>{item.line_item}</div>
                                    <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Catalogue product</div>
                                  </>
                                ) : (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                    <input
                                      type="text"
                                      placeholder="Charge description"
                                      value={item.line_item}
                                      onChange={(event) => updateItem(index, 'line_item', event.target.value)}
                                    />
                                    <select
                                      value={item.item_type}
                                      onChange={(event) => updateItem(index, 'item_type', event.target.value)}
                                    >
                                      <option value="installation">Installation</option>
                                      <option value="service">Service</option>
                                      <option value="other">Other</option>
                                    </select>
                                  </div>
                                )}
                              </td>
                              <td style={{ width: 80 }}>
                                <input
                                  type="number"
                                  min="0.01"
                                  step="0.01"
                                  value={item.quantity}
                                  onChange={(event) => updateItem(index, 'quantity', event.target.value)}
                                />
                              </td>
                              <td style={{ width: 90 }}>
                                <select
                                  value={item.unit || 'piece'}
                                  onChange={(event) => updateItem(index, 'unit', event.target.value)}
                                >
                                  <option value="piece">piece</option>
                                  <option value="kw">kw</option>
                                  <option value="kva">kva</option>
                                  <option value="meter">meter</option>
                                  <option value="set">set</option>
                                  <option value="kg">kg</option>
                                  <option value="box">box</option>
                                </select>
                              </td>
                              <td style={{ width: 120 }}>
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={item.unit_price}
                                  onChange={(event) => updateItem(index, 'unit_price', event.target.value)}
                                />
                              </td>
                              <td style={{ width: 80 }}>
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={item.tax_rate}
                                  onChange={(event) => updateItem(index, 'tax_rate', event.target.value)}
                                />
                              </td>
                              <td className="q-num">{formatCurrency(lineTotal)}</td>
                              <td className="q-line-actions">
                                <button type="button" className="q-icon-btn" onClick={() => removeItem(index)} title="Remove line">
                                  <Trash2 size={14} />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                <div>
                  <div className="q-label" style={{ marginBottom: 8 }}>Add catalogue products</div>
                  <div className="q-search" style={{ marginBottom: 10 }}>
                    <Search size={15} style={{ color: '#94a3b8' }} />
                    <input
                      type="text"
                      placeholder="Search by name, SKU or brand…"
                      value={productSearch}
                      onChange={(event) => setProductSearch(event.target.value)}
                    />
                  </div>
                  <div className="q-product-picker">
                    {productsForPicker.slice(0, 60).map((product) => (
                      <button
                        key={product.id}
                        type="button"
                        className="q-product-chip"
                        onClick={() => addProduct(product)}
                      >
                        <b>{product.name}</b>
                        <small>
                          {product.sku} · {formatCurrency(product.base_price)} / {product.unit}
                        </small>
                        <small>
                          {product.category?.name || product.item_type}
                          {product.tax_rate ? ` · ${formatNumber(product.tax_rate)}% tax` : ''}
                        </small>
                      </button>
                    ))}
                    {productsForPicker.length === 0 && (
                      <div className="q-hint">No products match this system type or search.</div>
                    )}
                  </div>
                </div>
              </div>
            </section>

            <section className="q-panel">
              <div className="q-panel-header">
                <span className="q-panel-title">Commercial terms</span>
              </div>
              <div className="q-panel-body">
                <div className="q-grid-4">
                  <div className="q-field">
                    <label htmlFor="discount-type">Discount type</label>
                    <select
                      id="discount-type"
                      className="q-select"
                      value={form.discount_type}
                      onChange={(event) => updateForm('discount_type', event.target.value)}
                    >
                      <option value="fixed">Fixed amount</option>
                      <option value="percentage">Percentage</option>
                    </select>
                  </div>
                  <div className="q-field">
                    <label htmlFor="discount-value">Discount value</label>
                    <input
                      id="discount-value"
                      type="number"
                      min="0"
                      step="0.01"
                      className="q-input"
                      value={form.discount_value}
                      onChange={(event) => updateForm('discount_value', event.target.value)}
                    />
                  </div>
                  <div className="q-field">
                    <label htmlFor="installation">Installation charge</label>
                    <input
                      id="installation"
                      type="number"
                      min="0"
                      step="0.01"
                      className="q-input"
                      value={form.installation_charges}
                      onChange={(event) => updateForm('installation_charges', event.target.value)}
                    />
                  </div>
                  <div className="q-field">
                    <label htmlFor="other-charges">Other charges</label>
                    <input
                      id="other-charges"
                      type="number"
                      min="0"
                      step="0.01"
                      className="q-input"
                      value={form.other_charges}
                      onChange={(event) => updateForm('other_charges', event.target.value)}
                    />
                  </div>
                </div>
                <div className="q-grid-2">
                  <div className="q-field">
                    <label htmlFor="tax-rate">Default tax rate (%)</label>
                    <input
                      id="tax-rate"
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      className="q-input"
                      value={form.tax_rate}
                      onChange={(event) => updateForm('tax_rate', event.target.value)}
                    />
                  </div>
                  <div className="q-field">
                    <label htmlFor="payment-terms">Payment terms</label>
                    <input
                      id="payment-terms"
                      type="text"
                      className="q-input"
                      placeholder="e.g. 40% advance, 60% before dispatch"
                      value={form.payment_terms}
                      onChange={(event) => updateForm('payment_terms', event.target.value)}
                    />
                  </div>
                </div>
                <div className="q-field">
                  <label htmlFor="warranty-terms">Warranty terms</label>
                  <textarea
                    id="warranty-terms"
                    className="q-textarea"
                    placeholder="Only state warranties that are configured in the catalogue."
                    value={form.warranty_terms}
                    onChange={(event) => updateForm('warranty_terms', event.target.value)}
                  />
                </div>
                <div className="q-grid-2">
                  <div className="q-field">
                    <label htmlFor="customer-notes">Notes for customer</label>
                    <textarea
                      id="customer-notes"
                      className="q-textarea"
                      value={form.customer_notes}
                      onChange={(event) => updateForm('customer_notes', event.target.value)}
                    />
                  </div>
                  <div className="q-field">
                    <label htmlFor="internal-notes">Internal notes</label>
                    <textarea
                      id="internal-notes"
                      className="q-textarea"
                      value={form.internal_notes}
                      onChange={(event) => updateForm('internal_notes', event.target.value)}
                    />
                  </div>
                </div>
                <div className="q-field">
                  <label htmlFor="terms">Terms &amp; conditions</label>
                  <textarea
                    id="terms"
                    className="q-textarea"
                    placeholder="Leave blank to use the standard SOLVIX quotation terms."
                    value={form.terms_and_conditions}
                    onChange={(event) => updateForm('terms_and_conditions', event.target.value)}
                  />
                </div>
              </div>
            </section>
          </div>

          <aside className="q-sticky">
            <div className="q-totals">
              <div className="q-label" style={{ marginBottom: 4 }}>Estimate</div>
              <div className="q-total-row">
                <span>Subtotal</span>
                <span>{formatCurrency(totals.subtotal)}</span>
              </div>
              <div className="q-total-row">
                <span>Discount</span>
                <span>- {formatCurrency(totals.discount)}</span>
              </div>
              <div className="q-total-row">
                <span>Tax</span>
                <span>{formatCurrency(totals.tax)}</span>
              </div>
              <div className="q-total-row grand">
                <span>Total</span>
                <span>{formatCurrency(totals.total)}</span>
              </div>
              <div className="q-hint" style={{ marginTop: 6 }}>
                <RefreshCw size={12} style={{ verticalAlign: '-1px', marginRight: 4 }} />
                Final amounts are recalculated and locked by the server when saved.
              </div>
            </div>

            <div className="q-panel">
              <div className="q-panel-header">
                <span className="q-panel-title">Workflow</span>
              </div>
              <div className="q-panel-body" style={{ gap: 10 }}>
                <p className="q-hint" style={{ lineHeight: 1.5 }}>
                  Saving a draft keeps it editable. Submitting sends it for approval when required; otherwise it is
                  approved automatically.
                </p>
                <button
                  type="button"
                  className="crm-btn crm-btn-secondary"
                  onClick={() => handleSave(false)}
                  disabled={saving}
                >
                  <Save size={15} /> {isEdit ? 'Update Draft' : 'Save Draft'}
                </button>
                <button
                  type="button"
                  className="crm-btn crm-btn-primary"
                  onClick={() => handleSave(true)}
                  disabled={saving}
                >
                  <Send size={15} /> {saving ? 'Saving…' : 'Save & Submit'}
                </button>
              </div>
            </div>
          </aside>
        </div>
      )}
    </SalesLayout>
  );
}
