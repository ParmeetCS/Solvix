import { useState, useEffect } from 'react';
import { postJson } from '../api';

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

  .solvix-quote-root {
    position: fixed;
    inset: 0;
    width: 100vw;
    height: 100vh;
    height: 100dvh;
    overflow: hidden;
    background: #f4f4f5;
    color: #0a0a0a;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: clamp(12px, 2.5vh, 24px) 16px;
    box-sizing: border-box;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    color-scheme: light;
  }

  .solvix-quote-card {
    width: 100%;
    max-width: 780px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
  }

  /* ── Header row with Back link and Brand mark ── */
  .solvix-quote-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: clamp(8px, 1.4vh, 14px);
  }

  .solvix-back {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    color: #71717a;
    font-size: 13.5px;
    font-weight: 500;
    text-decoration: none;
    letter-spacing: 0.01em;
    transition: color 0.15s;
  }
  .solvix-back:hover { color: #0a0a0a; }
  .solvix-back svg { flex-shrink: 0; }

  .solvix-brand {
    display: flex;
    align-items: center;
  }
  .solvix-wordmark {
    display: inline-flex;
    align-items: center;
    gap: 9px;
  }
  .solvix-icon {
    width: 30px;
    height: 30px;
    background: #0a0a0a;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .solvix-name {
    font-size: 16px;
    font-weight: 700;
    color: #0a0a0a;
    letter-spacing: 0.08em;
  }

  /* ── Heading ── */
  .solvix-heading {
    font-size: clamp(23px, 3.2vh, 28px);
    font-weight: 700;
    color: #0a0a0a;
    margin: 0 0 4px;
    letter-spacing: -0.02em;
    line-height: 1.2;
  }
  .solvix-subheading {
    font-size: clamp(13px, 1.5vh, 14.5px);
    color: #71717a;
    margin: 0 0 clamp(10px, 1.8vh, 18px);
    line-height: 1.45;
  }

  /* ── Form surface ── */
  .solvix-form-surface {
    background: #ffffff;
    border: 1px solid rgba(0, 0, 0, 0.08);
    border-radius: 16px;
    box-shadow: 0 24px 64px rgba(0, 0, 0, 0.06);
    padding: clamp(18px, 2.6vh, 28px) clamp(20px, 2.8vw, 32px);
  }

  /* ── 2-Column Fields Grid ── */
  .solvix-form-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: clamp(9px, 1.4vh, 14px) 18px;
  }

  .solvix-field {
    margin: 0;
  }
  .solvix-field-full {
    grid-column: 1 / -1;
  }

  .solvix-label-row,
  .solvix-label {
    display: flex;
    align-items: center;
    font-size: 13px;
    font-weight: 600;
    color: #0a0a0a;
    letter-spacing: 0.02em;
    margin-bottom: 6px;
  }
  .solvix-required {
    color: #ef4444;
    margin-left: 3px;
  }

  .solvix-input,
  .solvix-select,
  .solvix-textarea {
    width: 100%;
    box-sizing: border-box;
    background: #ffffff;
    border: 1px solid rgba(0, 0, 0, 0.14);
    border-radius: 9px;
    padding: clamp(8.5px, 1.3vh, 11px) 14px;
    font-size: 14px;
    font-family: inherit;
    color: #0a0a0a;
    outline: none;
    transition: border-color 0.15s, box-shadow 0.15s;
  }
  .solvix-input::placeholder,
  .solvix-textarea::placeholder {
    color: #a1a1aa;
  }
  .solvix-input:focus,
  .solvix-select:focus,
  .solvix-textarea:focus {
    border-color: #0a0a0a;
    box-shadow: 0 0 0 3px rgba(10, 10, 10, 0.08);
  }
  .solvix-select {
    appearance: none;
    cursor: pointer;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 14 14' fill='none'%3E%3Cpath d='M4.5 7L7 9.5L9.5 7' stroke='%230a0a0a' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 14px center;
    background-size: 14px;
  }
  .solvix-select option {
    background: #ffffff;
    color: #0a0a0a;
  }
  .solvix-textarea {
    resize: none;
    height: clamp(38px, 4.4vh, 44px);
    min-height: clamp(38px, 4.4vh, 44px);
    line-height: 1.4;
    vertical-align: top;
  }

  /* ── Primary button ── */
  .solvix-btn-primary {
    width: 100%;
    background: #0a0a0a;
    color: #ffffff;
    border: none;
    border-radius: 9px;
    padding: clamp(11px, 1.6vh, 14px);
    font-size: 15px;
    font-weight: 600;
    font-family: inherit;
    cursor: pointer;
    letter-spacing: 0.01em;
    transition: background 0.15s;
    margin-top: clamp(10px, 1.6vh, 16px);
  }
  .solvix-btn-primary:hover:not(:disabled) { background: #27272a; }
  .solvix-btn-primary:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }

  /* ── Message ── */
  .solvix-message {
    margin-top: 9px;
    padding: 8px 12px;
    border-radius: 8px;
    font-size: 12.5px;
    font-weight: 500;
    line-height: 1.4;
  }
  .solvix-message.ok {
    background: rgba(22, 163, 74, 0.08);
    border: 1px solid rgba(22, 163, 74, 0.2);
    color: #16a34a;
  }
  .solvix-message.error {
    background: rgba(239, 68, 68, 0.08);
    border: 1px solid rgba(239, 68, 68, 0.2);
    color: #ef4444;
  }

  @media (max-width: 540px) {
    .solvix-form-grid {
      grid-template-columns: 1fr;
      gap: 8px;
    }
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

  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  const systemTypes = ['On-Grid', 'Off-Grid', 'Hybrid', 'Not Sure'];
  const capacities = ['1 kW', '2 kW', '3 kW', '4 kW', '5 kW', '6 kW', '8 kW', '10 kW', 'More than 10 kW', 'Not Sure'];

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
      <div className="solvix-quote-root" data-theme="light">
        <div className="solvix-quote-card">

          {/* Header row with Back link and Brand mark */}
          <div className="solvix-quote-header">
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

            <div className="solvix-brand">
              <span className="solvix-wordmark">
                <span className="solvix-icon">
                  <svg width="14" height="14" viewBox="0 0 17 17" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M9.5 2L4 9.5H8.5L7.5 15L13 7.5H8.5L9.5 2Z" fill="#ffffff"/>
                  </svg>
                </span>
                <span className="solvix-name">SOLVIX</span>
              </span>
            </div>
          </div>

          {/* Heading */}
          <h1 className="solvix-heading">Get a quote</h1>
          <p className="solvix-subheading">
            Request a solar installation quotation. We&rsquo;ll review your details and get back to you.
          </p>

          {/* Form surface */}
          <div className="solvix-form-surface">
            <form onSubmit={handleSubmit} noValidate>
              <div className="solvix-form-grid">

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
                    placeholder="+91 98765 43210"
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
                    placeholder="House no., street, city, PIN"
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
                    placeholder="e.g. ₹4,500 per month"
                    value={form.monthlyBill}
                    onChange={handleChange('monthlyBill')}
                  />
                </div>

                <div className="solvix-field">
                  <label className="solvix-label" htmlFor="quote-additional">Additional requirements</label>
                  <textarea
                    id="quote-additional"
                    className="solvix-textarea"
                    rows={1}
                    placeholder="e.g. Roof type, timeline"
                    value={form.additional}
                    onChange={handleChange('additional')}
                  />
                </div>

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
