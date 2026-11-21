import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import SalesLayout from './SalesLayout';
import { salesApi } from '@/services/api';
import {
  ArrowLeft,
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  FileText,
  DollarSign,
  Briefcase,
  History,
  MessageSquare
} from 'lucide-react';

export default function CustomerDetail() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadCustomer();
  }, [id]);

  const loadCustomer = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await salesApi.getCustomerById(id);
      setData(res.data);
    } catch (err) {
      setError(err?.message || 'Failed to load customer profile.');
    } finally {
      setLoading(false);
    }
  };

  const customer = data?.customer;
  const addresses = data?.addresses || [];
  const leads = data?.leads || [];
  const quotations = data?.quotations || [];
  const orders = data?.orders || [];
  const interactions = data?.interactions || [];

  return (
    <SalesLayout
      title={customer ? `${customer.contact_name} (Customer)` : 'Customer 360°'}
      subtitle={customer ? `Code: ${customer.customer_code} • Type: ${customer.customer_type}` : ''}
      actions={
        <Link to="/sales/customers" className="crm-btn crm-btn-secondary crm-btn-sm">
          <ArrowLeft size={16} /> Back to Customers
        </Link>
      }
    >
      {loading ? (
        <div className="crm-card" style={{ padding: '60px', textAlign: 'center', color: '#94a3b8' }}>
          Loading customer 360° history...
        </div>
      ) : error ? (
        <div className="crm-card" style={{ color: '#f87171' }}>{error}</div>
      ) : !customer ? (
        <div className="crm-card">Customer not found.</div>
      ) : (
        <>
          {/* Customer Overview Box */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px' }}>
            <div className="crm-card">
              <div className="crm-card-header">
                <span className="crm-card-title">Identity & Contacts</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.9rem' }}>
                <div>
                  <div style={{ color: '#94a3b8', fontSize: '0.78rem' }}>CONTACT NAME</div>
                  <div style={{ fontWeight: 600, color: '#fff' }}>{customer.contact_name}</div>
                </div>
                {customer.company_name && (
                  <div>
                    <div style={{ color: '#94a3b8', fontSize: '0.78rem' }}>COMPANY</div>
                    <div>{customer.company_name}</div>
                  </div>
                )}
                <div>
                  <div style={{ color: '#94a3b8', fontSize: '0.78rem' }}>PHONE</div>
                  <div>{customer.phone || 'N/A'}</div>
                </div>
                <div>
                  <div style={{ color: '#94a3b8', fontSize: '0.78rem' }}>EMAIL</div>
                  <div>{customer.email}</div>
                </div>
                <div>
                  <div style={{ color: '#94a3b8', fontSize: '0.78rem' }}>ACCOUNT STATUS</div>
                  <span className={`crm-badge crm-badge-${customer.status === 'active' ? 'converted' : 'lost'}`}>
                    {customer.status}
                  </span>
                </div>
              </div>
            </div>

            {/* Address */}
            <div className="crm-card">
              <div className="crm-card-header">
                <span className="crm-card-title">Site Addresses ({addresses.length})</span>
              </div>
              {addresses.length === 0 ? (
                <p style={{ color: '#64748b', fontSize: '0.88rem' }}>No specific address saved.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {addresses.map((addr) => (
                    <div key={addr.id} style={{ padding: '8px 12px', background: 'rgba(255,255,255,0.02)', borderRadius: '6px' }}>
                      <div style={{ fontWeight: 600, color: '#fff', fontSize: '0.84rem' }}>{addr.label || 'Primary'}</div>
                      <div style={{ color: '#cbd5e1', fontSize: '0.82rem' }}>
                        {addr.street}, {addr.city} {addr.postal_code}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Lifetime Summary */}
            <div className="crm-card">
              <div className="crm-card-header">
                <span className="crm-card-title">Lifetime Value</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem' }}>
                  <span style={{ color: '#94a3b8' }}>Total Solar Leads:</span>
                  <b>{leads.length}</b>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem' }}>
                  <span style={{ color: '#94a3b8' }}>Quotations Issued:</span>
                  <b>{quotations.length}</b>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem' }}>
                  <span style={{ color: '#94a3b8' }}>Confirmed Orders:</span>
                  <b style={{ color: '#d8ee8e' }}>{orders.length}</b>
                </div>
              </div>
            </div>
          </div>

          {/* Connected Leads */}
          <div className="crm-card">
            <div className="crm-card-header">
              <span className="crm-card-title">Connected Solar Enquiries & Leads ({leads.length})</span>
            </div>
            {leads.length === 0 ? (
              <p style={{ color: '#64748b', fontSize: '0.88rem' }}>No leads attached to this customer.</p>
            ) : (
              <div className="crm-table-container">
                <table className="crm-table">
                  <thead>
                    <tr>
                      <th>Lead Code</th>
                      <th>Source</th>
                      <th>Status</th>
                      <th>Created At</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leads.map((l) => (
                      <tr key={l.id}>
                        <td><b style={{ color: '#d8ee8e' }}>{l.lead_code}</b></td>
                        <td style={{ textTransform: 'capitalize' }}>{l.source}</td>
                        <td>
                          <span className={`crm-badge crm-badge-${l.status}`}>
                            {l.status?.replace('_', ' ')}
                          </span>
                        </td>
                        <td>{new Date(l.created_at).toLocaleDateString()}</td>
                        <td>
                          <Link to={`/sales/leads/${l.id}`} className="crm-btn crm-btn-secondary crm-btn-sm">
                            View Lead
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Quotations & Orders Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
            {/* Quotations */}
            <div className="crm-card">
              <div className="crm-card-header">
                <span className="crm-card-title">Solar Quotations ({quotations.length})</span>
              </div>
              {quotations.length === 0 ? (
                <p style={{ color: '#64748b', fontSize: '0.88rem' }}>No quotations issued yet.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {quotations.map((q) => (
                    <div key={q.id} style={{ padding: '10px 14px', background: 'rgba(255,255,255,0.03)', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <b>{q.quotation_code}</b>
                        <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                          {q.system_capacity_kw} kW ({q.system_type}) • ₹ {q.total_amount}
                        </div>
                      </div>
                      <span className={`crm-badge crm-badge-${q.status}`}>{q.status}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Orders */}
            <div className="crm-card">
              <div className="crm-card-header">
                <span className="crm-card-title">Installation Orders ({orders.length})</span>
              </div>
              {orders.length === 0 ? (
                <p style={{ color: '#64748b', fontSize: '0.88rem' }}>No active or past installation orders.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {orders.map((o) => (
                    <div key={o.id} style={{ padding: '10px 14px', background: 'rgba(255,255,255,0.03)', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <b>{o.order_code}</b>
                        <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                          Total: ₹ {o.total_amount} • Balance Due: ₹ {o.balance_due}
                        </div>
                      </div>
                      <span className={`crm-badge crm-badge-${o.status}`}>{o.status}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Interaction History */}
          <div className="crm-card">
            <div className="crm-card-header">
              <span className="crm-card-title">Customer Interaction Timeline ({interactions.length})</span>
            </div>
            {interactions.length === 0 ? (
              <p style={{ color: '#64748b', fontSize: '0.88rem' }}>No interactions recorded.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {interactions.map((it) => (
                  <div key={it.id} style={{ padding: '10px 14px', background: 'rgba(255,255,255,0.02)', borderRadius: '6px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 600, color: '#fff' }}>{it.subject}</span>
                      <span style={{ fontSize: '0.74rem', color: '#64748b' }}>{new Date(it.occurred_at).toLocaleString()}</span>
                    </div>
                    <div style={{ fontSize: '0.76rem', color: '#94a3b8', marginTop: '2px', textTransform: 'capitalize' }}>
                      Channel: {it.interaction_type} • By: {it.author?.full_name || 'System'}
                    </div>
                    {it.summary && (
                      <p style={{ fontSize: '0.84rem', color: '#cbd5e1', marginTop: '4px' }}>{it.summary}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </SalesLayout>
  );
}
