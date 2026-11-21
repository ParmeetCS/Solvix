import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import PortalLayout from '@/components/PortalLayout';
import { quotationsApi } from '@/services/api';
import {
  Plus,
  Search,
  Filter,
  Eye,
  FileText,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
} from 'lucide-react';
import {
  formatCurrency,
  formatDate,
  formatNumber,
  statusClass,
  statusLabel,
} from '@/lib/quotation';

const STATUS_OPTIONS = [
  'draft',
  'pending_approval',
  'approved',
  'sent',
  'viewed',
  'accepted',
  'rejected',
  'expired',
  'converted_to_order',
];

export default function QuotationsList() {
  const [quotations, setQuotations] = useState([]);
  const [summary, setSummary] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [expiring, setExpiring] = useState(false);

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [systemType, setSystemType] = useState('all');

  const loadSummary = useCallback(async () => {
    try {
      const res = await quotationsApi.getDashboard();
      setSummary(res.data?.summary || null);
    } catch (err) {
      // The list is still usable if the KPI endpoint fails.
      setSummary(null);
    }
  }, []);

  const loadQuotations = useCallback(
    async (page = 1) => {
      try {
        setLoading(true);
        setError(null);
        const res = await quotationsApi.getQuotations({
          search: search || undefined,
          status: status !== 'all' ? status : undefined,
          system_type: systemType !== 'all' ? systemType : undefined,
          page,
          limit: 15,
        });
        setQuotations(res.data?.quotations || []);
        setPagination(res.data?.pagination || { page: 1, totalPages: 1, total: 0 });
      } catch (err) {
        setError(err?.message || 'Failed to load quotations.');
      } finally {
        setLoading(false);
      }
    },
    [search, status, systemType]
  );

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  useEffect(() => {
    loadQuotations(1);
  }, [loadQuotations]);

  const handleSearch = (event) => {
    event.preventDefault();
    loadQuotations(1);
  };

  const handleExpire = async () => {
    if (!window.confirm('Mark all past-validity quotations as expired?')) return;
    try {
      setExpiring(true);
      setNotice(null);
      const res = await quotationsApi.expireQuotations();
      setNotice(`${res.data ?? 0} quotation(s) marked as expired.`);
      await Promise.all([loadQuotations(pagination.page), loadSummary()]);
    } catch (err) {
      setError(err?.message || 'Failed to expire quotations.');
    } finally {
      setExpiring(false);
    }
  };

  const stats = [
    { label: 'Total quotations', value: summary?.total ?? 0, meta: formatCurrency(summary?.total_value) },
    { label: 'Pending approval', value: summary?.pending_approval ?? 0, meta: formatCurrency(summary?.pending_approval_value), accent: true },
    { label: 'Sent / viewed', value: (summary?.sent ?? 0) + (summary?.viewed ?? 0), meta: 'Awaiting customer decision' },
    { label: 'Accepted value', value: formatCurrency(summary?.accepted_value), meta: `${summary?.acceptance_rate ?? 0}% acceptance rate` },
    { label: 'Converted to orders', value: summary?.converted_to_order ?? 0, meta: `${summary?.conversion_rate ?? 0}% conversion` },
  ];

  return (
    <PortalLayout
      title="Quotations"
      subtitle="Build, approve and track solar quotations from survey to order"
      actions={
        <div className="q-page-actions">
          <button
            type="button"
            className="crm-btn crm-btn-secondary crm-btn-sm"
            onClick={handleExpire}
            disabled={expiring}
          >
            <RefreshCw size={14} className={expiring ? 'spin' : undefined} />
            <span>{expiring ? 'Expiring…' : 'Run expiry check'}</span>
          </button>
          <Link to="/sales/quotations/new" className="crm-btn crm-btn-primary crm-btn-sm">
            <Plus size={16} />
            <span>New Quotation</span>
          </Link>
        </div>
      }
    >
      <section className="q-stats-grid">
        {stats.map((stat) => (
          <div key={stat.label} className={`q-stat-card ${stat.accent ? 'accent' : ''}`}>
            <span className="q-stat-label">{stat.label}</span>
            <span className="q-stat-value">{stat.value}</span>
            <span className="q-stat-meta">{stat.meta}</span>
          </div>
        ))}
      </section>

      {notice && <div className="q-alert success">{notice}</div>}
      {error && (
        <div className="q-alert error">
          <AlertTriangle size={15} style={{ verticalAlign: '-2px', marginRight: 6 }} />
          {error}
        </div>
      )}

      <form className="q-filter-bar" onSubmit={handleSearch}>
        <div className="q-search">
          <Search size={16} style={{ color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Search quotation code, customer or address…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <select className="q-select" value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="all">All statuses</option>
          {STATUS_OPTIONS.map((value) => (
            <option key={value} value={value}>
              {statusLabel(value)}
            </option>
          ))}
        </select>
        <select
          className="q-select"
          value={systemType}
          onChange={(event) => setSystemType(event.target.value)}
        >
          <option value="all">All systems</option>
          <option value="on-grid">On-grid</option>
          <option value="off-grid">Off-grid</option>
          <option value="hybrid">Hybrid</option>
        </select>
        <button type="submit" className="crm-btn crm-btn-secondary crm-btn-sm">
          <Filter size={14} /> Filter
        </button>
      </form>

      <div className="crm-card" style={{ padding: 0 }}>
        {loading ? (
          <div className="q-loading">Loading quotations…</div>
        ) : quotations.length === 0 ? (
          <div className="q-empty">
            <FileText size={28} style={{ opacity: 0.4, marginBottom: 8 }} />
            <div>No quotations found. Create your first quotation to get started.</div>
          </div>
        ) : (
          <div className="crm-table-container">
            <table className="crm-table">
              <thead>
                <tr>
                  <th>Quotation</th>
                  <th>Customer</th>
                  <th>System</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th>Validity</th>
                  <th>Created</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {quotations.map((quotation) => (
                  <tr key={quotation.id}>
                    <td>
                      <b style={{ color: 'var(--accent-text)' }}>{quotation.quotation_code}</b>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                        {quotation.approval_required ? 'Approval required' : 'Standard'}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text-strong)' }}>
                        {quotation.customer?.company_name || quotation.customer?.contact_name || 'Customer'}
                      </div>
                      <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                        {quotation.customer?.customer_code || quotation.customer?.phone || '—'}
                      </div>
                    </td>
                    <td>
                      <div style={{ textTransform: 'capitalize' }}>{quotation.system_type?.replace('-', ' ')}</div>
                      <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                        {formatNumber(quotation.system_capacity_kw)} kW
                      </div>
                    </td>
                    <td style={{ fontWeight: 600, color: 'var(--text-strong)' }}>{formatCurrency(quotation.total_amount)}</td>
                    <td>
                      <span className={`q-badge ${statusClass(quotation.status)}`}>
                        {statusLabel(quotation.status)}
                      </span>
                    </td>
                    <td>{formatDate(quotation.validity_date)}</td>
                    <td>{formatDate(quotation.created_at)}</td>
                    <td>
                      <Link to={`/sales/quotations/${quotation.id}`} className="crm-btn crm-btn-outline crm-btn-sm">
                        <Eye size={14} /> View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {pagination.totalPages > 1 && (
          <div
            style={{
              padding: '16px 24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderTop: '1px solid rgba(var(--ink-rgb), 0.06)',
            }}
          >
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              Page {pagination.page} of {pagination.totalPages} ({pagination.total} quotations)
            </span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                disabled={pagination.page <= 1}
                onClick={() => loadQuotations(pagination.page - 1)}
                className="crm-btn crm-btn-secondary crm-btn-sm"
              >
                <ChevronLeft size={16} /> Prev
              </button>
              <button
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => loadQuotations(pagination.page + 1)}
                className="crm-btn crm-btn-secondary crm-btn-sm"
              >
                Next <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="q-order-summary">
        <div className="q-summary-cell">
          <small>Drafts</small>
          <b>{summary?.draft ?? 0}</b>
        </div>
        <div className="q-summary-cell">
          <small>Approved</small>
          <b>{summary?.approved ?? 0}</b>
        </div>
        <div className="q-summary-cell">
          <small>Accepted</small>
          <b>{summary?.accepted ?? 0}</b>
        </div>
        <div className="q-summary-cell">
          <small>Rejected / expired</small>
          <b>{(summary?.rejected ?? 0) + (summary?.expired ?? 0)}</b>
        </div>
      </div>
    </PortalLayout>
  );
}
