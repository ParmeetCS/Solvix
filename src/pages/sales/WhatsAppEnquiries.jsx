import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import SalesLayout from './SalesLayout';
import { salesApi } from '@/services/api';
import {
  MessageSquare,
  Plus,
  Send,
  ExternalLink,
  UserCheck,
  CheckCircle2,
  Clock,
  Search,
  Info
} from 'lucide-react';

export default function WhatsAppEnquiries() {
  const [enquiries, setEnquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');

  // New Enquiry Modal
  const [showNewModal, setShowNewModal] = useState(false);
  const [senderName, setSenderName] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadEnquiries();
  }, [status]);

  const loadEnquiries = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await salesApi.getWhatsAppEnquiries({
        status: status !== 'all' ? status : undefined,
        search
      });
      setEnquiries(res.data || []);
    } catch (err) {
      setError(err?.message || 'Failed to load WhatsApp enquiries.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadEnquiries();
  };

  const handleCreateEnquiry = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await salesApi.recordWhatsAppEnquiry({
        sender_name: senderName,
        phone,
        message
      });
      setShowNewModal(false);
      setSenderName('');
      setPhone('');
      setMessage('');
      loadEnquiries();
    } catch (err) {
      alert(err.message || 'Error recording enquiry');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConvertToLead = async (enquiry) => {
    if (!window.confirm(`Convert WhatsApp message from ${enquiry.sender_name} into a Lead?`)) return;
    try {
      const res = await salesApi.convertWhatsAppEnquiry(enquiry.id);
      alert(res.message || 'Converted to lead!');
      loadEnquiries();
    } catch (err) {
      alert(err.message || 'Error converting enquiry');
    }
  };

  // WhatsApp click-to-chat URL formatter
  const getWhatsAppChatUrl = (rawPhone, name) => {
    if (!rawPhone) return '#';
    const cleanNumber = rawPhone.replace(/[^0-9]/g, '');
    const text = encodeURIComponent(`Hello ${name || 'Customer'}, thank you for contacting Solvix Solar. How can we assist you with solar power today?`);
    return `https://wa.me/${cleanNumber}?text=${text}`;
  };

  return (
    <SalesLayout
      title="WhatsApp Enquiry Management"
      subtitle="Centralized inbox for incoming solar enquiries with direct click-to-chat & lead conversion"
      actions={
        <button
          onClick={() => setShowNewModal(true)}
          className="crm-btn crm-btn-primary crm-btn-sm"
        >
          <Plus size={16} /> Record WhatsApp Enquiry
        </button>
      }
    >
      {/* Integration Notice Alert */}
      <div
        className="crm-card"
        style={{
          borderLeft: '4px solid #38bdf8',
          background: 'rgba(56, 189, 248, 0.06)',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '12px',
          padding: '16px 20px'
        }}
      >
        <Info size={20} style={{ color: '#38bdf8', flexShrink: 0, marginTop: '2px' }} />
        <div style={{ fontSize: '0.86rem', color: '#cbd5e1' }}>
          <b style={{ color: '#38bdf8' }}>Architecture & Webhook Ready:</b> This module supports manual entry and click-to-chat links using standard E.164 phone formats.
          When WhatsApp Business API credentials (e.g. Meta Cloud API or Twilio) are connected in production, incoming webhooks route directly into this table without UI alterations.
        </div>
      </div>

      {/* Filter Bar */}
      <form onSubmit={handleSearchSubmit} className="crm-filter-bar">
        <div className="crm-search-box" style={{ display: 'flex', alignItems: 'center', background: 'rgba(13,23,42,0.8)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', padding: '0 10px' }}>
          <Search size={16} style={{ color: '#94a3b8' }} />
          <input
            type="text"
            className="crm-input"
            style={{ border: 'none', background: 'transparent' }}
            placeholder="Search sender, phone, message content..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select
          className="crm-select"
          style={{ width: 'auto' }}
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="all">All Enquiries</option>
          <option value="new">New</option>
          <option value="in_conversation">In Conversation</option>
          <option value="converted_to_lead">Converted to Lead</option>
          <option value="resolved">Resolved</option>
        </select>

        <button type="submit" className="crm-btn crm-btn-secondary crm-btn-sm">
          Filter
        </button>
      </form>

      {/* Enquiries List */}
      <div className="crm-card" style={{ padding: 0 }}>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
            Loading WhatsApp enquiries...
          </div>
        ) : error ? (
          <div style={{ padding: '24px', color: '#f87171' }}>{error}</div>
        ) : enquiries.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
            No WhatsApp enquiries recorded yet.
          </div>
        ) : (
          <div className="crm-table-container">
            <table className="crm-table">
              <thead>
                <tr>
                  <th>Sender & Contact</th>
                  <th>Message / Enquiry Summary</th>
                  <th>Received At</th>
                  <th>Status</th>
                  <th>Linked Record</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {enquiries.map((enq) => (
                  <tr key={enq.id}>
                    <td>
                      <div style={{ fontWeight: '600', color: '#fff' }}>{enq.sender_name}</div>
                      <div style={{ fontSize: '0.82rem', color: '#d8ee8e' }}>{enq.phone}</div>
                    </td>
                    <td>
                      <div style={{ fontSize: '0.86rem', color: '#e2e8f0', maxWidth: '380px' }}>
                        &ldquo;{enq.message}&rdquo;
                      </div>
                    </td>
                    <td>
                      <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                        {new Date(enq.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </td>
                    <td>
                      <span className={`crm-badge crm-badge-${enq.status}`}>
                        {enq.status?.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td>
                      {enq.lead ? (
                        <Link
                          to={`/sales/leads/${enq.lead.id}`}
                          style={{ color: '#d8ee8e', fontSize: '0.84rem', fontWeight: 600 }}
                        >
                          Lead: {enq.lead.lead_code}
                        </Link>
                      ) : enq.customer ? (
                        <span style={{ fontSize: '0.82rem', color: '#94a3b8' }}>
                          Customer: {enq.customer.customer_code}
                        </span>
                      ) : (
                        <span style={{ fontSize: '0.78rem', color: '#64748b' }}>Unlinked</span>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <a
                          href={getWhatsAppChatUrl(enq.phone, enq.sender_name)}
                          target="_blank"
                          rel="noreferrer"
                          className="crm-btn crm-btn-outline crm-btn-sm"
                          style={{ padding: '4px 10px', fontSize: '0.78rem' }}
                        >
                          <Send size={12} /> Click-to-Chat
                        </a>

                        {!enq.lead_id && (
                          <button
                            onClick={() => handleConvertToLead(enq)}
                            className="crm-btn crm-btn-primary crm-btn-sm"
                            style={{ padding: '4px 10px', fontSize: '0.78rem' }}
                          >
                            <UserCheck size={12} /> Convert to Lead
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Record WhatsApp Enquiry Modal */}
      {showNewModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <form onSubmit={handleCreateEnquiry} className="crm-card" style={{ width: '460px', maxWidth: '90%' }}>
            <h3 style={{ color: '#fff', marginBottom: '14px', fontSize: '1.1rem' }}>Record WhatsApp Message</h3>

            <div className="crm-form-group">
              <label className="crm-label">Sender / Customer Name *</label>
              <input
                type="text"
                required
                className="crm-input"
                placeholder="e.g. Ankit Verma"
                value={senderName}
                onChange={(e) => setSenderName(e.target.value)}
              />
            </div>

            <div className="crm-form-group">
              <label className="crm-label">WhatsApp Number (with country code) *</label>
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
              <label className="crm-label">Message / Enquiry Content *</label>
              <textarea
                required
                className="crm-textarea"
                placeholder="e.g. Looking for 3kW rooftop system for my house in Jaipur. Need subsidy guidance."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '20px' }}>
              <button
                type="button"
                onClick={() => setShowNewModal(false)}
                className="crm-btn crm-btn-secondary crm-btn-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="crm-btn crm-btn-primary crm-btn-sm"
              >
                {submitting ? 'Saving...' : 'Record Message'}
              </button>
            </div>
          </form>
        </div>
      )}
    </SalesLayout>
  );
}
