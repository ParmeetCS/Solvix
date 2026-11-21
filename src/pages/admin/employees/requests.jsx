import React, { useEffect, useState } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import AdminSidebar from '@/components/AdminSidebar';
import AdminHeader from '@/components/AdminHeader';
import { Table, Button, Input, Select, Badge, Icon, Drawer, Dialog, DialogAction, Notification } from '@/components/ui';
import { useAuth } from '@/context/auth';

const EmployeeRequests = () => {
  const { user, status } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // State for pending requests table
  const [requests, setRequests] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [search, setSearch] = useState('');

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status !== 'authenticated' || user.account_type !== 'admin') {
      navigate('/');
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/admin/employee-requests', {
          headers: { Authorization: `Bearer ${localStorage.getItem('solvix_token')}` },
        });
        const data = await res.json();
        setRequests(data.requests || []);
        setTotalCount(data.count || 0);
      } catch (error) {
        console.error('Failed to fetch employee requests:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, status]);

  if (status !== 'authenticated' || user.account_type !== 'admin') {
    return null;
  }

  if (loading) {
    return (
      <div className="page">
        <h1>Employee Access Requests</h1>
        <p>Loading pending requests...</p>
      </div>
    );
  }

  // Handle approve request
  const handleApprove = async (requestId) => {
    const res = await fetch(`/api/admin/employee-requests/${requestId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('solvix_token')}`,
      },
      body: JSON.stringify({ action: 'approve' }),
    });
    const data = await res.json();
    if (data.success) {
      Notification.success({ title: 'Success', message: data.message || 'Employee approved successfully' });
      // Refresh the list
      const res2 = await fetch('/api/admin/employee-requests', {
        headers: { Authorization: `Bearer ${localStorage.getItem('solvix_token')}` },
      });
      const data2 = await res2.json();
      setRequests(data2.requests || []);
      setTotalCount(data2.count || 0);
    } else {
      Notification.error({ title: 'Error', message: data.error || 'Failed to approve employee' });
    }
  };

  // Handle reject request
  const handleReject = async (requestId, event) => {
    // Show confirmation dialog with reason input
    const reason = window.prompt('Enter rejection reason (optional):', '');
    if (reason === null) return; // User cancelled

    const res = await fetch(`/api/admin/employee-requests/${requestId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('solvix_token')}`,
      },
      body: JSON.stringify({ action: 'reject', notes: reason }),
    });
    const data = await res.json();
    if (data.success) {
      Notification.success({ title: 'Success', message: data.message || 'Employee request rejected' });
      // Refresh the list
      const res2 = await fetch('/api/admin/employee-requests', {
        headers: { Authorization: `Bearer ${localStorage.getItem('solvix_token')}` },
      });
      const data2 = await res2.json();
      setRequests(data2.requests || []);
      setTotalCount(data2.count || 0);
    } else {
      Notification.error({ title: 'Error', message: data.error || 'Failed to reject employee' });
    }
  };

  return (
    <div className="page">
      <AdminSidebar />
      <main className="main-content" style={{ marginLeft: '240px', padding: '2rem', minHeight: '100vh' }}>
        <AdminHeader />

        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ margin: '0 0 1rem 0', color: '#1a237e', fontSize: '1.5rem' }}>
            Employee Access Requests
          </h1>

          <p style={{ margin: '0 0 1rem 0', color: '#666', fontSize: '0.875rem' }}>
            Review and manage pending employee access requests.
          </p>
        </div>

        {loading ? (
          <p>Loading pending requests...</p>
        ) : requests.length === 0 ? (
          <div style={{
            padding: '2rem',
            textAlign: 'center',
            color: '#666',
          }}>
            <svg style={{ width: '4rem', height: '4rem', margin: '0 auto 1rem' }}>
              <use href="#info" width="48" height="48" />
            </svg>
            <p>No pending employee requests</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <Table>
              <Table.TableHead>
                <Table.Row>
                  <Table.Head>Employee Name</Table.Head>
                  <Table.Head>Email</Table.Head>
                  <Table.Head>Phone</Table.Head>
                  <Table.Head>Employee ID</Table.Head>
                  <Table.Head>Requested Department</Table.Head>
                  <Table.Head>Request Date</Table.Head>
                  <Table.Head>Status</Table.Head>
                  <Table.Head>Actions</Table.Head>
                </Table.Row>
              </Table.TableHead>
              <Table.TableBody>
                {requests.map((request) => (
                  <Table.Row key={request.id}>
                    <Table.Cell>{request.full_name || 'N/A'}</Table.Cell>
                    <Table.Cell>{request.email || 'N/A'}</Table.Cell>
                    <Table.Cell>{request.phone || 'N/A'}</Table.Cell>
                    <Table.Cell>{request.employee_id || 'N/A'}</Table.Cell>
                    <Table.Cell>
                      {request.department_requested || 'Not specified'}
                    </Table.Cell>
                    <Table.Cell>
                      {request.created_at ? new Date(request.created_at).toLocaleDateString() : 'N/A'}
                    </Table.Cell>
                    <Table.Cell>
                      {request.is_active === true ? (
                        <Badge status="success">Active</Badge>
                      ) : (
                        <Badge status="pending">Pending</Badge>
                      )}
                    </Table.Cell>
                    <Table.Cell>
                      <Button
                        style={{
                          padding: '0.25rem 0.5rem',
                          fontSize: '0.75rem',
                          background: '#1a237e',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                        }}
                        onClick={() => handleApprove(request.id)}
                        title="Approve"
                      >
                        Approve
                      </Button>
                      <Button
                        style={{
                          marginLeft: '0.25rem',
                          padding: '0.25rem 0.5rem',
                          fontSize: '0.75rem',
                          background: '#e53935',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                        }}
                        onClick={() => handleReject(request.id)}
                        title="Reject"
                      >
                        Reject
                      </Button>
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.TableBody>
            </Table>

            {/* Pagination */}
            {totalCount > limit && (
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                padding: '1rem',
                gap: '0.5rem',
              }}>
                <Button
                  style={{ flex: 1, padding: '0.5rem', fontSize: '0.75rem' }}
                  onClick={() => setPage(Math.max(1, page - 1))}
                >
                  Prev
                </Button>
                <span>
                  Page {page} of {Math.ceil(totalCount / limit)}
                </span>
                <Button
                  style={{ flex: 1, padding: '0.5rem', fontSize: '0.75rem' }}
                  onClick={() => setPage(page + 1)}
                >
                  Next
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Quick Stats */}
        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '1.5rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          marginTop: '2rem',
        }}>
          <h3 style={{ margin: '0 0 1rem 0', color: '#1a237e', fontSize: '0.875rem', textTransform: 'uppercase' }}>
            Approval Summary
          </h3>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: '1rem',
          }}>
            <div style={{
              background: '#e8f5e9',
              padding: '0.75rem',
              borderRadius: '8px',
            }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#2e7d32' }}>
                {totalCount}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#666' }}>Pending Requests</div>
            </div>
            <div style={{
              background: '#e3f2fd',
              padding: '0.75rem',
              borderRadius: '8px',
            }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1a237e' }}>
                {Math.max(0, totalCount - 5)}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#666' }}>Approved This Month</div>
            </div>
            <div style={{
              background: '#fff3e0',
              padding: '0.75rem',
              borderRadius: '8px',
            }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#f57f17' }}>
                {0}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#666' }}>Rejected This Month</div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default EmployeeRequests;