import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import AdminSidebar from '@/components/AdminSidebar';
import AdminHeader from '@/components/AdminHeader';
import { Table, Input, Select, Badge, Card, Notification } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { jsonResponse } from '@/services/api';

const ActivityLogs = () => {
  const { user, status } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // State for activity logs
  const [activityLogs, setActivityLogs] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [selectedAction, setSelectedAction] = useState('');
  const [selectedEntityType, setSelectedEntityType] = useState('');

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status !== 'authenticated' || user.account_type !== 'admin') {
      navigate('/');
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/admin/activity-logs?page=${page}&limit=${limit}&action=${selectedAction}&entityType=${selectedEntityType}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('solvix_token')}` },
        });
        const data = await res.json();
        setActivityLogs(data.activityLogs || []);
        setTotalCount(data.totalCount || 0);
      } catch (error) {
        console.error('Failed to fetch activity logs:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, status, page, limit, selectedAction, selectedEntityType]);

  if (status !== 'authenticated' || user.account_type !== 'admin') {
    return null;
  }

  if (loading) {
    return (
      <div className="page">
        <h1>Activity Logs</h1>
        <p>Loading activity logs...</p>
      </div>
    );
  }

  // Filter options
  const [actionFilters, setActionFilters] = useState([
    { value: '', label: 'All Actions' },
    { value: 'employee_approval', label: 'Employee Approval' },
    { value: 'employee_rejection', label: 'Employee Rejection' },
    { value: 'department_assignment', label: 'Department Assignment' },
    { value: 'status_update', label: 'Status Update' },
  ]);

  return (
    <div className="page">
      <AdminSidebar />
      <main className="main-content" style={{ marginLeft: '240px', padding: '2rem', minHeight: '100vh' }}>
        <AdminHeader />

        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ margin: '0 0 1rem 0', color: '#1a237e', fontSize: '1.5rem' }}>
            Activity Logs
          </h1>

          <p style={{ margin: '0 0 1rem 0', color: '#666', fontSize: '0.875rem' }}>
            Audit trail of administrative actions across the organization.
          </p>
        </div>

        {loading ? (
          <p>Loading activity logs...</p>
        ) : activityLogs.length === 0 ? (
          <div style={{
            padding: '2rem',
            textAlign: 'center',
            color: '#666',
          }}>
            <svg style={{ width: '4rem', height: '4rem', margin: '0 auto 1rem' }}>
              <use href="#info" width="48" height="48" />
            </svg>
            <p>No activity logs found</p>
            <p style={{ marginTop: '0.5rem', color: '#999' }}>
              No administrative actions have been recorded yet.
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <Table>
              <Table.TableHead>
                <Table.Row>
                  <Table.Head>Timestamp</Table.Head>
                  <Table.Head>User</Table.Head>
                  <Table.Head>Action</Table.Head>
                  <Table.Head>Entity</Table.Head>
                  <Table.Head>Entity ID</Table.Head>
                  <Table.Head>Department</Table.Head>
                </Table.Row>
              </Table.TableHead>
              <Table.TableBody>
                {activityLogs.map((log) => (
                  <Table.Row key={log.id}>
                    <Table.Cell>
                      {log.timestamp ? new Date(log.timestamp).toLocaleString() : 'N/A'}
                    </Table.Cell>
                    <Table.Cell>
                      {log.user || 'System'}
                    </Table.Cell>
                    <Table.Cell>
                      {log.action}
                    </Table.Cell>
                    <Table.Cell>
                      {log.entity || 'Unknown'}
                    </Table.Cell>
                    <Table.Cell>{log.entityId || 'N/A'}</Table.Cell>
                    <Table.Cell>
                      {log.department || '—'}
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

        {/* Action Filters Section */}
        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '1.5rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          marginTop: '2rem',
        }}>
          <h3 style={{ margin: '0 0 1rem 0', color: '#1a237e', fontSize: '0.875rem', textTransform: 'uppercase' }}>
            Filter Logs
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
            <Select
              value={selectedAction}
              onValueChange={(val) => setSelectedAction(val)}
              options={actionFilters}
              style={{ width: '100%' }}
            />
            <Select
              value={selectedEntityType}
              onValueChange={(val) => setSelectedEntityType(val)}
              options={[
                { value: '', label: 'All Entity Types' },
                { value: 'profile', label: 'Profile' },
                { value: 'order', label: 'Order' },
                { value: 'customer', label: 'Customer' },
                { value: 'lead', label: 'Lead' },
              ]}
              style={{ width: '100%' }}
            />
          </div>
        </div>
      </main>
    </div>
  );
};

export default ActivityLogs;