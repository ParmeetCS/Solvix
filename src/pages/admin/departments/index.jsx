import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import AdminSidebar from '@/components/AdminSidebar';
import AdminHeader from '@/components/AdminHeader';
import { Table, Button, Input, Select, Badge, Card, Notification } from '@/components/ui';
import { useAuth } from '@/context/auth';

const DepartmentManagement = () => {
  const { user, status } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // State for departments table
  const [departments, setDepartments] = useState([]);
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
        // Fetch departments
        const res = await fetch('/api/admin/departments', {
          headers: { Authorization: `Bearer ${localStorage.getItem('solvix_token')}` },
        });
        const data = await res.json();
        setDepartments(data || []);
        setTotalCount(data.length || 0);
      } catch (error) {
        console.error('Failed to fetch departments:', error);
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
        <h1>Department Management</h1>
        <p>Loading department data...</p>
      </div>
    );
  }

  // View department details
  const viewDepartmentDetails = (departmentId) => {
    navigate(`/admin/departments/${departmentId}`);
  };

  return (
    <div className="page">
      <AdminSidebar />
      <main className="main-content" style={{ marginLeft: '240px', padding: '2rem', minHeight: '100vh' }}>
        <AdminHeader />

        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ margin: '0 0 1rem 0', color: '#1a237e', fontSize: '1.5rem' }}>
            Department Management
          </h1>

          <p style={{ margin: '0 0 1rem 0', color: '#666', fontSize: '0.875rem' }}>
            Manage organizational departments and assigned employees.
          </p>
        </div>

        {loading ? (
          <p>Loading departments...</p>
        ) : departments.length === 0 ? (
          <div style={{
            padding: '2rem',
            textAlign: 'center',
            color: '#666',
          }}>
            <svg style={{ width: '4rem', height: '4rem', margin: '0 auto 1rem' }}>
              <use href="#folder" width="48" height="48" />
            </svg>
            <p>No departments found</p>
            <p style={{ marginTop: '0.5rem', color: '#999' }}>
              Departments may need to be created first.
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <Table>
              <Table.TableHead>
                <Table.Row>
                  <Table.Head>Department Name</Table.Head>
                  <Table.Head>Code</Table.Head>
                  <Table.Head>Description</Table.Head>
                  <Table.Head>Employees</Table.Head>
                  <Table.Head>Status</Table.Head>
                  <Table.Head>Actions</Table.Head>
                </Table.Row>
              </Table.TableHead>
              <Table.TableBody>
                {departments.map((dept) => (
                  <Table.Row key={dept.id}>
                    <Table.Cell>{dept.name || 'Unnamed'}</Table.Cell>
                    <Table.Cell>{dept.code || 'N/A'}</Table.Cell>
                    <Table.Cell>{dept.description || 'N/A'}</Table.Cell>
                    <Table.Cell>
                      {dept.employeeCount !== undefined ? dept.employeeCount : '0'}
                    </Table.Cell>
                    <Table.Cell>
                      {dept.is_active === true ? (
                        <Badge status="success">Active</Badge>
                      ) : (
                        <Badge status="error">Inactive</Badge>
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
                        onClick={() => viewDepartmentDetails(dept.id)}
                        title="View Details"
                      >
                        View
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

        {/* Department Actions Section */}
        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '1.5rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          marginTop: '2rem',
        }}>
          <h3 style={{ margin: '0 0 1rem 0', color: '#1a237e', fontSize: '0.875rem', textTransform: 'uppercase' }}>
            Department Actions
          </h3>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '1rem',
          }}>
            <Button
              style={{
                background: '#1a237e',
                color: 'white',
                border: 'none',
                padding: '0.75rem',
                borderRadius: '8px',
                fontSize: '0.875rem',
                width: '100%',
              }}
            >
              Create Department
            </Button>
            <Button
              style={{
                background: '#388e3c',
                color: 'white',
                border: 'none',
                padding: '0.75rem',
                borderRadius: '8px',
                fontSize: '0.875rem',
                width: '100%',
              }}
            >
              Assign Employees
            </Button>
            <Button
              style={{
                background: '#f57f17',
                color: 'white',
                border: 'none',
                padding: '0.75rem',
                borderRadius: '8px',
                fontSize: '0.875rem',
                width: '100%',
              }}
            >
              Department Settings
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default DepartmentManagement;