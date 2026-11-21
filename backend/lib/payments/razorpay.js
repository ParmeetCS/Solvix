import crypto from 'crypto';

// Minimal Razorpay client (REST + HMAC), no SDK needed. Works with rzp_test_* keys.
const API = 'https://api.razorpay.com/v1';

export function razorpayConfig() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) {
    const err = new Error('Online payments are not configured yet.');
    err.status = 503;
    throw err;
  }
  return { keyId, keySecret };
}

async function rzp(path, { method = 'GET', body } = {}) {
  const { keyId, keySecret } = razorpayConfig();
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      Authorization: 'Basic ' + Buffer.from(`${keyId}:${keySecret}`).toString('base64'),
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(json?.error?.description || 'Razorpay request failed.');
    err.status = 502;
    throw err;
  }
  return json;
}

export const createRazorpayOrder = (payload) => rzp('/orders', { method: 'POST', body: payload });
export const fetchRazorpayOrder = (id) => rzp(`/orders/${encodeURIComponent(id)}`);
export const fetchRazorpayPayment = (id) => rzp(`/payments/${encodeURIComponent(id)}`);

/** Checks the signature Razorpay Checkout returns: HMAC_SHA256(order_id|payment_id, secret). */
export function verifyCheckoutSignature(orderId, paymentId, signature) {
  const { keySecret } = razorpayConfig();
  const expected = crypto.createHmac('sha256', keySecret).update(`${orderId}|${paymentId}`).digest('hex');
  const a = Buffer.from(expected);
  const b = Buffer.from(String(signature || ''));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
