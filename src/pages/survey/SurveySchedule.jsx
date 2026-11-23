import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import PortalLayout from '@/components/PortalLayout';
import { surveyApi } from '@/services/api';
import {
  Clock,
  MapPin,
  CalendarDays,
  RefreshCw,
} from 'lucide-react';

export default function SurveySchedule() {
  const [surveys, setSurveys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Calendar filter
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [rescheduleSurvey, setRescheduleSurvey] = useState(null);
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('10:00 AM - 12:00 PM');
  const [newAddress, setNewAddress] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadSchedule();
  }, []);

  const loadSchedule = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await surveyApi.getRequests();
      setSurveys(res.data?.surveys || []);
    } catch (err) {
      setError(err?.message || 'Failed to load survey schedule.');
    } finally {
      setLoading(false);
    }
  };

  const handleRescheduleSubmit = async (e) => {
    e.preventDefault();
    if (!rescheduleSurvey || !newDate) return;

    try {
      setActionLoading(true);
      await surveyApi.scheduleSurvey(rescheduleSurvey.id, {
        scheduled_date: newDate,
        scheduled_time: newTime,
        site_address: newAddress
      });
      setRescheduleSurvey(null);
      loadSchedule();
    } catch (err) {
      alert(err?.message || 'Failed to reschedule visit.');
    } finally {
      setActionLoading(false);
    }
  };

  // Group scheduled surveys
  const scheduledSurveys = surveys.filter(s => s.scheduled_date || s.survey_date);
  const selectedDaySurveys = scheduledSurveys.filter(
    s => s.scheduled_date === selectedDate || s.survey_date === selectedDate
  );

  return (
    <PortalLayout
      title="Field Survey Visit Schedule & Calendar"
      subtitle="Interactive visit timetable, route planning, and site appointment management"
      actions={
        <button
          onClick={loadSchedule}
          className="survey-btn survey-btn-secondary survey-btn-sm"
        >
          <RefreshCw size={14} /> Refresh Schedule
        </button>
      }
    >
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 1fr) 2fr', gap: '20px' }}>
        {/* Left: Date Selector & Agenda */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="survey-card">
            <div className="survey-card-header">
              <h3>
                <CalendarDays size={18} style={{ color: 'var(--c-blue)' }} />
                Filter Schedule Date
              </h3>
            </div>

            <div className="survey-form-group">
              <label className="survey-label">Select Calendar Date</label>
              <input
                type="date"
                className="survey-input"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
              <button
                type="button"
                onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
                className="survey-btn survey-btn-secondary survey-btn-sm"
                style={{ flex: 1 }}
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => {
                  const d = new Date();
                  d.setDate(d.getDate() + 1);
                  setSelectedDate(d.toISOString().split('T')[0]);
                }}
                className="survey-btn survey-btn-secondary survey-btn-sm"
                style={{ flex: 1 }}
              >
                Tomorrow
              </button>
            </div>
          </div>

          {/* Day's Agenda */}
          <div className="survey-card">
            <div className="survey-card-header">
              <h3>Visits on {selectedDate}</h3>
              <span className="survey-badge survey-badge-scheduled">
                {selectedDaySurveys.length} visits
              </span>
            </div>

            {selectedDaySurveys.length === 0 ? (
              <p style={{ color: 'var(--text-dim)', fontSize: '0.86rem', textAlign: 'center', padding: '20px 0' }}>
                No site visits scheduled on this date.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {selectedDaySurveys.map((srv) => (
                  <div
                    key={srv.id}
                    style={{
                      padding: '12px',
                      background: 'rgba(var(--ink-rgb), 0.03)',
                      border: '1px solid rgba(var(--ink-rgb), 0.08)',
                      borderRadius: '8px'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 600, color: 'var(--text-strong)' }}>{srv.customer_name}</span>
                      <span style={{ fontSize: '0.78rem', color: 'var(--c-blue)' }}>
                        {srv.scheduled_time || 'General'}
                      </span>
                    </div>

                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <MapPin size={12} /> {srv.site_address || srv.city}
                    </div>

                    <div style={{ fontSize: '0.8rem', color: 'var(--c-blue)', marginTop: '4px' }}>
                      Surveyor: {srv.assigned_to_name || 'Unassigned'}
                    </div>

                    <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
                      <Link
                        to={`/survey/requests/${srv.id}`}
                        className="survey-btn survey-btn-secondary survey-btn-sm"
                        style={{ fontSize: '0.75rem', padding: '3px 8px' }}
                      >
                        Inspect
                      </Link>
                      <button
                        onClick={() => {
                          setRescheduleSurvey(srv);
                          setNewDate(srv.scheduled_date || selectedDate);
                          setNewTime(srv.scheduled_time || '10:00 AM - 12:00 PM');
                          setNewAddress(srv.site_address || '');
                        }}
                        className="survey-btn survey-btn-secondary survey-btn-sm"
                        style={{ fontSize: '0.75rem', padding: '3px 8px' }}
                      >
                        Reschedule
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Comprehensive Master Schedule Table */}
        <div className="survey-card">
          <div className="survey-card-header">
            <h3>
              <Clock size={18} style={{ color: 'var(--c-blue)' }} />
              All Scheduled Technical Visits ({scheduledSurveys.length})
            </h3>
          </div>

          <div className="survey-table-wrapper">
            <table className="survey-table">
              <thead>
                <tr>
                  <th>Date & Time</th>
                  <th>Customer Details</th>
                  <th>Site Address</th>
                  <th>Engineer</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {scheduledSurveys.map((srv) => (
                  <tr key={srv.id}>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--c-blue)' }}>
                        {srv.scheduled_date || srv.survey_date}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {srv.scheduled_time || '10:00 AM - 12:00 PM'}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 500, color: 'var(--text-strong)' }}>{srv.customer_name}</div>
                      <div style={{ fontSize: '0.76rem', color: 'var(--text-dim)' }}>{srv.survey_code}</div>
                    </td>
                    <td>
                      <div style={{ fontSize: '0.82rem', color: 'var(--text-soft)' }}>
                        {srv.site_address || srv.city}
                      </div>
                    </td>
                    <td>
                      <div style={{ color: 'var(--c-blue)', fontWeight: 500, fontSize: '0.84rem' }}>
                        {srv.assigned_to_name || 'Unassigned'}
                      </div>
                    </td>
                    <td>
                      <span className={`survey-badge survey-badge-${srv.status}`}>
                        {srv.status}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '6px' }}>
                        <button
                          onClick={() => {
                            setRescheduleSurvey(srv);
                            setNewDate(srv.scheduled_date || '');
                            setNewTime(srv.scheduled_time || '10:00 AM - 12:00 PM');
                            setNewAddress(srv.site_address || '');
                          }}
                          className="survey-btn survey-btn-secondary survey-btn-sm"
                        >
                          Reschedule
                        </button>
                        <Link
                          to={`/survey/requests/${srv.id}/inspection`}
                          className="survey-btn survey-btn-primary survey-btn-sm"
                        >
                          Form
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Reschedule Modal */}
      {rescheduleSurvey && (
        <div className="survey-modal-overlay">
          <div className="survey-modal-content">
            <h3 style={{ color: 'var(--text-strong)', margin: '0 0 16px 0' }}>
              Reschedule Visit: {rescheduleSurvey.survey_code}
            </h3>
            <form onSubmit={handleRescheduleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="survey-form-group">
                  <label className="survey-label">New Visit Date</label>
                  <input
                    type="date"
                    className="survey-input"
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    required
                  />
                </div>
                <div className="survey-form-group">
                  <label className="survey-label">Time Window</label>
                  <select
                    className="survey-select"
                    value={newTime}
                    onChange={(e) => setNewTime(e.target.value)}
                  >
                    <option value="10:00 AM - 12:00 PM">10:00 AM - 12:00 PM (Morning)</option>
                    <option value="01:00 PM - 03:00 PM">01:00 PM - 03:00 PM (Afternoon)</option>
                    <option value="03:00 PM - 05:00 PM">03:00 PM - 05:00 PM (Evening)</option>
                  </select>
                </div>
              </div>

              <div className="survey-form-group">
                <label className="survey-label">Site Address Confirmation</label>
                <input
                  type="text"
                  className="survey-input"
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                <button
                  type="button"
                  onClick={() => setRescheduleSurvey(null)}
                  className="survey-btn survey-btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="survey-btn survey-btn-primary"
                >
                  {actionLoading ? 'Updating...' : 'Save & Confirm Visit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PortalLayout>
  );
}
