import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import SalesLayout from './SalesLayout';
import { salesApi } from '@/services/api';
import {
  UserPlus,
  ArrowLeft,
  AlertTriangle,
  CheckCircle2,
  Phone,
  Mail,
  Zap,
  MapPin,
  Calendar,
  FileText
} from 'lucide-react';

export default function NewLead() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    customer_name: '',
    phone: '',
    email: '',
    address: '',
    source: 'website',
    system_type: 'on-grid',
    expected_capacity_kw: '',
    monthly_electricity_bill: '',
    additional_requirements: '',
    priority: 'medium',
    assigned_to: '',
    notes: '',
    estimated_value: '',
  });

  const [employees, setEmployees] = useState([]);
  const [duplicateWarning, setDuplicateWarning] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadEmployees();
  }, []);

  const loadEmployees = async () => {
    try {
      const res = await salesApi.getSalesEmployees();
      setEmployees(res.data || []);
    } catch (e) {
      console.error('Failed to load employees for assignment:', e);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e, bypass = false) => {
    if (e) e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const payload = {
        ...formData,
        bypass_duplicate_check: bypass
      };

      const res = await salesApi.createLead(payload);
      if (res.data?.duplicateWarning) {
        setDuplicateWarning(res.data);
        setLoading(false);
        return;
      }

      navigate(`/sales/leads/${res.data.id}`);
    } catch (err) {
      if (err.data?.duplicateWarning) {
        setDuplicateWarning(err.data);
      } else {
        setError(err.message || 'Failed to create lead.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SalesLayout
      title="Create New Solar Lead"
      subtitle="Enter potential customer requirements with real-time duplicate checking"
      actions={
        <Link to="/sales/leads" className="crm-btn crm-btn-secondary crm-btn-sm">
          <ArrowLeft size={16} /> Back to Leads
        </Link>
      }
    >
      <div style={{ maxWidth: '850px', margin: '0 auto', width: '100%' }}>
        {/* Duplicate Warning Prompt */}
        {duplicateWarning && (
          <div
            className="crm-card"
            style={{
              borderColor: '#f59e0b',
              background: 'rgba(245, 158, 11, 0.08)',
              marginBottom: '24px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
              <AlertTriangle size={24} style={{ color: '#f59e0b', flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <h3 style={{ color: '#f59e0b', fontSize: '1.05rem', margin: 0, fontWeight: 600 }}>
                  Potential Duplicate Lead Detected
                </h3>
                <p style={{ color: '#cbd5e1', fontSize: '0.88rem', margin: '6px 0 12px' }}>
                  {duplicateWarning.message} Existing lead(s) with matching contact info:
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '14px' }}>
                  {duplicateWarning.duplicates?.map((d) => (
                    <div
                      key={d.id}
                      style={{
                        padding: '10px 14px',
                        background: 'rgba(0,0,0,0.25)',
                        borderRadius: '6px',
                        fontSize: '0.84rem',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                    >
                      <div>
                        <b>{d.customer_name}</b> ({d.lead_code}) • {d.phone} • {d.email || 'No email'}
                      </div>
                      <Link
                        to={`/sales/leads/${d.id}`}
                        target="_blank"
                        className="crm-btn crm-btn-secondary crm-btn-sm"
                      >
                        View Existing Lead
                      </Link>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => handleSubmit(null, true)}
                    className="crm-btn crm-btn-outline crm-btn-sm"
                  >
                    Proceed & Create Lead Anyway
                  </button>
                  <button
                    type="button"
                    onClick={() => setDuplicateWarning(null)}
                    className="crm-btn crm-btn-secondary crm-btn-sm"
                  >
                    Edit Form Data
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div
            className="crm-card"
            style={{
              borderColor: '#f87171',
              background: 'rgba(248, 113, 113, 0.08)',
              color: '#f87171',
              marginBottom: '20px'
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={(e) => handleSubmit(e, false)} className="crm-card">
          <div className="crm-card-header">
            <span className="crm-card-title">1. Customer Contact Details</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
            <div className="crm-form-group">
              <label className="crm-label">Customer Name *</label>
              <input
                type="text"
                name="customer_name"
                required
                className="crm-input"
                placeholder="e.g. Ramesh Sharma / SunTech Industries"
                value={formData.customer_name}
                onChange={handleChange}
              />
            </div>

            <div className="crm-form-group">
              <label className="crm-label">Phone Number *</label>
              <input
                type="tel"
                name="phone"
                required
                className="crm-input"
                placeholder="e.g. +91 9876543210"
                value={formData.phone}
                onChange={handleChange}
              />
            </div>

            <div className="crm-form-group">
              <label className="crm-label">Email Address</label>
              <input
                type="email"
                name="email"
                className="crm-input"
                placeholder="customer@example.com"
                value={formData.email}
                onChange={handleChange}
              />
            </div>

            <div className="crm-form-group">
              <label className="crm-label">Acquisition Channel / Source *</label>
              <select
                name="source"
                className="crm-select"
                value={formData.source}
                onChange={handleChange}
              >
                <option value="website">Website Enquiry</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="phone">Phone Call</option>
                <option value="referral">Referral</option>
                <option value="walkin">Walk-in</option>
                <option value="social_media">Social Media</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <div className="crm-form-group">
            <label className="crm-label">Installation Site Address / Location</label>
            <input
              type="text"
              name="address"
              className="crm-input"
              placeholder="e.g. Plot 42, Sector 18, Gurugram, Haryana"
              value={formData.address}
              onChange={handleChange}
            />
          </div>

          <div className="crm-card-header" style={{ marginTop: '24px' }}>
            <span className="crm-card-title">2. Solar System Requirements</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
            <div className="crm-form-group">
              <label className="crm-label">Solar System Type</label>
              <select
                name="system_type"
                className="crm-select"
                value={formData.system_type}
                onChange={handleChange}
              >
                <option value="on-grid">On-Grid (Net Metered)</option>
                <option value="off-grid">Off-Grid (Battery Bank)</option>
                <option value="hybrid">Hybrid (Grid + Storage)</option>
              </select>
            </div>

            <div className="crm-form-group">
              <label className="crm-label">Expected Capacity (kW)</label>
              <input
                type="number"
                step="0.5"
                name="expected_capacity_kw"
                className="crm-input"
                placeholder="e.g. 5.0"
                value={formData.expected_capacity_kw}
                onChange={handleChange}
              />
            </div>

            <div className="crm-form-group">
              <label className="crm-label">Avg. Monthly Electricity Bill (₹)</label>
              <input
                type="number"
                name="monthly_electricity_bill"
                className="crm-input"
                placeholder="e.g. 6500"
                value={formData.monthly_electricity_bill}
                onChange={handleChange}
              />
            </div>

            <div className="crm-form-group">
              <label className="crm-label">Lead Priority</label>
              <select
                name="priority"
                className="crm-select"
                value={formData.priority}
                onChange={handleChange}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>

          <div className="crm-form-group">
            <label className="crm-label">Assign to Sales Specialist</label>
            <select
              name="assigned_to"
              className="crm-select"
              value={formData.assigned_to}
              onChange={handleChange}
            >
              <option value="">-- Assign to Me (or Unassigned) --</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.full_name || emp.email} ({emp.activeLeadCount} active leads)
                </option>
              ))}
            </select>
          </div>

          <div className="crm-form-group">
            <label className="crm-label">Technical / Additional Requirements</label>
            <textarea
              name="additional_requirements"
              className="crm-textarea"
              placeholder="e.g. Three-phase connection available, shadow-free roof, subsidy desired..."
              value={formData.additional_requirements}
              onChange={handleChange}
            />
          </div>

          <div className="crm-form-group">
            <label className="crm-label">Internal Sales Notes</label>
            <textarea
              name="notes"
              className="crm-textarea"
              placeholder="Private notes about customer conversation, budget expectations, etc."
              value={formData.notes}
              onChange={handleChange}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
            <Link to="/sales/leads" className="crm-btn crm-btn-secondary">
              Cancel
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="crm-btn crm-btn-primary"
            >
              <UserPlus size={16} />
              {loading ? 'Creating...' : 'Create Lead'}
            </button>
          </div>
        </form>
      </div>
    </SalesLayout>
  );
}
