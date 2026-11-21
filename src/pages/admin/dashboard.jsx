import React, { useEffect, useState } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import AdminSidebar from '@/components/AdminSidebar';
import AdminHeader from '@/components/AdminHeader';
import { Card, Alert } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';

const Dashboard = () => {
  const { user, status } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const path = useParams();

  // State for dashboard stats
  const [stats, setStats] = useState(null);
  const [recentActivity, setRecentActivity] = useState([]);
  const [charts, setCharts] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch dashboard data
  useEffect(() => {
    if (status !== 'authenticated' || user.account_type !== 'admin') {
      navigate('/');
      return;
    }

    const fetchDashboard = async () => {
      setLoading(true);
      try {
        // Fetch stats
        const statsRes = await fetch('/api/admin/dashboard/stats', {
          headers: { Authorization: `Bearer ${localStorage.getItem('solvix_token')}` },
        });
        const statsData = await statsRes.json();
        setStats(statsData);

        // Fetch recent activity
        const activityRes = await fetch('/api/admin/dashboard/recent-activity', {
          headers: { Authorization: `Bearer ${localStorage.getItem('solvix_token')}` },
        });
        const activityData = await activityRes.json();
        setRecentActivity(activityData.recentActivity || []);

        // Fetch chart data
        const chartsRes = await fetch('/api/admin/dashboard/charts', {
          headers: { Authorization: `Bearer ${localStorage.getItem('solvix_token')}` },
        });
        const chartsData = await chartsRes.json();
        setCharts(chartsData);
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, [user, status, navigate]);

  if (status !== 'authenticated' || user.account_type !== 'admin') {
    return null; // Will show nothing until auth is resolved
  }

  if (loading) {
    return (
      <div className="page">
        <div className="page-head">
          <h1>SOLVIX Admin Dashboard</h1>
          <p>Loading dashboard data...</p>
        </div>
        <div className="loading-skeletons">
          {/* Show skeletons for cards and charts while loading */}
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <AdminSidebar />
      <main className="main-content" style={{ marginLeft: '240px', padding: '2rem', minHeight: '100vh' }}>
        <AdminHeader />

        <div className="dashboard-grid" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '1.5rem',
          marginBottom: '2rem',
        }}>
          {/* Summary Cards Section */}
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '1.5rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          }}>
            <h3 style={{ margin: '0 0 1rem 0', color: '#1a237e', fontSize: '0.875rem', textTransform: 'uppercase' }}>
              SOLVIX Organization Stats
            </h3>
            <div className="stats-cards" style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
              gap: '1rem',
            }}>
              {stats && (
                <>
                  <div style={{
                    background: 'var(--solvix-card-bg, #fff)',
                    padding: '1rem',
                    borderRadius: '8px',
                    textAlign: 'center',
                    border: '1px solid var(--solvix-border, #e0e0e0)',
                    transition: 'all 0.3s',
                  }}
                  >
                    <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#1a237e' }}>
                      {stats.totalEmployees !== undefined ? stats.totalEmployees : '0'}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#666', marginTop: '0.25rem' }}>
                      Total Employees
                    </div>
                  </div>
                  <div style={{
                    background: 'var(--solvix-card-bg, #fff)',
                    padding: '1rem',
                    borderRadius: '8px',
                    textAlign: 'center',
                    border: '1px solid var(--solvix-border, #e0e0e0)',
                    transition: 'all 0.3s',
                  }}
                  >
                    <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#4caf50' }}>
                      {stats.activeEmployees !== undefined ? stats.activeEmployees : '0'}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#666', marginTop: '0.25rem' }}>
                      Active Employees
                    </div>
                  </div>
                  <div style={{
                    background: 'var(--solvix-card-bg, #fff)',
                    padding: '1rem',
                    borderRadius: '8px',
                    textAlign: 'center',
                    border: '1px solid var(--solvix-border, #e0e0e0)',
                    transition: 'all 0.3s',
                  }}
                  >
                    <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#f57f17' }}>
                      {stats.pendingEmployeeRequests !== undefined ? stats.pendingEmployeeRequests : '0'}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#666', marginTop: '0.25rem' }}>
                      Pending Requests
                    </div>
                  </div>
                  <div style={{
                    background: 'var(--solvix-card-bg, #fff)',
                    padding: '1rem',
                    borderRadius: '8px',
                    textAlign: 'center',
                    border: '1px solid var(--solvix-border, #e0e0e0)',
                    transition: 'all 0.3s',
                  }}
                  >
                    <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#197623' }}>
                      {stats.totalCustomers !== undefined ? stats.totalCustomers : '0'}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#666', marginTop: '0.25rem' }}>
                      Total Customers
                    </div>
                  </div>
                  <div style={{
                    background: 'var(--solvix-card-bg, #fff)',
                    padding: '1rem',
                    borderRadius: '8px',
                    textAlign: 'center',
                    border: '1px solid var(--solvix-border, #e0e0e0)',
                    transition: 'all 0.3s',
                  }}
                  >
                    <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#197623' }}>
                      {stats.activeProjects !== undefined ? stats.activeProjects : '0'}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#666', marginTop: '0.25rem' }}>
                      Active Projects
                    </div>
                  </div>
                  <div style={{
                    background: 'var(--solvix-card-bg, #fff)',
                    padding: '1rem',
                    borderRadius: '8px',
                    textAlign: 'center',
                    border: '1px solid var(--solvix-border, #e0e0e0)',
                    transition: 'all 0.3s',
                  }}
                  >
                    <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#e53935' }}>
                      {stats.openSupportTickets !== undefined ? stats.openSupportTickets : '0'}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#666', marginTop: '0.25rem' }}>
                      Open Tickets
                    </div>
                  </div>
                  <div style={{
                    background: 'var(--solvix-card-bg, #fff)',
                    padding: '1rem',
                    borderRadius: '8px',
                    textAlign: 'center',
                    border: '1px solid var(--solvix-border, #e0e0e0)',
                    transition: 'all 0.3s',
                  }}
                  >
                    <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#f57f17' }}>
                      {stats.totalLeads !== undefined ? stats.totalLeads : '0'}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#666', marginTop: '0.25rem' }}>
                      Total Leads
                    </div>
                  </div>
                  <div style={{
                    background: 'var(--solvix-card-bg, #fff)',
                    padding: '1rem',
                    borderRadius: '8px',
                    textAlign: 'center',
                    border: '1px solid var(--solvix-border, #e0e0e0)',
                    transition: 'all 0.3s',
                  }}
                  >
                    <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#e53935' }}>
                      {stats.pendingPayments !== undefined ? stats.pendingPayments : '0'}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#666', marginTop: '0.25rem' }}>
                      Pending Payments
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Recent Activity Section */}
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '1.5rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          }}>
            <h3 style={{ margin: '0 0 1rem 0', color: '#1a237e', fontSize: '0.875rem', textTransform: 'uppercase' }}>
              Recent Activity
            </h3>
            {recentActivity.length > 0 ? (
              <ul style={{
                listStyle: 'none',
                padding: 0,
              }}>
                {recentActivity.slice(0, 5).map((activity, index) => (
                  <li key={index} style={{
                    padding: '0.5rem 0',
                    borderBottom: '1px solid #f0f0f0',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                  }}>
                    <svg
                      width="16"
                      height="16"
                      style={{ color: activity.type === 'success' ? '#4caf50' : activity.type === 'warning' ? '#f57f17' : '#1a237e' }}
                    >
                      {activity.type === 'success' && <use href="#check" width="16" height="16" />}
                      {activity.type === 'warning' && <use href="#alert" width="16" height="16" />}
                      {activity.type === 'info' && <use href="#info" width="16" height="16" />}
                    </svg>
                    <span style={{ fontSize: '0.875rem', color: '#333', flex: 1 }}>
                      {activity.action}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: '#666' }}>
                      {activity.timestamp ? new Date(activity.timestamp).toLocaleDateString() : ''}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p style={{ color: '#666', fontSize: '0.875rem' }}>
                No recent activity
              </p>
            )}
          </div>

          {/* Charts Section */}
          {charts && (
            <div style={{
              background: 'white',
              borderRadius: '12px',
              padding: '1.5rem',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            }}>
              <h3 style={{ margin: '0 0 1rem 0', color: '#1a237e', fontSize: '0.875rem', textTransform: 'uppercase' }}>
                Charts & Analytics
              </h3>
              {/* Projects by Status Chart */}
              {charts.projectsByStatus && (
                <div style={{
                  marginBottom: '1.5rem',
                }}>
                  <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.75rem', color: '#666' }}>
                    Projects by Status
                  </p>
                  <div style={{
                    display: 'grid',
                    gap: '0.25rem',
                  }}>
                    {Object.entries(charts.projectsByStatus).map(([status, count], i) => (
                      <div key={i} style={{
                        background: getStatusColor(status),
                        height: '20px',
                        borderRadius: '4px 4px 0 0',
                      }}>
                        <span style={{
                          position: 'absolute',
                          right: '0',
                          marginRight: '0.5rem',
                          fontSize: '0.65rem',
                          color: '#666',
                        }}>{count}</span>
                        <span style={{
                          display: 'block',
                          width: `${(count / Math.max(1, Object.values(charts.projectsByStatus).reduce((a, b) => a + b, 0)) * 100)}%`,
                          height: '20px',
                          background: getStatusColor(status),
                          borderRadius: '4px 4px 0 0',
                        }} />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Leads by Status Chart */}
              {charts.leadsByStatus && (
                <div style={{ marginBottom: '1.5rem' }}>
                  <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.75rem', color: '#666' }}>
                    Leads by Status
                  </p>
                  <div style={{
                    display: 'grid',
                    gap: '0.25rem',
                  }}>
                    {Object.entries(charts.leadsByStatus).map(([status, count], i) => (
                      <div key={i} style={{
                        background: getLeadStatusColor(status),
                        height: '20px',
                        borderRadius: '4px 4px 0 0',
                      }}>
                        <span style={{
                          position: 'absolute',
                          right: '0',
                          marginRight: '0.5rem',
                          fontSize: '0.65rem',
                          color: '#666',
                        }}>{count}</span>
                        <span style={{
                          display: 'block',
                          width: `${(count / Math.max(1, Object.values(charts.leadsByStatus).reduce((a, b) => a + b, 0)) * 100)}%`,
                          height: '20px',
                          background: getLeadStatusColor(status),
                          borderRadius: '4px 4px 0 0',
                        }} />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Employee Distribution Chart */}
              {charts.employeeDistributionByDepartment && (
                <div>
                  <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.75rem', color: '#666' }}>
                    Employees by Department
                  </p>
                  <div style={{
                    display: 'grid',
                    gap: '0.25rem',
                  }}>
                    {Object.entries(charts.employeeDistributionByDepartment).map(([deptId, count], i) => (
                      <div key={i} style={{
                        background: '#1a237e',
                        height: '20px',
                        borderRadius: '4px 4px 0 0',
                      }}>
                        <span style={{
                          position: 'absolute',
                          right: '0',
                          marginRight: '0.5rem',
                          fontSize: '0.65rem',
                          color: '#666',
                        }}>{count}</span>
                        <span style={{
                          display: 'block',
                          width: `${(count / Math.max(1, Object.values(charts.employeeDistributionByDepartment).reduce((a, b) => a + b, 0)) * 100)}%`,
                          height: '20px',
                          background: '#1a237e',
                          borderRadius: '4px 4px 0 0',
                        }} />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Revenue/Expenses Overview */}
              {charts.netRevenue !== undefined && (
                <div style={{
                  marginTop: '1rem',
                  padding: '0.5rem',
                  background: '#e3f2fd',
                  borderRadius: '8px',
                  textAlign: 'center',
                }}>
                  <p style={{ margin: '0', fontSize: '0.875rem', color: '#1a237e' }}>
                    Net Revenue: {charts.netRevenue > 0 ? `+${charts.netRevenue}` : charts.netRevenue}
                  </p>
                  <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.75rem', color: '#666' }}>
                    Total Revenue: {charts.revenue > 0 ? `$${charts.revenue}` : '0'}
                  </p>
                  <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.75rem', color: '#666' }}>
                    Total Expenses: {charts.expenses > 0 ? `$${charts.expenses}` : '0'}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Operational Overview Section */}
        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '1.5rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          marginTop: '2rem',
        }}>
          <h3 style={{ margin: '0 0 1rem 0', color: '#1a237e', fontSize: '0.875rem', textTransform: 'uppercase' }}>
            Operational Overview
          </h3>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1.5rem',
            marginTop: '1rem',
          }}>
            {/* Recent Employee Registrations */}
            <div style={{
              background: '#e8f5e9',
              borderRadius: '8px',
              padding: '1rem',
            }}>
              <h4 style={{ margin: '0 0 0.5rem 0', color: '#2e7d32', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                Recent Employee Registrations
              </h4>
              <p style={{ margin: '0', fontSize: '0.875rem', color: '#333' }}>
                {recentActivity.length > 0 ? `${recentActivity.length} new employees registered` : 'No new registrations'}
              </p>
              <button
                style={{
                  marginTop: '0.5rem',
                  width: '100%',
                  padding: '0.5rem',
                  background: '#1a237e',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                }}
                onClick={() => navigate('/admin/employees/requests')}
              >
                View All
              </button>
            </div>

            {/* Recent Customer Registrations */}
            <div style={{
              background: '#e3f2fd',
              borderRadius: '8px',
              padding: '1rem',
            }}>
              <h4 style={{ margin: '0 0 0.5rem 0', color: '#1a237e', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                Recent Customer Registrations
              </h4>
              <p style={{ margin: '0', fontSize: '0.875rem', color: '#333' }}>
                Pending customer data
              </p>
              <button
                style={{
                  marginTop: '0.5rem',
                  width: '100%',
                  padding: '0.5rem',
                  background: '#1a237e',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                }}
                onClick={() => navigate('/admin/customers')}
              >
                View All
              </button>
            </div>

            {/* Latest Project Updates */}
            <div style={{
              background: '#fff3e0',
              borderRadius: '8px',
              padding: '1rem',
            }}>
              <h4 style={{ margin: '0 0 0.5rem 0', color: '#ff8f00', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                Latest Project Updates
              </h4>
              <p style={{ margin: '0', fontSize: '0.875rem', color: '#333' }}>
                Pending project data
              </p>
              <button
                style={{
                  marginTop: '0.5rem',
                  width: '100%',
                  padding: '0.5rem',
                  background: '#1a237e',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                }}
                onClick={() => navigate('/admin/projects')}
              >
                View All
              </button>
            </div>

            {/* Recent Leads */}
            <div style={{
              background: '#e1f5fe',
              borderRadius: '8px',
              padding: '1rem',
            }}>
              <h4 style={{ margin: '0 0 0.5rem 0', color: '#0277bd', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                Recent Leads
              </h4>
              <p style={{ margin: '0', fontSize: '0.875rem', color: '#333' }}>
                Pending leads data
              </p>
              <button
                style={{
                  marginTop: '0.5rem',
                  width: '100%',
                  padding: '0.5rem',
                  background: '#1a237e',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                }}
                onClick={() => navigate('/admin/leads')}
              >
                View All
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

// Helper function to get status color
const getStatusColor = (status) => {
  const colors = {
    'scheduled': '#1a237e',
    'in_progress': '#4caf50',
    'completed': '#8bc34a',
    'failed': '#e53935',
    'on_hold': '#f57f17',
  };
  return colors[status] || '#666';
};

// Helper function to get lead status color
const getLeadStatusColor = (status) => {
  const colors = {
    'new': '#1a237e',
    'contacted': '#4caf50',
    'qualified': '#8bc34a',
    'proposal_sent': '#f57f17',
    'negotiation': '#ff9800',
    'converted': '#4caf50',
    'lost': '#e53935',
    'disqualified': '#9e9e9e',
  };
  return colors[status] || '#666';
};

export default Dashboard;