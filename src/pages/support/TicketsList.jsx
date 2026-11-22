import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import PortalLayout from '@/components/PortalLayout';
import { supportApi } from '@/services/api';
import {
  Ticket,
  Search,
  PlusCircle,
  Filter,
  Loader2,
  ChevronLeft,
  ChevronRight,
  AlertCircle
} from 'lucide-react';

export default function TicketsList() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [category, setCategory] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    fetchTickets();
  }, [page, status, priority, category]);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await supportApi.getTickets({
        page,
        limit: 15,
        search,
        status,
        priority,
        category
      });
      const data = res.data || res;
      setTickets(data.tickets || []);
      setTotalPages(data.totalPages || 1);
      setTotalCount(data.total || 0);
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Failed to fetch tickets.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchTickets();
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
    <PortalLayout
      title="Service Tickets"
      subtitle={`Managing ${totalCount} customer service and technical support tickets`}
      actions={
        <Link to="/support/tickets/new" className="btn-primary">
          <PlusCircle size={16} />
          <span>New Ticket</span>
        </Link>
      }
    >
      {/* Filters Bar */}
      <form onSubmit={handleSearchSubmit} className="support-filters-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: '240px' }}>
          <Search size={16} color="var(--text-muted)" />
          <input
            type="text"
            className="support-search-input"
            placeholder="Search ticket #, subject, customer, or description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select
          className="support-select"
          value={category}
          onChange={(e) => { setCategory(e.target.value); setPage(1); }}
        >
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        <select
          className="support-select"
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
        >
          <option value="">All Statuses</option>
          <option value="open">Open</option>
          <option value="assigned">Assigned</option>
          <option value="in_progress">In Progress</option>
          <option value="waiting_for_parts">Waiting for Parts</option>
          <option value="resolved">Resolved</option>
          <option value="closed">Closed</option>
        </select>

        <select
          className="support-select"
          value={priority}
          onChange={(e) => { setPriority(e.target.value); setPage(1); }}
        >
          <option value="">All Priorities</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>

        <button type="submit" className="btn-secondary" style={{ padding: '0.55rem 1rem' }}>
          Search
        </button>
      </form>

      {/* Tickets Table */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem 0' }}>
          <Loader2 className="animate-spin" size={36} color="var(--accent-text)" />
        </div>
      ) : error ? (
        <div className="support-card" style={{ borderColor: 'var(--c-red-2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--c-red)' }}>
            <AlertCircle size={20} />
            <span>{error}</span>
          </div>
        </div>
      ) : tickets.length === 0 ? (
        <div className="support-card" style={{ textAlign: 'center', padding: '3rem 1rem' }}>
          <Ticket size={40} color="var(--text-dim)" style={{ margin: '0 auto 1rem auto' }} />
          <h3 style={{ color: 'var(--text-strong)', margin: '0 0 0.5rem 0' }}>No tickets found</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', maxWidth: '400px', margin: '0 auto 1.5rem auto' }}>
            There are currently no tickets matching your filter criteria.
          </p>
          <Link to="/support/tickets/new" className="btn-primary">
            Create First Ticket
          </Link>
        </div>
      ) : (
        <div className="support-card" style={{ padding: 0 }}>
          <div className="support-table-container">
            <table className="support-table">
              <thead>
                <tr>
                  <th>Ticket Number</th>
                  <th>Customer</th>
                  <th>Contact Details</th>
                  <th>Category</th>
                  <th>Subject</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Assigned Agent</th>
                  <th>Date</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {tickets.map((t) => (
                  <tr key={t.id}>
                    <td style={{ fontWeight: 600, color: 'var(--accent-text)' }}>
                      <Link to={`/support/tickets/${t.id}`} style={{ color: 'var(--accent-text)', textDecoration: 'none' }}>
                        {t.ticket_number || t.ticket_code}
                      </Link>
                    </td>
                    <td style={{ fontWeight: 500 }}>
                      {t.customers?.contact_name || 'Customer'}
                    </td>
                    <td style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                      {t.customers?.phone || t.customers?.email || '—'}
                    </td>
                    <td>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-soft)', background: 'var(--app-bg)', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
                        {t.issue_category}
                      </span>
                    </td>
                    <td style={{ maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {t.display_subject || t.subject}
                    </td>
                    <td>
                      <span className={`badge badge-priority-${t.priority}`}>
                        {t.priority}
                      </span>
                    </td>
                    <td>
                      <span className={`badge badge-${t.status}`}>
                        {String(t.status || '').replace('_', ' ')}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.8125rem', color: 'var(--text-soft)' }}>
                      {t.assigned_profile?.full_name || 'Unassigned'}
                    </td>
                    <td style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                      {new Date(t.created_at).toLocaleDateString()}
                    </td>
                    <td>
                      <Link
                        to={`/support/tickets/${t.id}`}
                        className="btn-secondary"
                        style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}
                      >
                        Manage
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.5rem', borderTop: '1px solid var(--surface-2)' }}>
              <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                Page {page} of {totalPages} ({totalCount} total)
              </span>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  className="btn-secondary"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  style={{ opacity: page <= 1 ? 0.5 : 1, padding: '0.4rem 0.75rem' }}
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  className="btn-secondary"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  style={{ opacity: page >= totalPages ? 0.5 : 1, padding: '0.4rem 0.75rem' }}
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </PortalLayout>
  );
}
