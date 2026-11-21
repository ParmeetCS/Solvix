import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import CustomerPortalLayout from './CustomerPortalLayout';
import { quotationsApi } from '@/services/api';
import { Eye, FileText, Download, ChevronLeft, ChevronRight, AlertTriangle } from 'lucide-react';
import {
  downloadBlob,
  formatCurrency,
  formatDate,
  formatNumber,
  statusClass,
  statusLabel,
} from '@/lib/quotation';

export default function CustomerQuotations() {
  const [quotations, setQuotations] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [downloading, setDownloading] = useState(null);

  const load = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      setError(null);
      const res = await quotationsApi.getMyQuotations({ page, limit: 20 });
      setQuotations(res.data?.quotations || []);
      setPagination(res.data?.pagination || { page: 1, totalPages: 1, total: 0 });
    } catch (err) {
      setError(err?.message || 'Failed to load your quotations.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(1);
  }, [load]);

  const handleDownload = async (quotation) => {
    try {
      setDownloading(quotation.id);
      const blob = await quotationsApi.downloadMyQuotationPdf(quotation.id);
      downloadBlob(blob, `${quotation.quotation_code}.pdf`);
    } catch (err) {
      setError(err?.message || 'Failed to download quotation PDF.');
    } finally {
      setDownloading(null);
    }
  };

  return (
    <CustomerPortalLayout
      title="My Quotations"
      subtitle="Review, download and respond to your SOLVIX solar quotations"
    >
      {error && (
        <div className="q-alert error">
          <AlertTriangle size={15} style={{ verticalAlign: '-2px', marginRight: 6 }} />
          {error}
        </div>
      )}

      <div className="crm-card" style={{ padding: 0 }}>
        {loading ? (
          <div className="q-loading">Loading your quotations…</div>
        ) : quotations.length === 0 ? (
          <div className="q-empty">
            <FileText size={28} style={{ opacity: 0.4, marginBottom: 8 }} />
            <div>You have no quotations yet. Your SOLVIX representative will share one here.</div>
          </div>
        ) : (
          <div className="crm-table-container">
            <table className="crm-table">
              <thead>
                <tr>
                  <th>Quotation</th>
                  <th>System</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th>Valid until</th>
                  <th>Order</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {quotations.map((quotation) => (
                  <tr key={quotation.id}>
                    <td>
                      <b style={{ color: '#d8ee8e' }}>{quotation.quotation_code}</b>
                      <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                        Issued {formatDate(quotation.created_at)}
                      </div>
                    </td>
                    <td>
                      <div style={{ textTransform: 'capitalize' }}>{quotation.system_type?.replace('-', ' ')}</div>
                      <div style={{ fontSize: '0.74rem', color: '#94a3b8' }}>
                        {formatNumber(quotation.system_capacity_kw)} kW
                      </div>
                    </td>
                    <td style={{ fontWeight: 600, color: '#fff' }}>{formatCurrency(quotation.total_amount)}</td>
                    <td>
                      <span className={`q-badge ${statusClass(quotation.status)}`}>
                        {statusLabel(quotation.status)}
                      </span>
                    </td>
                    <td>{formatDate(quotation.validity_date)}</td>
                    <td>
                      {quotation.order ? (
                        <Link to={`/customer/orders/${quotation.order.id}`} className="q-badge success">
                          {quotation.order.order_code}
                        </Link>
                      ) : (
                        <span className="q-badge muted">Not created</span>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        <Link to={`/customer/quotations/${quotation.id}`} className="crm-btn crm-btn-outline crm-btn-sm">
                          <Eye size={14} /> View
                        </Link>
                        <button
                          type="button"
                          className="crm-btn crm-btn-secondary crm-btn-sm"
                          onClick={() => handleDownload(quotation)}
                          disabled={downloading === quotation.id}
                        >
                          <Download size={14} /> PDF
                        </button>
                      </div>
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
              borderTop: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            <span style={{ fontSize: '0.82rem', color: '#94a3b8' }}>
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                disabled={pagination.page <= 1}
                onClick={() => load(pagination.page - 1)}
                className="crm-btn crm-btn-secondary crm-btn-sm"
              >
                <ChevronLeft size={16} /> Prev
              </button>
              <button
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => load(pagination.page + 1)}
                className="crm-btn crm-btn-secondary crm-btn-sm"
              >
                Next <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </CustomerPortalLayout>
  );
}
