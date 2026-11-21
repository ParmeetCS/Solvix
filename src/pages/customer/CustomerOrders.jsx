import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import PortalLayout from '@/components/PortalLayout';
import { quotationsApi } from '@/services/api';
import { Eye, ShoppingCart, ChevronLeft, ChevronRight, AlertTriangle } from 'lucide-react';
import {
  formatCurrency,
  formatDate,
  formatNumber,
  statusClass,
  statusLabel,
} from '@/lib/quotation';

export default function CustomerOrders() {
  const [orders, setOrders] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      setError(null);
      const res = await quotationsApi.getMyOrders({ page, limit: 20 });
      setOrders(res.data?.orders || []);
      setPagination(res.data?.pagination || { page: 1, totalPages: 1, total: 0 });
    } catch (err) {
      setError(err?.message || 'Failed to load your orders.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(1);
  }, [load]);

  return (
    <PortalLayout title="My Orders" subtitle="Follow your order from confirmation to completion">
      {error && (
        <div className="q-alert error">
          <AlertTriangle size={15} style={{ verticalAlign: '-2px', marginRight: 6 }} />
          {error}
        </div>
      )}

      <div className="crm-card" style={{ padding: 0 }}>
        {loading ? (
          <div className="q-loading">Loading your orders…</div>
        ) : orders.length === 0 ? (
          <div className="q-empty">
            <ShoppingCart size={28} style={{ opacity: 0.4, marginBottom: 8 }} />
            <div>You have no orders yet. Accept a quotation to create your first order.</div>
          </div>
        ) : (
          <div className="crm-table-container">
            <table className="crm-table">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Quotation</th>
                  <th>System</th>
                  <th>Total</th>
                  <th>Paid</th>
                  <th>Balance</th>
                  <th>Payment</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id}>
                    <td>
                      <b style={{ color: 'var(--accent-text)' }}>{order.order_code}</b>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                        {formatDate(order.created_at)}
                      </div>
                    </td>
                    <td>{order.quotation?.quotation_code || '—'}</td>
                    <td>
                      <div style={{ textTransform: 'capitalize' }}>{order.system_type?.replace('-', ' ')}</div>
                      <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                        {formatNumber(order.system_capacity_kw)} kW
                      </div>
                    </td>
                    <td>{formatCurrency(order.total_amount)}</td>
                    <td>{formatCurrency(order.advance_paid)}</td>
                    <td style={{ color: Number(order.balance_due) > 0 ? 'var(--c-amber-soft)' : 'var(--c-green-soft)' }}>
                      {formatCurrency(order.balance_due)}
                    </td>
                    <td>
                      <span className={`q-badge ${statusClass(order.payment_status, 'payment')}`}>
                        {statusLabel(order.payment_status, 'payment')}
                      </span>
                    </td>
                    <td>
                      <span className={`q-badge ${statusClass(order.status, 'order')}`}>
                        {statusLabel(order.status, 'order')}
                      </span>
                    </td>
                    <td>
                      <Link to={`/customer/orders/${order.id}`} className="crm-btn crm-btn-outline crm-btn-sm">
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
    </PortalLayout>
  );
}
