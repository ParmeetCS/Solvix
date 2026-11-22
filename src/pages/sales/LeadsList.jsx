import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import PortalLayout from '@/components/PortalLayout';
import { salesApi } from '@/services/api';
import {
  UserPlus,
  Search,
  Filter,
  Eye,
  Phone,
  Mail,
  Zap,
  Calendar,
  ChevronLeft,
  ChevronRight,
  ShieldAlert
} from 'lucide-react';

export default function LeadsList() {
  const [leads, setLeads] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [source, setSource] = useState('all');
  const [priority, setPriority] = useState('all');

  const navigate = useNavigate();

  useEffect(() => {
    loadLeads(1);
  }, [status, source, priority]);

  const loadLeads = async (page = 1) => {
    try {
      setLoading(true);
      setError(null);
      const res = await salesApi.getLeads({
        search,
        status: status !== 'all' ? status : undefined,
        source: source !== 'all' ? source : undefined,
        priority: priority !== 'all' ? priority : undefined,
        page,
        limit: 15
      });
      setLeads(res.data.leads || []);
      setPagination(res.data.pagination || { page: 1, totalPages: 1, total: 0 });
    } catch (err) {
      setError(err?.message || 'Failed to fetch leads.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadLeads(1);
  };

  return (
    <PortalLayout
      title="Lead Management"
      subtitle="Track, qualify, and convert potential solar customers"
      actions={
        <Link to="/sales/leads/new" className="crm-btn crm-btn-primary crm-btn-sm">
          <UserPlus size={16} />
          <span>New Lead</span>
        </Link>
      }
    >
      {/* Search & Filter Controls */}
      <form onSubmit={handleSearchSubmit} className="crm-filter-bar">
        <div className="crm-search-box" style={{ display: 'flex', alignItems: 'center', background: 'rgba(var(--surface-rgb), 0.8)', border: '1px solid rgba(var(--ink-rgb), 0.12)', borderRadius: '8px', padding: '0 10px' }}>
          <Search size={16} style={{ color: 'var(--text-muted)' }} />
          <input
            type="text"
            className="crm-input"
            style={{ border: 'none', background: 'transparent' }}
            placeholder="Search name, phone, email, lead code..."
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
          <option value="all">All Statuses</option>
          <option value="new">New</option>
          <option value="contacted">Contacted</option>
          <option value="follow_up_required">Follow-up Required</option>
          <option value="qualified">Qualified</option>
          <option value="survey_requested">Survey Requested</option>
          <option value="quotation_sent">Quotation Sent</option>
          <option value="converted">Converted</option>
          <option value="lost">Lost</option>
        </select>

        <select
          className="crm-select"
          style={{ width: 'auto' }}
          value={source}
          onChange={(e) => setSource(e.target.value)}
        >
          <option value="all">All Sources</option>
          <option value="website">Website Enquiry</option>
          <option value="whatsapp">WhatsApp</option>
          <option value="phone">Phone Call</option>
          <option value="referral">Referral</option>
          <option value="walkin">Walk-in</option>
          <option value="social_media">Social Media</option>
          <option value="other">Other</option>
        </select>

        <select
          className="crm-select"
          style={{ width: 'auto' }}
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
        >
          <option value="all">All Priorities</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="urgent">Urgent</option>
        </select>

        <button type="submit" className="crm-btn crm-btn-secondary crm-btn-sm">
          <Filter size={14} /> Filter
        </button>
      </form>

      {/* Leads Table */}
      <div className="crm-card" style={{ padding: 0 }}>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
            Loading leads...
          </div>
        ) : error ? (
          <div style={{ padding: '24px', color: 'var(--c-red)' }}>{error}</div>
        ) : leads.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
            No leads found matching your criteria.
          </div>
        ) : (
          <div className="crm-table-container">
            <table className="crm-table">
              <thead>
                <tr>
                  <th>Lead Code</th>
                  <th>Customer Name</th>
                  <th>Contact Info</th>
                  <th>System Spec</th>
                  <th>Source</th>
                  <th>Status</th>
                  <th>Priority</th>
                  <th>Assigned To</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead) => (
                  <tr key={lead.id}>
                    <td>
                      <b style={{ color: 'var(--accent-text)' }}>{lead.lead_code}</b>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                        {new Date(lead.created_at).toLocaleDateString()}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: '600', color: 'var(--text-strong)' }}>{lead.customer_name || 'Enquiry'}</div>
                      {lead.address && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {lead.address}
                        </div>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem' }}>
                        <Phone size={12} style={{ color: 'var(--accent-text)' }} /> {lead.phone}
                      </div>
                      {lead.email && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                          <Mail size={12} /> {lead.email}
                        </div>
                      )}
                    </td>
                    <td>
                      <div style={{ fontSize: '0.82rem' }}>
                        {lead.expected_capacity_kw ? `${lead.expected_capacity_kw} kW` : 'Capacity TBD'}
                      </div>
                      <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>
                        {lead.system_type || 'on-grid'}
                      </div>
                    </td>
                    <td style={{ textTransform: 'capitalize' }}>{lead.source}</td>
                    <td>
                      <span className={`crm-badge crm-badge-${lead.status}`}>
                        {String(lead.status || '').replace('_', ' ')}
                      </span>
                    </td>
                    <td>
                      <span
                        style={{
                          fontSize: '0.78rem',
                          fontWeight: '600',
                          color: lead.priority === 'urgent' ? 'var(--c-red)' : lead.priority === 'high' ? 'var(--c-amber-soft)' : 'var(--text-muted)',
                          textTransform: 'capitalize'
                        }}
                      >
                        {lead.priority || 'medium'}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontSize: '0.82rem' }}>
                        {lead.assigned_profile?.full_name || lead.assigned_profile?.email || 'Unassigned'}
                      </div>
                    </td>
                    <td>
                      <Link
                        to={`/sales/leads/${lead.id}`}
                        className="crm-btn crm-btn-outline crm-btn-sm"
                      >
                        <Eye size={14} /> View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {pagination.totalPages > 1 && (
          <div style={{ padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid rgba(var(--ink-rgb), 0.06)' }}>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              Showing page {pagination.page} of {pagination.totalPages} ({pagination.total} total leads)
            </span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                disabled={pagination.page <= 1}
                onClick={() => loadLeads(pagination.page - 1)}
                className="crm-btn crm-btn-secondary crm-btn-sm"
              >
                <ChevronLeft size={16} /> Prev
              </button>
              <button
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => loadLeads(pagination.page + 1)}
                className="crm-btn crm-btn-secondary crm-btn-sm"
              >
                Next <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </PortalLayout>
  );
}
