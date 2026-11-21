import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, Hammer } from 'lucide-react';
import PortalLayout from '@/components/PortalLayout';
import { customerApi } from '@/services/api';
import { formatDateTime, titleCase } from '@/lib/quotation';

export default function CustomerServiceRequests() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({ subject: '', description: '', priority: 'medium' });
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await customerApi.getTickets({ limit: 100 });
      setTickets(res.data?.tickets || []);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const submit = async (e) => {
    e.preventDefault();
    setNotice(null);
    if (form.subject.trim().length < 3 || form.description.trim().length < 10) {
      setNotice({ kind: 'error', text: 'Please enter a subject and describe the problem (at least 10 characters).' });
      return;
    }
    try {
      setSaving(true);
      const res = await customerApi.createTicket({
        subject: form.subject.trim(),
        description: form.description.trim(),
        priority: form.priority,
      });
      setNotice({ kind: 'ok', text: res.message || 'Your service request was submitted.' });
      setForm({ subject: '', description: '', priority: 'medium' });
      load();
    } catch (err) {
      setNotice({ kind: 'error', text: err.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <PortalLayout title="Service Requests" subtitle="Report a problem and follow its progress">
      {error && <div className="q-alert error"><AlertTriangle size={15} style={{ verticalAlign: '-2px', marginRight: 6 }} />{error}</div>}

      <div className="crm-card" style={{ marginBottom: 20 }}>
        <div className="crm-card-header"><div className="crm-card-title">New request</div></div>
        <form onSubmit={submit}>
          <div className="crm-form-group">
            <label className="crm-label" htmlFor="sr-subject">Subject</label>
            <input id="sr-subject" className="crm-input" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
          </div>
          <div className="crm-form-group">
            <label className="crm-label" htmlFor="sr-desc">What is happening?</label>
            <textarea id="sr-desc" className="crm-textarea" rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="crm-form-group">
            <label className="crm-label" htmlFor="sr-priority">Urgency</label>
            <select id="sr-priority" className="crm-input" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">System not working</option>
            </select>
          </div>
          {notice && <div className={`q-alert ${notice.kind === 'ok' ? 'success' : 'error'}`}>{notice.text}</div>}
          <button className="crm-btn crm-btn-primary" disabled={saving}>{saving ? 'Submitting…' : 'Submit request'}</button>
        </form>
      </div>

      <div className="crm-card" style={{ padding: 0 }}>
        {loading ? (
          <div className="q-loading">Loading your requests…</div>
        ) : tickets.length === 0 ? (
          <div className="q-empty"><Hammer size={28} style={{ opacity: 0.4, marginBottom: 8 }} /><div>You have not raised any service requests.</div></div>
        ) : (
          <div className="crm-table-container">
            <table className="crm-table">
              <thead><tr><th>Request</th><th>Priority</th><th>Status</th><th>Raised</th></tr></thead>
              <tbody>
                {tickets.map((t) => (
                  <tr key={t.id}>
                    <td><b style={{ color: 'var(--accent-text)' }}>{t.ticket_code || t.ticket_number}</b><div style={{ fontSize: '0.78rem' }}>{t.subject}</div></td>
                    <td>{titleCase(t.priority || '')}</td>
                    <td><span className="q-badge">{titleCase(String(t.status).replace(/_/g, ' '))}</span></td>
                    <td>{formatDateTime(t.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </PortalLayout>
  );
}
