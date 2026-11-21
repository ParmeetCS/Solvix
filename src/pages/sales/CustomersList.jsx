import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import SalesLayout from './SalesLayout';
import { salesApi } from '@/services/api';
import {
  UserCheck,
  Search,
  Eye,
  Phone,
  Mail,
  MapPin,
  ExternalLink,
  Plus
} from 'lucide-react';

export default function CustomersList() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');

  // Register Customer Modal
  const [showModal, setShowModal] = useState(false);
  const [contactName, setContactName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [customerType, setCustomerType] = useState('residential');
  const [companyName, setCompanyName] = useState('');
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await salesApi.getCustomers({ search });
      setCustomers(res.data || []);
    } catch (err) {
      setError(err?.message || 'Failed to load customers.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadCustomers();
  };

  const handleCreateCustomer = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const res = await salesApi.createOrLinkCustomer({
        contact_name: contactName,
        phone,
        email,
        customer_type: customerType,
        company_name: companyName,
        street,
        city,
        notes
      });
      alert(res.message || 'Customer registered!');
      setShowModal(false);
      setContactName('');
      setPhone('');
      setEmail('');
      setStreet('');
      setNotes('');
      loadCustomers();
    } catch (err) {
      alert(err.message || 'Error creating customer');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SalesLayout
      title="Customer Accounts"
      subtitle="View verified solar customer profiles, installations, quotations and lifetime value"
      actions={
        <button
          onClick={() => setShowModal(true)}
          className="crm-btn crm-btn-primary crm-btn-sm"
        >
          <Plus size={16} /> Register Customer
        </button>
      }
    >
      {/* Search Bar */}
      <form onSubmit={handleSearchSubmit} className="crm-filter-bar">
        <div className="crm-search-box" style={{ display: 'flex', alignItems: 'center', background: 'rgba(13,23,42,0.8)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', padding: '0 10px' }}>
          <Search size={16} style={{ color: '#94a3b8' }} />
          <input
            type="text"
            className="crm-input"
            style={{ border: 'none', background: 'transparent' }}
            placeholder="Search customer name, code, phone, email, company..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <button type="submit" className="crm-btn crm-btn-secondary crm-btn-sm">
          Search
        </button>
      </form>

      {/* Customers Table */}
      <div className="crm-card" style={{ padding: 0 }}>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
            Loading customer accounts...
          </div>
        ) : error ? (
          <div style={{ padding: '24px', color: '#f87171' }}>{error}</div>
        ) : customers.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
            No customer profiles found. Qualified leads convert into customers.
          </div>
        ) : (
          <div className="crm-table-container">
            <table className="crm-table">
              <thead>
                <tr>
                  <th>Customer Code</th>
                  <th>Contact Name</th>
                  <th>Contact Info</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Leads Converted</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <b style={{ color: '#d8ee8e' }}>{c.customer_code}</b>
                      <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                        {new Date(c.created_at).toLocaleDateString()}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: '#fff' }}>{c.contact_name}</div>
                      {c.company_name && (
                        <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                          {c.company_name}
                        </div>
                      )}
                    </td>
                    <td>
                      <div style={{ fontSize: '0.82rem' }}>{c.phone || 'No phone'}</div>
                      <div style={{ fontSize: '0.76rem', color: '#94a3b8' }}>{c.email}</div>
                    </td>
                    <td style={{ textTransform: 'capitalize' }}>{c.customer_type}</td>
                    <td>
                      <span className={`crm-badge crm-badge-${c.status === 'active' ? 'converted' : 'lost'}`}>
                        {c.status}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.85rem', color: '#e2e8f0' }}>
                        {c.leads?.length || 0} lead(s)
                      </span>
                    </td>
                    <td>
                      <Link
                        to={`/sales/customers/${c.id}`}
                        className="crm-btn crm-btn-outline crm-btn-sm"
                      >
                        <Eye size={14} /> 360° Profile
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Customer Registration Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <form onSubmit={handleCreateCustomer} className="crm-card" style={{ width: '480px', maxWidth: '90%' }}>
            <h3 style={{ color: '#fff', marginBottom: '16px', fontSize: '1.1rem' }}>Register Customer Account</h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="crm-form-group">
                <label className="crm-label">Contact / Full Name *</label>
                <input
                  type="text"
                  required
                  className="crm-input"
                  placeholder="e.g. Priya Nair"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                />
              </div>

              <div className="crm-form-group">
                <label className="crm-label">Customer Type</label>
                <select className="crm-select" value={customerType} onChange={(e) => setCustomerType(e.target.value)}>
                  <option value="residential">Residential</option>
                  <option value="commercial">Commercial</option>
                  <option value="industrial">Industrial</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="crm-form-group">
                <label className="crm-label">Phone Number *</label>
                <input
                  type="tel"
                  required
                  className="crm-input"
                  placeholder="e.g. +91 9876543210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>

              <div className="crm-form-group">
                <label className="crm-label">Email Address *</label>
                <input
                  type="email"
                  required
                  className="crm-input"
                  placeholder="priya@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="crm-form-group">
              <label className="crm-label">Company Name (Optional)</label>
              <input
                type="text"
                className="crm-input"
                placeholder="Business entity if commercial/industrial"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
              <div className="crm-form-group">
                <label className="crm-label">Street Address</label>
                <input
                  type="text"
                  className="crm-input"
                  placeholder="Street / locality"
                  value={street}
                  onChange={(e) => setStreet(e.target.value)}
                />
              </div>
              <div className="crm-form-group">
                <label className="crm-label">City</label>
                <input
                  type="text"
                  className="crm-input"
                  placeholder="City"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '20px' }}>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="crm-btn crm-btn-secondary crm-btn-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="crm-btn crm-btn-primary crm-btn-sm"
              >
                {submitting ? 'Registering...' : 'Save Customer'}
              </button>
            </div>
          </form>
        </div>
      )}
    </SalesLayout>
  );
}
