import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ShoppingCart, FileText, MapPin, ShieldCheck, Hammer, ArrowRight } from 'lucide-react';
import PortalLayout from '@/components/PortalLayout';
import { ChartCard, StripedBars, TickDonut } from '@/components/charts';
import { customerApi } from '@/services/api';
import { useAuth } from '@/context/auth';
import { formatCurrency, formatDate, statusClass, statusLabel, titleCase } from '@/lib/quotation';

// Everything below is read from the signed-in customer's own records.
// Nothing is estimated or invented: an empty account shows empty states.
export default function CustomerDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState([]);

  const load = useCallback(async () => {
    setLoading(true);
    const calls = {
      orders: customerApi.getOrders({ limit: 50 }),
      quotations: customerApi.getQuotations({ limit: 50 }),
      installations: customerApi.getInstallations(),
      warranties: customerApi.getWarranties({ limit: 50 }),
      tickets: customerApi.getTickets({ limit: 50 }),
    };
    const keys = Object.keys(calls);
    const settled = await Promise.allSettled(Object.values(calls));
    const next = {};
    const failed = [];
    settled.forEach((r, i) => {
      if (r.status === 'fulfilled') next[keys[i]] = r.value?.data || {};
      else failed.push(`${keys[i]}: ${r.reason?.message || 'failed to load'}`);
    });
    setData(next);
    setErrors(failed);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const orders = data?.orders?.orders || [];
  const quotations = data?.quotations?.quotations || [];
  const installations = data?.installations?.installations || [];
  const warranties = data?.warranties?.warranties || [];
  const tickets = data?.tickets?.tickets || [];

  const orderValue = orders.reduce((s, o) => s + (Number(o.total_amount) || 0), 0);
  const paid = orders.reduce((s, o) => s + (Number(o.advance_paid) || 0), 0);
  const balance = orders.reduce((s, o) => s + (Number(o.balance_due) || 0), 0);
  const openQuotes = quotations.filter((q) => ['sent', 'viewed', 'approved'].includes(q.status)).length;
  const activeWarranties = warranties.filter((w) => w.status === 'active').length;
  const openTickets = tickets.filter((t) => !['resolved', 'closed'].includes(t.status)).length;
  const activeInstall = installations.find((i) => ['scheduled', 'in_progress', 'on_hold'].includes(i.status));

  const cards = [
    { icon: ShoppingCart, label: 'Orders', value: orders.length, meta: orders.length ? `${formatCurrency(orderValue)} total value` : 'No orders yet', to: '/customer/orders' },
    { icon: FileText, label: 'Quotations awaiting you', value: openQuotes, meta: `${quotations.length} in total`, to: '/customer/quotations' },
    { icon: MapPin, label: 'Installations', value: installations.length, meta: activeInstall ? `${statusLabelInstall(activeInstall.status)}` : 'None in progress', to: '/customer/installation' },
    { icon: ShieldCheck, label: 'Active warranties', value: activeWarranties, meta: `${warranties.length} registered`, to: '/customer/warranty' },
    { icon: Hammer, label: 'Open service requests', value: openTickets, meta: `${tickets.length} in total`, to: '/customer/service-requests' },
  ];

  return (
    <PortalLayout
      title={`Welcome${user?.full_name ? `, ${user.full_name.split(' ')[0]}` : ''}`}
      subtitle="Your solar project at a glance"
      actions={<button className="crm-btn crm-btn-secondary crm-btn-sm" onClick={load}>Refresh</button>}
    >
      {errors.length > 0 && (
        <div className="q-alert error">
          <AlertTriangle size={15} style={{ verticalAlign: '-2px', marginRight: 6 }} />
          Some information could not be loaded ({errors.join('; ')}).
        </div>
      )}

      {loading ? (
        <div className="q-loading">Loading your account…</div>
      ) : (
        <>
          <div className="crm-stats-grid">
            {cards.map(({ icon: Icon, label, value, meta, to }) => (
              <Link key={label} to={to} className="crm-stat-box" style={{ textDecoration: 'none' }}>
                <div className="crm-stat-label"><Icon size={14} style={{ verticalAlign: '-2px', marginRight: 6 }} />{label}</div>
                <div className="crm-stat-value">{value}</div>
                <div className="crm-stat-meta">{meta}</div>
              </Link>
            ))}
          </div>

          {orders.length > 0 && (
            <div className="sx-grid cols-32" style={{ marginTop: 20 }}>
              <ChartCard title="Your orders" note="Order value">
                <StripedBars data={orders.slice(0, 8).map((o) => ({ label: o.order_code?.slice(-5) || '', value: Number(o.total_amount) || 0, value2: Number(o.advance_paid) || 0 }))} />
              </ChartCard>
              <ChartCard title="Payment progress">
                <TickDonut centerLabel="Order value" centerValue={formatCurrency(orderValue)}
                  items={[{ label: 'Paid', value: paid, display: formatCurrency(paid) }, { label: 'Balance', value: balance, display: formatCurrency(balance) }]} />
              </ChartCard>
            </div>
          )}

          {orders.length > 0 && (
            <div className="crm-card" style={{ marginTop: 20 }}>
              <div className="crm-card-header"><div className="crm-card-title">Payments across your orders</div></div>
              <div className="crm-stats-grid">
                <div className="crm-stat-box"><div className="crm-stat-label">Order value</div><div className="crm-stat-value">{formatCurrency(orderValue)}</div></div>
                <div className="crm-stat-box"><div className="crm-stat-label">Paid</div><div className="crm-stat-value" style={{ color: 'var(--c-green-soft)' }}>{formatCurrency(paid)}</div></div>
                <div className="crm-stat-box"><div className="crm-stat-label">Balance due</div><div className="crm-stat-value" style={{ color: balance > 0 ? 'var(--c-amber-soft)' : 'var(--c-green-soft)' }}>{formatCurrency(balance)}</div></div>
              </div>
            </div>
          )}

          <div className="crm-card" style={{ marginTop: 20, padding: 0 }}>
            <div className="crm-card-header" style={{ padding: '16px 20px 0' }}>
              <div className="crm-card-title">Recent orders</div>
              <Link to="/customer/orders" className="crm-btn crm-btn-outline crm-btn-sm">View all <ArrowRight size={14} /></Link>
            </div>
            {orders.length === 0 ? (
              <div className="q-empty">You have no orders yet. When you accept a quotation, your order appears here.</div>
            ) : (
              <div className="crm-table-container">
                <table className="crm-table">
                  <thead><tr><th>Order</th><th>System</th><th>Total</th><th>Balance</th><th>Status</th></tr></thead>
                  <tbody>
                    {orders.slice(0, 5).map((o) => (
                      <tr key={o.id}>
                        <td><Link to={`/customer/orders/${o.id}`} style={{ color: 'var(--accent-text)', fontWeight: 600 }}>{o.order_code}</Link><div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>{formatDate(o.created_at)}</div></td>
                        <td>{o.system_capacity_kw ? `${Number(o.system_capacity_kw)} kW ${titleCase(o.system_type || '')}` : '—'}</td>
                        <td>{formatCurrency(o.total_amount)}</td>
                        <td>{formatCurrency(o.balance_due)}</td>
                        <td><span className={`q-badge ${statusClass(o.status, 'order')}`}>{statusLabel(o.status, 'order')}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </PortalLayout>
  );
}

function statusLabelInstall(status) {
  return titleCase(String(status || '').replace(/_/g, ' '));
}
