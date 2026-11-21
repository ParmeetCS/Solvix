import { useState } from 'react';
import { postJson } from '../api';

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');

  .solvix-quote-root {
    min-height: 100vh;
    background: #0F1623;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 24px 16px;
    font-family: 'Inter', system-ui, sans-serif;
  }

  .solvix-quote-card {
    width: 100%;
    max-width: 480px;
  }

  /* ── Back link ── */
  .solvix-back {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    color: #6B7A99;
    font-size: 13px;
    font-weight: 500;
    text-decoration: none;
    letter-spacing: 0.01em;
    margin-bottom: 32px;
    transition: color 0.15s;
  }
  .solvix-back:hover { color: #E8EDF5; }
  .solvix-back svg { flex-shrink: 0; }

  /* ── Brand mark ── */
  .solvix-brand {
    margin-bottom: 28px;
  }
  .solvix-wordmark {
    display: inline-flex;
    align-items: center;
    gap: 10px;
  }
  .solvix-icon {
    width: 32px;
    height: 32px;
    background: #4B9EFF;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .solvix-name {
    font-size: 17px;
    font-weight: 700;
    color: #E8EDF5;
    letter-spacing: 0.08em;
  }

  /* ── Heading ── */
  .solvix-heading {
    font-size: 26px;
    font-weight: 600;
    color: #E8EDF5;
    margin: 0 0 6px;
    letter-spacing: -0.02em;
    line-height: 1.2;
  }
  .solvix-subheading {
    font-size: 14px;
    color: #6B7A99;
    margin: 0 0 32px;
    line-height: 1.5;
    max-width: 380px;
  }

  /* ── Form surface ── */
  .solvix-form-surface {
    background: #1A2438;
    border: 1px solid #263150;
    border-radius: 14px;
    padding: 28px;
  }

  /* ── Fields ── */
  .solvix-field {
    margin-bottom: 18px;
  }
  .solvix-label {
    display: block;
    font-size: 12px;
    font-weight: 600;
    color: #8A98B8;
    letter-spacing: 0.04em;
    margin-bottom: 7px;
  }
  .solvix-required {
    color: #F87171;
    margin-left: 4px;
  }
  .solvix-input,
  .solvix-select,
  .solvix-textarea {
    width: 100%;
    box-sizing: border-box;
    background: #0F1623;
    border: 1px solid #263150;
    border-radius: 8px;
    padding: 11px 14px;
    font-size: 15px;
    font-family: inherit;
    color: #E8EDF5;
    outline: none;
    transition: border-color 0.15s, box-shadow 0.15s;
  }
  .solvix-input::placeholder,
  .solvix-textarea::placeholder { color: #3A4A6B; }
  .solvix-input:focus,
  .solvix-select:focus,
  .solvix-textarea:focus {
    border-color: #4B9EFF;
    box-shadow: 0 0 0 3px rgba(75, 158, 255, 0.12);
  }
  .solvix-select {
    appearance: none;
    cursor: pointer;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 14 14' fill='none'%3E%3Cpath d='M4.5 7L7 9.5L9.5 7' stroke='%238A98B8' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 12px center;
    background-size: 14px;
  }
  .solvix-textarea {
    resize: vertical;
    min-height: 110px;
    line-height: 1.5;
    vertical-align: top;
  }

  /* ── Required field grouping ── */
  .solvix-label-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 7px;
  }

  /* ── Primary button ── */
  .solvix-btn-primary {
    width: 100%;
    background: #4B9EFF;
    color: #0F1623;
    border: none;
    border-radius: 8px;
    padding: 12px;
    font-size: 15px;
    font-weight: 600;
    font-family: inherit;
    cursor: pointer;
    letter-spacing: 0.01em;
    transition: background 0.15s, transform 0.1s;
    margin-top: 8px;
  }
  .solvix-btn-primary:hover:not(:disabled) { background: #6BBAFF; }
  .solvix-btn-primary:active:not(:disabled) { transform: scale(0.99); }
  .solvix-btn-primary:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }

  /* ── Message ── */
  .solvix-message {
    margin-top: 14px;
    padding: 11px 14px;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 500;
    line-height: 1.4;
  }
  .solvix-message.ok {
    background: rgba(52, 211, 153, 0.1);
    border: 1px solid rgba(52, 211, 153, 0.25);
    color: #34D399;
  }
  .solvix-message.error {
    background: rgba(248, 113, 113, 0.1);
    border: 1px solid rgba(248, 113, 113, 0.25);
    color: #F87171;
  }
`;

export default function QuoteForm({ navigate }) {
  const [form, setForm] = useState({
    fullName: '',
    phone: '',
    email: '',
    address: '',
    systemType: '',
    capacity: '',
    monthlyBill: '',
    additional: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);

  const systemTypes = ['On-Grid', 'Off-Grid', 'Not Sure'];
  const capacities = ['1 kW', '2 kW', '3 kW', '4 kW', '5 kW', 'Not Sure'];

  const handleChange = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);
    try {
      const res = await postJson('/api/enquiries', form);
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message || data?.error || 'Unable to submit your enquiry. Please try again.');
      setMessage({ kind: 'ok', text: data?.message || 'Your enquiry has been submitted.' });
      setForm({ fullName: '', phone: '', email: '', address: '', systemType: '', capacity: '', monthlyBill: '', additional: '' });
    } catch (err) {
      setMessage({ kind: 'error', text: err.message || 'Unable to reach the server. Please try again later.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <style>{styles}</style>
      <div className="solvix-quote-root">
        <div className="solvix-quote-card">

          {/* Back link */}
          <a
            href="/"
            className="solvix-back"
            onClick={(e) => { e.preventDefault(); navigate('/'); }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M8.5 3L4.5 7L8.5 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Back to home
          </a>

          {/* Brand mark */}
          <div className="solvix-brand">
            <span className="solvix-wordmark">
              <span className="solvix-icon">
                {/* Lightning bolt icon */}
                <svg width="17" height="17" viewBox="0 0 17 17" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M9.5 2L4 9.5H8.5L7.5 15L13 7.5H8.5L9.5 2Z" fill="#0F1623"/>
                </svg>
              </span>
              <span className="solvix-name">SOLVIX</span>
            </span>
          </div>

          {/* Heading */}
          <h1 className="solvix-heading">Get a quote</h1>
          <p className="solvix-subheading">
            Request a solar installation quotation. We&rsquo;ll review your details and get back to you.
          </p>

          {/* Form surface */}
          <div className="solvix-form-surface">
            <form onSubmit={handleSubmit} noValidate>

              <div className="solvix-field">
                <div className="solvix-label-row">
                  <label className="solvix-label" htmlFor="quote-full-name">Full name</label>
                  <span className="solvix-required" aria-label="required">*</span>
                </div>
                <input
                  id="quote-full-name"
                  className="solvix-input"
                  type="text"
                  required
                  autoComplete="name"
                  placeholder="John Doe"
                  value={form.fullName}
                  onChange={handleChange('fullName')}
                />
              </div>

              <div className="solvix-field">
                <div className="solvix-label-row">
                  <label className="solvix-label" htmlFor="quote-phone">Phone number</label>
                  <span className="solvix-required" aria-label="required">*</span>
                </div>
                <input
                  id="quote-phone"
                  className="solvix-input"
                  type="tel"
                  required
                  autoComplete="tel"
                  placeholder="+1 (555) 000-0000"
                  value={form.phone}
                  onChange={handleChange('phone')}
                />
              </div>

              <div className="solvix-field">
                <div className="solvix-label-row">
                  <label className="solvix-label" htmlFor="quote-email">Email address</label>
                  <span className="solvix-required" aria-label="required">*</span>
                </div>
                <input
                  id="quote-email"
                  className="solvix-input"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={handleChange('email')}
                />
              </div>

              <div className="solvix-field">
                <div className="solvix-label-row">
                  <label className="solvix-label" htmlFor="quote-address">Installation address</label>
                  <span className="solvix-required" aria-label="required">*</span>
                </div>
                <input
                  id="quote-address"
                  className="solvix-input"
                  type="text"
                  required
                  autoComplete="street-address"
                  placeholder="123 Solar Street"
                  value={form.address}
                  onChange={handleChange('address')}
                />
              </div>

              <div className="solvix-field">
                <label className="solvix-label" htmlFor="quote-system-type">Solar system type</label>
                <select
                  id="quote-system-type"
                  className="solvix-select"
                  required
                  value={form.systemType}
                  onChange={handleChange('systemType')}
                >
                  <option value="">Select an option</option>
                  {systemTypes.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              <div className="solvix-field">
                <label className="solvix-label" htmlFor="quote-capacity">Required capacity</label>
                <select
                  id="quote-capacity"
                  className="solvix-select"
                  required
                  value={form.capacity}
                  onChange={handleChange('capacity')}
                >
                  <option value="">Select an option</option>
                  {capacities.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div className="solvix-field">
                <label className="solvix-label" htmlFor="quote-monthly-bill">Average monthly electricity bill</label>
                <input
                  id="quote-monthly-bill"
                  className="solvix-input"
                  type="text"
                  placeholder="e.g. $150/month"
                  value={form.monthlyBill}
                  onChange={handleChange('monthlyBill')}
                />
              </div>

              <div className="solvix-field">
                <label className="solvix-label" htmlFor="quote-additional">Additional requirements</label>
                <textarea
                  id="quote-additional"
                  className="solvix-textarea"
                  rows={4}
                  value={form.additional}
                  onChange={handleChange('additional')}
                />
              </div>

              <button
                type="submit"
                className="solvix-btn-primary"
                disabled={submitting}
              >
                {submitting ? 'Submitting…' : 'Submit enquiry'}
              </button>

              {message && (
                <p
                  className={`solvix-message ${message.kind}`}
                  role="status"
                  aria-live="polite"
                >
                  {message.text}
                </p>
              )}

            </form>
          </div>

        </div>
      </div>
    </>
  );
}
