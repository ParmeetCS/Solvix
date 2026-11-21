import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Sun,
  Zap,
  TrendingDown,
  ShieldCheck,
  FileText,
  Calendar,
  Clock,
  ArrowRight,
  Phone,
  MessageCircle,
  AlertCircle,
  CheckCircle,
  FileCheck,
  Wrench,
  Download,
  LogOut,
  User,
  Home
} from 'lucide-react';

export default function CustomerDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [requestModal, setRequestModal] = useState(false);
  const [requestSuccess, setRequestSuccess] = useState(false);
  const [serviceType, setServiceType] = useState('site_inspection');
  const [serviceNotes, setServiceNotes] = useState('');

  useEffect(() => {
    const storedUser = localStorage.getItem('solvix_user');
    const token = localStorage.getItem('solvix_token');
    if (!token && !storedUser) {
      navigate('/login/customer');
      return;
    }
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        setUser({ full_name: 'Valued Customer' });
      }
    }
    setLoading(false);
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('solvix_token');
    localStorage.removeItem('solvix_user');
    localStorage.removeItem('solvix_role');
    navigate('/');
  };

  const handleServiceSubmit = (e) => {
    e.preventDefault();
    setRequestSuccess(true);
    setTimeout(() => {
      setRequestSuccess(false);
      setRequestModal(false);
      setServiceNotes('');
    }, 2000);
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#0b1020', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
        <p>Loading your solar portal...</p>
      </div>
    );
  }

  // Installation pipeline steps
  const steps = [
    { title: 'Site Survey', status: 'completed', desc: 'Roof structural & solar irradiance analysis', date: 'Completed' },
    { title: 'System Engineering', status: 'completed', desc: '5.5 kW On-Grid System customized design', date: 'Completed' },
    { title: 'Quotation & Permitting', status: 'in-progress', desc: 'DISCOM Net-metering approval submitted', date: 'In Progress' },
    { title: 'Material Dispatch', status: 'upcoming', desc: 'Tier-1 Mono PERC panels & inverter allocation', date: 'Next Step' },
    { title: 'Installation & Grid Sync', status: 'upcoming', desc: 'Mounting & bi-directional meter activation', date: 'Pending' }
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#0b1020', color: '#f1f5f9', fontFamily: 'Inter, system-ui, sans-serif' }}>
      
      {/* Top Navigation */}
      <header style={{
        background: 'rgba(15, 23, 42, 0.85)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        padding: '1rem 2rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 40
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div
            onClick={() => navigate('/')}
            style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}
          >
            <div style={{
              width: '36px',
              height: '36px',
              background: '#d8ee8e',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#0b1020',
              fontWeight: '700'
            }}>
              <Zap size={20} />
            </div>
            <span style={{ fontSize: '1.25rem', fontWeight: '700', letterSpacing: '-0.02em', color: '#fff' }}>SOLVIX</span>
          </div>
          <span style={{
            fontSize: '0.75rem',
            background: 'rgba(216, 238, 142, 0.15)',
            color: '#d8ee8e',
            padding: '0.2rem 0.6rem',
            borderRadius: '9999px',
            fontWeight: '600'
          }}>
            Customer Portal
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <button
            onClick={() => navigate('/')}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem'
            }}
          >
            <Home size={15} />
            Home
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#94a3b8', fontSize: '0.875rem' }}>
            <User size={16} />
            <span style={{ color: '#fff', fontWeight: '500' }}>{user?.full_name || user?.email || 'Customer'}</span>
          </div>
          <button
            onClick={handleLogout}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              background: 'transparent',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              color: '#94a3b8',
              padding: '0.4rem 0.8rem',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '0.85rem'
            }}
          >
            <LogOut size={15} />
            Sign Out
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem 1.5rem' }}>
        
        {/* Welcome Header */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          marginBottom: '2rem',
          background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.9) 100%)',
          padding: '1.75rem 2rem',
          borderRadius: '16px',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)'
        }}>
          <div>
            <h1 style={{ fontSize: '1.65rem', fontWeight: '700', margin: '0 0 0.5rem 0', color: '#fff' }}>
              Welcome back, {user?.full_name || 'Solar Partner'}! ☀️
            </h1>
            <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.95rem' }}>
              Track your residential rooftop solar installation progress, documents, and energy metrics.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              onClick={() => setRequestModal(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                background: '#d8ee8e',
                color: '#0b1020',
                fontWeight: '600',
                padding: '0.65rem 1.25rem',
                borderRadius: '10px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '0.9rem'
              }}
            >
              <Wrench size={16} />
              Request Service / Inspection
            </button>
            <a
              href="https://wa.me/918699847703?text=Hi%20Solvix%20Team%2C%20I%20have%20an%20enquiry%20regarding%20my%20installation."
              target="_blank"
              rel="noreferrer"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                background: '#25D366',
                color: '#fff',
                fontWeight: '600',
                padding: '0.65rem 1.25rem',
                borderRadius: '10px',
                textDecoration: 'none',
                fontSize: '0.9rem'
              }}
            >
              <MessageCircle size={16} />
              Chat on WhatsApp
            </a>
          </div>
        </div>

        {/* Key Metrics Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '1.25rem',
          marginBottom: '2rem'
        }}>
          <div style={{
            background: '#131d33',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '14px',
            padding: '1.25rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>System Capacity</span>
              <div style={{ padding: '0.4rem', background: 'rgba(216, 238, 142, 0.15)', borderRadius: '8px', color: '#d8ee8e' }}>
                <Sun size={18} />
              </div>
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: '700', color: '#fff' }}>5.5 kW</div>
            <div style={{ fontSize: '0.8rem', color: '#4ade80', marginTop: '0.25rem' }}>● On-Grid Solar System</div>
          </div>

          <div style={{
            background: '#131d33',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '14px',
            padding: '1.25rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Est. Annual Generation</span>
              <div style={{ padding: '0.4rem', background: 'rgba(56, 189, 248, 0.15)', borderRadius: '8px', color: '#38bdf8' }}>
                <Zap size={18} />
              </div>
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: '700', color: '#fff' }}>8,250 kWh</div>
            <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.25rem' }}>Approx. 22–24 units/day</div>
          </div>

          <div style={{
            background: '#131d33',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '14px',
            padding: '1.25rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Monthly Bill Reduction</span>
              <div style={{ padding: '0.4rem', background: 'rgba(74, 222, 128, 0.15)', borderRadius: '8px', color: '#4ade80' }}>
                <TrendingDown size={18} />
              </div>
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: '700', color: '#fff' }}>85% – 95%</div>
            <div style={{ fontSize: '0.8rem', color: '#4ade80', marginTop: '0.25rem' }}>Estimated ₹6,200/month saved</div>
          </div>

          <div style={{
            background: '#131d33',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '14px',
            padding: '1.25rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Warranty Coverage</span>
              <div style={{ padding: '0.4rem', background: 'rgba(168, 85, 247, 0.15)', borderRadius: '8px', color: '#c084fc' }}>
                <ShieldCheck size={18} />
              </div>
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: '700', color: '#fff' }}>25 Years</div>
            <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.25rem' }}>Performance Guarantee</div>
          </div>
        </div>

        {/* Installation Progress Pipeline */}
        <div style={{
          background: '#131d33',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '16px',
          padding: '1.75rem',
          marginBottom: '2rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
            <div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: '600', margin: '0 0 0.25rem 0', color: '#fff' }}>
                Solar Installation Progress
              </h2>
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#94a3b8' }}>
                Stage 3 of 5: Net-metering approval currently under DISCOM review
              </p>
            </div>
            <span style={{
              background: 'rgba(56, 189, 248, 0.15)',
              color: '#38bdf8',
              fontSize: '0.8rem',
              fontWeight: '600',
              padding: '0.3rem 0.8rem',
              borderRadius: '9999px'
            }}>
              On Track
            </span>
          </div>

          {/* Stepper Timeline */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            {steps.map((s, idx) => {
              const isCompleted = s.status === 'completed';
              const isInProgress = s.status === 'in-progress';
              return (
                <div
                  key={idx}
                  style={{
                    background: isInProgress ? 'rgba(56, 189, 248, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                    border: isInProgress ? '1px solid rgba(56, 189, 248, 0.3)' : '1px solid rgba(255, 255, 255, 0.05)',
                    borderRadius: '12px',
                    padding: '1.25rem',
                    position: 'relative'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    {isCompleted ? (
                      <CheckCircle size={18} color="#4ade80" />
                    ) : isInProgress ? (
                      <Clock size={18} color="#38bdf8" />
                    ) : (
                      <div style={{ width: '18px', height: '18px', borderRadius: '50%', border: '2px solid #475569' }} />
                    )}
                    <span style={{
                      fontSize: '0.85rem',
                      fontWeight: '600',
                      color: isCompleted ? '#4ade80' : isInProgress ? '#38bdf8' : '#64748b'
                    }}>
                      Step {idx + 1}
                    </span>
                  </div>
                  <h4 style={{ margin: '0 0 0.35rem 0', fontSize: '0.95rem', color: '#fff' }}>{s.title}</h4>
                  <p style={{ margin: '0 0 0.75rem 0', fontSize: '0.75rem', color: '#94a3b8', lineHeight: 1.4 }}>{s.desc}</p>
                  <div style={{
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    color: isCompleted ? '#4ade80' : isInProgress ? '#38bdf8' : '#64748b'
                  }}>
                    {s.date}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Two-Column Section: Documents & Help */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
          
          {/* Documents & Quotations */}
          <div style={{
            background: '#131d33',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '16px',
            padding: '1.5rem'
          }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '600', margin: '0 0 1rem 0', color: '#fff' }}>
              Project Documents & Quotations
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.85rem 1rem',
                background: 'rgba(255, 255, 255, 0.02)',
                borderRadius: '10px',
                border: '1px solid rgba(255, 255, 255, 0.05)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <FileText size={20} color="#d8ee8e" />
                  <div>
                    <div style={{ fontSize: '0.9rem', fontWeight: '500', color: '#fff' }}>Solvix Solar Quotation - QTN-2026-8491</div>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>5.5 kW On-Grid System • ₹2,85,000</div>
                  </div>
                </div>
                <button
                  onClick={() => alert('Quotation document downloaded')}
                  style={{ background: 'transparent', border: 'none', color: '#d8ee8e', cursor: 'pointer', padding: '0.4rem' }}
                >
                  <Download size={18} />
                </button>
              </div>

              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.85rem 1rem',
                background: 'rgba(255, 255, 255, 0.02)',
                borderRadius: '10px',
                border: '1px solid rgba(255, 255, 255, 0.05)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <FileCheck size={20} color="#38bdf8" />
                  <div>
                    <div style={{ fontSize: '0.9rem', fontWeight: '500', color: '#fff' }}>Site Survey & Feasibility Report</div>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Roof Shadow Analysis: 98% Clear Azimuth</div>
                  </div>
                </div>
                <button
                  onClick={() => alert('Survey report downloaded')}
                  style={{ background: 'transparent', border: 'none', color: '#38bdf8', cursor: 'pointer', padding: '0.4rem' }}
                >
                  <Download size={18} />
                </button>
              </div>

              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.85rem 1rem',
                background: 'rgba(255, 255, 255, 0.02)',
                borderRadius: '10px',
                border: '1px solid rgba(255, 255, 255, 0.05)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <ShieldCheck size={20} color="#c084fc" />
                  <div>
                    <div style={{ fontSize: '0.9rem', fontWeight: '500', color: '#fff' }}>Tier-1 Equipment Warranty Certificate</div>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>12-Yr Inverter & 25-Yr Panel Warranty</div>
                  </div>
                </div>
                <button
                  onClick={() => alert('Warranty policy downloaded')}
                  style={{ background: 'transparent', border: 'none', color: '#c084fc', cursor: 'pointer', padding: '0.4rem' }}
                >
                  <Download size={18} />
                </button>
              </div>
            </div>
          </div>

          {/* Dedicated Support & Assigned Team */}
          <div style={{
            background: '#131d33',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '16px',
            padding: '1.5rem'
          }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '600', margin: '0 0 1rem 0', color: '#fff' }}>
              Your Solvix Project Team
            </h3>

            <div style={{ background: 'rgba(255, 255, 255, 0.02)', borderRadius: '12px', padding: '1.25rem', border: '1px solid rgba(255, 255, 255, 0.05)', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.75rem' }}>
                <div style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '50%',
                  background: '#d8ee8e',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#0b1020',
                  fontWeight: '700'
                }}>
                  SE
                </div>
                <div>
                  <div style={{ fontWeight: '600', color: '#fff' }}>Solar Engineering & Project Lead</div>
                  <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Solvix Residential Division</div>
                </div>
              </div>
              <p style={{ fontSize: '0.85rem', color: '#94a3b8', margin: '0 0 1rem 0', lineHeight: 1.5 }}>
                Have questions about your rooftop design, subsidy claims, or net-metering dispatch? We are here to help.
              </p>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <a
                  href="tel:+918699847703"
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.4rem',
                    background: 'rgba(255, 255, 255, 0.05)',
                    color: '#fff',
                    padding: '0.6rem',
                    borderRadius: '8px',
                    textDecoration: 'none',
                    fontSize: '0.85rem',
                    fontWeight: '500'
                  }}
                >
                  <Phone size={15} />
                  Call Support
                </a>
                <a
                  href="https://wa.me/918699847703"
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.4rem',
                    background: '#25D366',
                    color: '#fff',
                    padding: '0.6rem',
                    borderRadius: '8px',
                    textDecoration: 'none',
                    fontSize: '0.85rem',
                    fontWeight: '600'
                  }}
                >
                  <MessageCircle size={15} />
                  WhatsApp
                </a>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#64748b', fontSize: '0.8rem' }}>
              <AlertCircle size={15} />
              <span>Installation updates are synchronized in real-time with our technicians.</span>
            </div>
          </div>

        </div>

      </main>

      {/* Service Request Modal */}
      {requestModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem',
          zIndex: 50
        }}>
          <div style={{
            background: '#131d33',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '16px',
            padding: '2rem',
            width: '100%',
            maxWidth: '480px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)'
          }}>
            <h3 style={{ margin: '0 0 0.5rem 0', color: '#fff', fontSize: '1.3rem' }}>Request Service or Inspection</h3>
            <p style={{ margin: '0 0 1.5rem 0', color: '#94a3b8', fontSize: '0.9rem' }}>
              Our engineering team will contact you within 24 hours to schedule a site visit.
            </p>

            {requestSuccess ? (
              <div style={{
                background: 'rgba(74, 222, 128, 0.15)',
                color: '#4ade80',
                padding: '1.25rem',
                borderRadius: '10px',
                textAlign: 'center',
                fontWeight: '500'
              }}>
                ✓ Service request submitted successfully!
              </div>
            ) : (
              <form onSubmit={handleServiceSubmit}>
                <div style={{ marginBottom: '1.25rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', color: '#94a3b8' }}>
                    Service Category
                  </label>
                  <select
                    value={serviceType}
                    onChange={(e) => setServiceType(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      background: '#0b1020',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '0.9rem'
                    }}
                  >
                    <option value="site_inspection">Roof Site Inspection</option>
                    <option value="quotation_review">Quotation / Design Review</option>
                    <option value="maintenance">Cleaning & Maintenance Support</option>
                    <option value="other">General Assistance</option>
                  </select>
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', color: '#94a3b8' }}>
                    Additional Notes / Preferred Date
                  </label>
                  <textarea
                    rows={3}
                    value={serviceNotes}
                    onChange={(e) => setServiceNotes(e.target.value)}
                    placeholder="Mention preferred day, time or specific requirements..."
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      background: '#0b1020',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '0.9rem',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    onClick={() => setRequestModal(false)}
                    style={{
                      padding: '0.65rem 1.25rem',
                      background: 'transparent',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                      color: '#94a3b8',
                      cursor: 'pointer'
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    style={{
                      padding: '0.65rem 1.25rem',
                      background: '#d8ee8e',
                      color: '#0b1020',
                      border: 'none',
                      borderRadius: '8px',
                      fontWeight: '600',
                      cursor: 'pointer'
                    }}
                  >
                    Submit Request
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
