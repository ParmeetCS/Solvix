import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import PortalLayout from '@/components/PortalLayout';
import { quotationsApi } from '@/services/api';
import {
  Search,
  Filter,
  Eye,
  ShoppingCart,
  ChevronLeft,
  ChevronRight,
  Warehouse,
  AlertTriangle,
} from 'lucide-react';
import {
  formatCurrency,
  formatDate,
  formatNumber,
  statusClass,
  statusLabel,
} from '@/lib/quotation';

const ORDER_STATUS_OPTIONS = [
  'pending_payment',
  'confirmed',
  'processing',
  'awaiting_dispatch',
  'dispatched',
  'ready_for_install',
  'installation_in_progress',
  'completed',
  'cancelled',
];

export default function OrdersList() {
  const [orders, setOrders] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [paymentStatus, setPaymentStatus] = useState('all');
  const [warehouseReady, setWarehouseReady] = useState(false);

  const loadOrders = useCallback(
    async (page = 1) => {
      try {
        setLoading(true);
        setError(null);
        const res = await quotationsApi.getOrders({
          search: search || undefined,
          status: status !== 'all' ? status : undefined,
          payment_status: paymentStatus !== 'all' ? paymentStatus : undefined,
          warehouse_ready: warehouseReady ? 'true' : undefined,
          page,
          limit: 15,
        });
        setOrders(res.data?.orders || []);
        setPagination(res.data?.pagination || { page: 1, totalPages: 1, total: 0 });
      } catch (err) {
        setError(err?.message || 'Failed to load orders.');
      } finally {
        setLoading(false);
      }
    },
    [search, status, paymentStatus, warehouseReady]
  );

  useEffect(() => {
    loadOrders(1);
  }, [loadOrders]);

  const handleSearch = (event) => {
    event.preventDefault();
    loadOrders(1);
  };

  const totals = orders.reduce(
    (acc, order) => {
      acc.value += Number(order.total_amount) || 0;
      acc.balance += Number(order.balance_due) || 0;
      if (order.warehouse_handoff_at) acc.handedOff += 1;
      return acc;
    },
    { value: 0, balance: 0, handedOff: 0 }
  );

  return (
    <PortalLayout
      title="Orders"
      subtitle="Track accepted quotations through payment, dispatch and warehouse handoff"
    >
      <section className="q-stats-grid">
        <div className="q-stat-card">
          <span className="q-stat-label">Orders on this page</span>
          <span className="q-stat-value">{pagination.total}</span>
          <span className="q-stat-meta">Matching the current filters</span>
        </div>
        <div className="q-stat-card">
          <span className="q-stat-label">Order value</span>
          <span className="q-stat-value">{formatCurrency(totals.value)}</span>
          <span className="q-stat-meta">Visible orders</span>
        </div>
        <div className="q-stat-card accent">
          <span className="q-stat-label">Balance due</span>
          <span className="q-stat-value">{formatCurrency(totals.balance)}</span>
          <span className="q-stat-meta">Across visible orders</span>
        </div>
        <div className="q-stat-card">
          <span className="q-stat-label">Warehouse ready</span>
          <span className="q-stat-value">{totals.handedOff}</span>
          <span className="q-stat-meta">Handed off on this page</span>
        </div>
      </section>

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
            placeholder="Search order code, quotation or customer…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <select className="q-select" value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="all">All statuses</option>
          {ORDER_STATUS_OPTIONS.map((value) => (
            <option key={value} value={value}>
              {statusLabel(value, 'order')}
            </option>
          ))}
        </select>
        <select
          className="q-select"
          value={paymentStatus}
          onChange={(event) => setPaymentStatus(event.target.value)}
        >
          <option value="all">All payments</option>
          <option value="pending">Pending</option>
          <option value="partial">Partially paid</option>
          <option value="paid">Paid</option>
          <option value="overdue">Overdue</option>
          <option value="refunded">Refunded</option>
        </select>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-soft)', fontSize: '0.84rem' }}>
          <input
            type="checkbox"
            checked={warehouseReady}
            onChange={(event) => setWarehouseReady(event.target.checked)}
          />
          Warehouse ready only
        </label>
        <button type="submit" className="crm-btn crm-btn-secondary crm-btn-sm">
          <Filter size={14} /> Filter
        </button>
      </form>

      <div className="crm-card" style={{ padding: 0 }}>
        {loading ? (
          <div className="q-loading">Loading orders…</div>
        ) : orders.length === 0 ? (
          <div className="q-empty">
            <ShoppingCart size={28} style={{ opacity: 0.4, marginBottom: 8 }} />
            <div>No orders found. Orders appear here after a quotation is accepted.</div>
          </div>
        ) : (
          <div className="crm-table-container">
            <table className="crm-table">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Customer</th>
                  <th>System</th>
                  <th>Total</th>
                  <th>Paid</th>
                  <th>Balance</th>
                  <th>Payment</th>
                  <th>Status</th>
                  <th>Warehouse</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id}>
                    <td>
                      <b style={{ color: 'var(--accent-text)' }}>{order.order_code}</b>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                        {order.quotation?.quotation_code || formatDate(order.created_at)}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text-strong)' }}>
                        {order.customer?.company_name || order.customer?.contact_name || 'Customer'}
                      </div>
                      <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                        {order.customer?.customer_code || order.customer?.phone || '—'}
                      </div>
                    </td>
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
                      {order.warehouse_handoff_at ? (
                        <span className="q-badge success">
                          <Warehouse size={12} /> Handed off
                        </span>
                      ) : (
                        <span className="q-badge muted">Pending</span>
                      )}
                    </td>
                    <td>
                      <Link to={`/sales/orders/${order.id}`} className="crm-btn crm-btn-outline crm-btn-sm">
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
              Page {pagination.page} of {pagination.totalPages} ({pagination.total} orders)
            </span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                disabled={pagination.page <= 1}
                onClick={() => loadOrders(pagination.page - 1)}
                className="crm-btn crm-btn-secondary crm-btn-sm"
              >
                <ChevronLeft size={16} /> Prev
              </button>
              <button
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => loadOrders(pagination.page + 1)}
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
