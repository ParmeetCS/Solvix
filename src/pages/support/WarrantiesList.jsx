import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import PortalLayout from '@/components/PortalLayout';
import { supportApi } from '@/services/api';
import {
  ShieldCheck,
  ShieldAlert,
  Search,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

export default function WarrantiesList() {
  const [warranties, setWarranties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Quick Verification Bar State
  const [verifySerial, setVerifySerial] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState(null);

  useEffect(() => {
    fetchWarranties();
  }, [page, status]);

  const fetchWarranties = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await supportApi.getWarranties({ page, limit: 15, search, status });
      const data = res.data || res;
      setWarranties(data.warranties || []);
      setTotalPages(data.totalPages || 1);
      setTotalCount(data.total || 0);
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Failed to load warranties.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchWarranties();
  };

  const handleQuickVerify = async (e) => {
    e.preventDefault();
    if (!verifySerial.trim()) return;

    try {
      setVerifying(true);
      setVerifyResult(null);
      const res = await supportApi.verifyWarranty(verifySerial.trim());
      setVerifyResult(res.data || res);
    } catch (err) {
      setVerifyResult({
        found: false,
        message: err?.response?.data?.message || 'Verification lookup failed.'
      });
    } finally {
      setVerifying(false);
    }
  };

  return (
    <PortalLayout
      title="Equipment Warranty Verification Registry"
      subtitle="Strictly verified from warehouse equipment delivery records according to configured manufacturer terms"
    >
      {/* Critical Milestone Rule Banner */}
      <div className="warranty-verify-box" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', marginBottom: '1rem' }}>
          <ShieldCheck size={24} color="var(--accent-text)" style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>
            <h3 style={{ margin: '0 0 0.25rem 0', color: 'var(--text-strong)', fontSize: '1rem' }}>
              Core Warranty Rule: Delivery Date Precedence
            </h3>
            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.8125rem', lineHeight: 1.5 }}>
              Under SOLVIX policy, the warranty period activates on the <strong>equipment delivery date</strong> recorded by logistics, not the later installation completion date. Warranty durations strictly reflect configured manufacturer terms.
            </p>
          </div>
        </div>

        {/* Live Serial Lookup Tool */}
        <form onSubmit={handleQuickVerify} style={{ display: 'flex', gap: '0.5rem', maxWidth: '600px' }}>
          <input
            type="text"
            className="support-search-input"
            placeholder="Verify serial number (e.g. SLX-INV-2024-8841)..."
            value={verifySerial}
            onChange={(e) => setVerifySerial(e.target.value)}
          />
          <button type="submit" className="btn-primary" disabled={verifying}>
            {verifying ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
            <span>Verify Live</span>
          </button>
        </form>

        {/* Live Verification Result Box */}
        {verifyResult && (
          <div
            style={{
              marginTop: '1rem',
              padding: '1.25rem',
              borderRadius: '8px',
              background: verifyResult.found ? 'rgba(52, 211, 153, 0.08)' : 'rgba(239, 68, 68, 0.08)',
              border: `1px solid ${verifyResult.found ? 'rgba(52, 211, 153, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
            }}
          >
            {verifyResult.found ? (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--c-green)', fontWeight: 600 }}>
                    <CheckCircle2 size={18} />
                    <span>Serial: {verifyResult.serial_number}</span>
                  </div>
                  <span className={`badge badge-warranty-${verifyResult.verification?.status}`}>
                    {verifyResult.verification?.status}
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem', fontSize: '0.8125rem', color: 'var(--text-soft)' }}>
                  <div>Product: <strong>{verifyResult.product?.name}</strong></div>
                  <div>Customer: <strong>{verifyResult.customer?.contact_name}</strong></div>
                  <div>Delivery Date: <strong>{verifyResult.delivery?.delivered_at ? new Date(verifyResult.delivery.delivered_at).toLocaleDateString() : 'N/A'}</strong></div>
                  <div>Duration: <strong>{verifyResult.verification?.warranty_duration_years} Years</strong></div>
                  <div>Expiry Date: <strong>{verifyResult.verification?.expiry_date}</strong></div>
                  <div>Claim Eligible: <strong style={{ color: verifyResult.verification?.eligible_for_claim ? 'var(--c-green)' : 'var(--c-red)' }}>{verifyResult.verification?.eligible_for_claim ? 'YES' : 'NO (Expired or Inactive)'}</strong></div>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--c-red)', fontSize: '0.875rem' }}>
                <AlertCircle size={18} />
                <span>{verifyResult.message}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Filters Bar */}
      <form onSubmit={handleSearchSubmit} className="support-filters-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: '240px' }}>
          <Search size={16} color="var(--text-muted)" />
          <input
            type="text"
            className="support-search-input"
            placeholder="Search warranty code or terms..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select
          className="support-select"
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
        >
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="expired">Expired</option>
          <option value="pending_activation">Pending Activation</option>
          <option value="claim_under_review">Claim Under Review</option>
          <option value="claimed">Claimed</option>
        </select>

        <button type="submit" className="btn-secondary" style={{ padding: '0.55rem 1rem' }}>
          Search
        </button>
      </form>

      {/* Warranties Table */}
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
      ) : warranties.length === 0 ? (
        <div className="support-card" style={{ textAlign: 'center', padding: '3rem 1rem' }}>
          <ShieldAlert size={40} color="var(--text-dim)" style={{ margin: '0 auto 1rem auto' }} />
          <h3 style={{ color: 'var(--text-strong)', margin: '0 0 0.5rem 0' }}>No warranty records found</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            No warranties matched the query criteria.
          </p>
        </div>
      ) : (
        <div className="support-card" style={{ padding: 0 }}>
          <div className="support-table-container">
            <table className="support-table">
              <thead>
                <tr>
                  <th>Warranty Code</th>
                  <th>Serial Number</th>
                  <th>Product</th>
                  <th>Customer</th>
                  <th>Duration</th>
                  <th>Start Date (Delivery)</th>
                  <th>Expiry Date</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {warranties.map((w) => (
                  <tr key={w.id}>
                    <td style={{ fontWeight: 600, color: 'var(--accent-text)' }}>
                      <Link to={`/support/warranties/${w.id}`} style={{ color: 'var(--accent-text)', textDecoration: 'none' }}>
                        {w.warranty_code}
                      </Link>
                    </td>
                    <td style={{ color: 'var(--c-blue)', fontWeight: 500 }}>
                      {w.equipment_serial_numbers?.serial_number || '—'}
                    </td>
                    <td>
                      {w.equipment_serial_numbers?.products?.name || 'Solar PV Hardware'}
                    </td>
                    <td>
                      {w.customers?.contact_name || 'Customer'}
                    </td>
                    <td>{w.duration_years} Years</td>
                    <td style={{ fontSize: '0.8125rem', color: 'var(--text-soft)' }}>
                      {w.start_date || '—'}
                    </td>
                    <td style={{ fontSize: '0.8125rem', color: w.computed_status === 'expired' ? 'var(--c-red)' : 'var(--text-soft)' }}>
                      {w.expiry_date || '—'}
                    </td>
                    <td>
                      <span className={`badge badge-warranty-${w.computed_status}`}>
                        {w.computed_status}
                      </span>
                    </td>
                    <td>
                      <Link
                        to={`/support/warranties/${w.id}`}
                        className="btn-secondary"
                        style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem' }}
                      >
                        Inspect
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

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
