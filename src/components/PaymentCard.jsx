import { useState } from 'react';
import { CreditCard, ShieldCheck } from 'lucide-react';
import { quotationsApi } from '@/services/api';
import { formatCurrency } from '@/lib/quotation';

// Razorpay Checkout (test mode while the backend uses rzp_test_* keys).
function loadCheckout() {
  if (window.Razorpay) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload = resolve;
    s.onerror = () => reject(new Error('Could not load the payment window. Check your connection and try again.'));
    document.body.appendChild(s);
  });
}

/**
 * Pay-in-full or pay-part card for a customer's order.
 * - orderId: the order to pay. If the order does not exist yet (quotation not accepted),
 *   pass ensureOrder(): an async function that creates it and returns its id.
 * - total / balance: shown to the customer; the server re-checks every amount.
 * - onPaid(): called after the payment is verified and recorded.
 */
export default function PaymentCard({ orderId, ensureOrder, total, balance, onPaid, onError, disabled = false, title = 'Pay online' }) {
  const bal = Number(balance) || 0;
  const [mode, setMode] = useState('partial');
  const [amount, setAmount] = useState(() => String(Math.max(1, Math.round(bal * 0.3))));
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);

  if (!(bal > 0)) return null;

  const presets = [30, 50, 75].map((pct) => ({ pct, value: Math.round(bal * (pct / 100)) })).filter((p) => p.value >= 1 && p.value < bal);
  const payAmount = mode === 'full' ? bal : Number(amount);
  const invalid = mode === 'partial' && (!Number.isFinite(payAmount) || payAmount < 1 || payAmount >= bal);

  const fail = (msg) => {
    setMessage({ type: 'error', text: msg });
    onError?.(msg);
  };

  async function pay() {
    if (invalid) return fail(`Enter an amount between ₹1 and ${formatCurrency(bal - 1)}.`);
    setBusy(true);
    setMessage(null);
    try {
      const id = orderId || (await ensureOrder?.());
      if (!id) throw new Error('Your order is not ready yet.');
      await loadCheckout();
      const res = await quotationsApi.createPaymentOrder(id, { mode, amount: mode === 'partial' ? payAmount : undefined });
      const o = res.data;

      await new Promise((resolve, reject) => {
        const rzp = new window.Razorpay({
          key: o.key_id,
          amount: o.amount,
          currency: o.currency,
          name: 'SOLVIX',
          description: `${mode === 'full' ? 'Full payment' : 'Part payment'} · ${o.order_code}`,
          order_id: o.razorpay_order_id,
          prefill: { name: o.customer?.name, email: o.customer?.email, contact: o.customer?.phone },
          theme: { color: '#0f766e' },
          modal: { ondismiss: () => reject(new Error('Payment cancelled.')) },
          handler: async (response) => {
            try {
              await quotationsApi.verifyPayment(id, response);
              resolve();
            } catch (err) {
              reject(err);
            }
          },
        });
        rzp.on('payment.failed', (r) => reject(new Error(r?.error?.description || 'Payment failed.')));
        rzp.open();
      });

      setMessage({ type: 'success', text: 'Payment successful. Thank you!' });
      await onPaid?.();
    } catch (err) {
      fail(err?.message || 'Payment could not be completed.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="q-panel q-no-print">
      <div className="q-panel-header">
        <span className="q-panel-title"><CreditCard size={15} style={{ verticalAlign: '-2px', marginRight: 6 }} />{title}</span>
      </div>
      <div className="q-panel-body">
        <div style={{ display: 'grid', gap: 10 }}>
          <label style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '10px 12px', border: '1px solid var(--line, rgba(128,128,128,.3))', borderRadius: 10, cursor: 'pointer' }}>
            <input type="radio" name="pay-mode" checked={mode === 'full'} onChange={() => setMode('full')} />
            <span style={{ flex: 1 }}>Pay in full</span>
            <b>{formatCurrency(bal)}</b>
          </label>
          <label style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '10px 12px', border: '1px solid var(--line, rgba(128,128,128,.3))', borderRadius: 10, cursor: 'pointer' }}>
            <input type="radio" name="pay-mode" checked={mode === 'partial'} onChange={() => setMode('partial')} />
            <span style={{ flex: 1 }}>Pay part now, rest later</span>
          </label>
          {mode === 'partial' && (
            <div style={{ paddingLeft: 4 }}>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                {presets.map((p) => (
                  <button key={p.pct} type="button" className="crm-btn crm-btn-secondary crm-btn-sm" onClick={() => setAmount(String(p.value))}>
                    {p.pct}% · {formatCurrency(p.value)}
                  </button>
                ))}
              </div>
              <div className="q-field">
                <label htmlFor="pay-amount">Amount (₹)</label>
                <input id="pay-amount" type="number" min="1" max={bal - 1} step="1" className="q-input crm-input" value={amount} onChange={(e) => setAmount(e.target.value)} />
              </div>
              <p className="q-hint">Balance after this payment: {formatCurrency(Math.max(bal - (Number(amount) || 0), 0))}</p>
            </div>
          )}
        </div>

        {message && (
          <div className={`q-alert ${message.type === 'success' ? 'success' : 'error'}`} style={{ marginTop: 12 }}>{message.text}</div>
        )}

        <button type="button" className="crm-btn crm-btn-primary" style={{ marginTop: 12, width: '100%', justifyContent: 'center' }} onClick={pay} disabled={busy || disabled || invalid}>
          {busy ? 'Opening payment…' : `Pay ${formatCurrency(mode === 'full' ? bal : (Number(amount) || 0))}`}
        </button>
        <p className="q-hint" style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <ShieldCheck size={14} /> Secure payment by Razorpay (test mode{total ? ` · order total ${formatCurrency(total)}` : ''}).
        </p>
      </div>
    </section>
  );
}
