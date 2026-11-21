import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import SupportLayout from './SupportLayout';
import { supportApi } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import {
  Ticket,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  Loader2,
  ArrowLeft
} from 'lucide-react';

export default function NewTicket() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const isCustomer = user?.account_type === 'customer';

  const [agents, setAgents] = useState([]);
  const [serials, setSerials] = useState([]);
  const [loadingInitial, setLoadingInitial] = useState(true);

  // Form state
  const [formData, setFormData] = useState({
    customer_id: '',
    contact_phone: user?.phone || '',
    contact_email: user?.email || '',
    issue_category: 'Inverter issue',
    priority: 'medium',
    subject: '',
    description: '',
    equipment_serial_number: '',
    assigned_to: ''
  });

  // Live warranty verification state
  const [verifying, setVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState(null);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      setLoadingInitial(true);
      const [agentRes, serialRes] = await Promise.all([
        !isCustomer ? supportApi.getAgents().catch(() => ({ data: { agents: [] } })) : Promise.resolve({ data: { agents: [] } }),
        supportApi.getSerials().catch(() => ({ data: { serials: [] } }))
      ]);

      const loadedAgents = agentRes.data?.agents || agentRes.agents || [];
      const loadedSerials = serialRes.data?.serials || serialRes.serials || [];
      setAgents(loadedAgents);
      setSerials(loadedSerials);

      // If customer has serials, default customer_id
      if (loadedSerials.length > 0 && loadedSerials[0].customer_id) {
        setFormData((prev) => ({
          ...prev,
          customer_id: loadedSerials[0].customer_id
        }));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingInitial(false);
    }
  };

  const handleVerifySerial = async () => {
    const s = formData.equipment_serial_number.trim();
    if (!s) return;

    try {
      setVerifying(true);
      setVerificationResult(null);
      const res = await supportApi.verifyWarranty(s);
      const data = res.data || res;
      setVerificationResult(data);
      if (data.customer?.id && !formData.customer_id) {
        setFormData((prev) => ({ ...prev, customer_id: data.customer.id }));
      }
    } catch (err) {
      setVerificationResult({
        found: false,
        message: err?.response?.data?.message || 'Verification lookup failed.'
      });
    } finally {
      setVerifying(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.subject.trim() || !formData.description.trim()) {
      setError('Please provide a subject and detailed description.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const res = await supportApi.createTicket({
        ...formData,
        customer_id: formData.customer_id || undefined
      });

      const created = res.data || res;
      navigate(`/support/tickets/${created.id}`);
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Failed to submit support ticket.');
    } finally {
      setSubmitting(false);
    }
  };

  const categories = [
    'Installation issue',
    'Inverter issue',
    'Solar panel issue',
    'Battery issue',
    'Electrical issue',
    'Performance issue',
    'Maintenance',
    'Warranty claim',
    'Other'
  ];

  return (
    <SupportLayout
      title="Create Service Ticket"
      subtitle="Log a new customer inquiry, warranty service request, or technical maintenance job"
      actions={
        <Link to="/support/tickets" className="btn-secondary">
          <ArrowLeft size={16} />
          <span>Back to Tickets</span>
        </Link>
      }
    >
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <form onSubmit={handleSubmit} className="support-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {error && (
            <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', borderRadius: '8px', padding: '1rem', display: 'flex', gap: '0.75rem', color: '#f87171' }}>
              <AlertCircle size={20} />
              <span>{error}</span>
            </div>
          )}

          {/* Row 1: Issue Category & Priority */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="support-form-group">
              <label className="support-form-label">Issue Category *</label>
              <select
                className="support-form-select"
                value={formData.issue_category}
                onChange={(e) => setFormData({ ...formData, issue_category: e.target.value })}
                required
              >
                {categories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div className="support-form-group">
              <label className="support-form-label">Priority *</label>
              <select
                className="support-form-select"
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                required
              >
                <option value="low">Low (General inquiry / non-urgent)</option>
                <option value="medium">Medium (Standard service request)</option>
                <option value="high">High (Generation loss / fault code)</option>
                <option value="critical">Critical (Safety / blackout / complete system down)</option>
              </select>
            </div>
          </div>

          {/* Row 2: Equipment Serial Number & Live Warranty Check */}
          <div className="support-form-group">
            <label className="support-form-label">
              Equipment Serial Number (Optional / Recommended for Warranty)
            </label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                type="text"
                className="support-form-input"
                placeholder="e.g. SLX-INV-2024-8841 or SLX-PNL-2024-1102"
                value={formData.equipment_serial_number}
                onChange={(e) => setFormData({ ...formData, equipment_serial_number: e.target.value })}
                style={{ flex: 1 }}
              />
              <button
                type="button"
                className="btn-secondary"
                onClick={handleVerifySerial}
                disabled={verifying || !formData.equipment_serial_number.trim()}
              >
                {verifying ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} color="#d8ee8e" />}
                <span>Verify Warranty</span>
              </button>
            </div>

            {/* Quick serial suggestions */}
            {serials.length > 0 && (
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.35rem' }}>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Registered Serials:</span>
                {serials.slice(0, 4).map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    style={{
                      background: '#0b1020',
                      border: '1px solid #1e293b',
                      borderRadius: '4px',
                      color: '#38bdf8',
                      fontSize: '0.75rem',
                      padding: '0.15rem 0.5rem',
                      cursor: 'pointer'
                    }}
                    onClick={() => {
                      setFormData({ ...formData, equipment_serial_number: s.serial_number, customer_id: s.customer_id || formData.customer_id });
                    }}
                  >
                    {s.serial_number} ({s.products?.name?.split(' ')[1] || 'Unit'})
                  </button>
                ))}
              </div>
            )}

            {/* Live Verification Result Box */}
            {verificationResult && (
              <div
                style={{
                  marginTop: '0.75rem',
                  padding: '1rem',
                  borderRadius: '8px',
                  background: verificationResult.found ? 'rgba(52, 211, 153, 0.08)' : 'rgba(239, 68, 68, 0.08)',
                  border: `1px solid ${verificationResult.found ? 'rgba(52, 211, 153, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                  fontSize: '0.875rem'
                }}
              >
                {verificationResult.found ? (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#34d399', fontWeight: 600 }}>
                      <CheckCircle2 size={18} />
                      <span>Registry Match: {verificationResult.product?.name || 'Solar Equipment'}</span>
                    </div>
                    <div style={{ marginTop: '0.5rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.5rem', color: '#cbd5e1', fontSize: '0.8125rem' }}>
                      <div>Delivery Date: <strong>{verificationResult.delivery?.delivered_at ? new Date(verificationResult.delivery.delivered_at).toLocaleDateString() : 'Verified on site'}</strong></div>
                      <div>Warranty Clock: <strong>Starts from Delivery Date</strong></div>
                      <div>Duration: <strong>{verificationResult.verification?.warranty_duration_years} Years</strong></div>
                      <div>Expiry Date: <strong>{verificationResult.verification?.expiry_date}</strong></div>
                      <div>Status: <span className={`badge badge-warranty-${verificationResult.verification?.status}`}>{verificationResult.verification?.status}</span></div>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#f87171' }}>
                    <AlertCircle size={18} />
                    <span>{verificationResult.message}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Row 3: Subject */}
          <div className="support-form-group">
            <label className="support-form-label">Subject / Issue Summary *</label>
            <input
              type="text"
              className="support-form-input"
              placeholder="e.g. Inverter displaying Error 04 and not feeding grid"
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              required
            />
          </div>

          {/* Row 4: Detailed Description */}
          <div className="support-form-group">
            <label className="support-form-label">Issue Description *</label>
            <textarea
              className="support-form-textarea"
              rows={5}
              placeholder="Describe symptoms, when the issue started, warning lights, weather condition, and any troubleshooting attempted..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              required
            />
          </div>

          {/* Row 5: Contact Details */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="support-form-group">
              <label className="support-form-label">Contact Phone</label>
              <input
                type="text"
                className="support-form-input"
                placeholder="+91 98765 43210"
                value={formData.contact_phone}
                onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
              />
            </div>
            <div className="support-form-group">
              <label className="support-form-label">Contact Email</label>
              <input
                type="email"
                className="support-form-input"
                placeholder="customer@example.com"
                value={formData.contact_email}
                onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
              />
            </div>
          </div>

          {/* Row 6: Assigned Agent (If Employee/Admin) */}
          {!isCustomer && agents.length > 0 && (
            <div className="support-form-group">
              <label className="support-form-label">Assign Support Specialist / Technician</label>
              <select
                className="support-form-select"
                value={formData.assigned_to}
                onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value })}
              >
                <option value="">Leave Unassigned (Triage Queue)</option>
                {agents.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} — {a.department} ({a.role})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem', borderTop: '1px solid #1e293b', paddingTop: '1.25rem' }}>
            <Link to="/support/tickets" className="btn-secondary">
              Cancel
            </Link>
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? <Loader2 size={16} className="animate-spin" /> : <Ticket size={16} />}
              <span>{submitting ? 'Creating Ticket...' : 'Create Ticket'}</span>
            </button>
          </div>
        </form>
      </div>
    </SupportLayout>
  );
}
