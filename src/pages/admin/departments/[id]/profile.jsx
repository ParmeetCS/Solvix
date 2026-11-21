import React, { useEffect, useState } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import AdminSidebar from '@/components/AdminSidebar';
import AdminHeader from '@/components/AdminHeader';
import { Card, Table, Badge } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { jsonResponse } from '@/services/api';

const DepartmentProfile = () => {
  const { user, status } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();

  const [department, setDepartment] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status !== 'authenticated' || user.account_type !== 'admin') {
      navigate('/');
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch department details
        const deptRes = await fetch(`/api/admin/departments/[id]?id=${id}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('solvix_token')}` },
        });
        const deptData = await deptRes.json();
        setDepartment(deptData);

        // Fetch employees assigned to this department
        const empRes = await fetch(`/api/admin/departments/[id]/employees?id=${id}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('solvix_token')}` },
        });
        const empData = await empRes.json();
        setEmployees(empData.employees || []);
      } catch (error) {
        console.error('Failed to fetch department details:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, status, navigate, id]);

  if (status !== 'authenticated' || user.account_type !== 'admin') {
    return null;
  }

  if (loading) {
    return (
      <div className="page">
        <h1>Department Details</h1>
        <p>Loading department data...</p>
      </div>
    );
  }

  if (!department) {
    return (
      <div className="page">
        <Alert type="error">Department not found</Alert>
      </div>
    );
  }

  return (
    <div className="page">
      <AdminSidebar />
      <main className="main-content" style={{ marginLeft: '240px', padding: '2rem', minHeight: '100vh' }}>
        <AdminHeader />

        <div style={{ maxWidth: '800px' }}>
          <h1 style={{ margin: '0 0 1rem 0', color: '#1a237e', fontSize: '1.5rem' }}>
            Department: {department.name || 'Unknown'}
          </h1>

          {/* Department Information Card */}
          <Card style={{ marginBottom: '1.5rem' }}>
            <Table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <Table.Row>
                <Table.Cell style={{ fontWeight: 'bold', color: '#1a237e' }}>Department Name</Table.Cell>
                <Table.Cell>{department.name || 'N/A'}</Table.Cell>
              </Table.Row>
              <Table.Row>
                <Table.Cell>Department Code</Table.Cell>
                <Table.Cell>{department.code || 'N/A'}</Table.Cell>
              </Table.Row>
              <Table.Row>
                <Table.Cell>Description</Table.Cell>
                <Table.Cell>{department.description || 'N/A'}</Table.Cell>
              </Table.Row>
              <Table.Row>
                <Table.Cell>Status</Table.Cell>
                <Table.Cell>
                  {department.is_active === true ? (
                    <Badge status="success">Active</Badge>
                  ) : (
                    <Badge status="error">Inactive</Badge>
                  )}
                </Table.Cell>
              </Table.Row>
              <Table.Row>
                <Table.Cell>Created At</Table.Cell>
                <Table.Cell>{department.created_at ? new Date(department.created_at).toLocaleDateString() : 'N/A'}</Table.Cell>
              </Table.Row>
            </Table>
          </Card>

          {/* Assigned Employees */}
          {employees.length > 0 ? (
            <Card>
              <h3 style={{ margin: '0 0 1rem 0', color: '#1a237e', fontSize: '0.875rem', textTransform: 'uppercase' }}>
                Assigned Employees ({employees.length})
              </h3>
              <Table>
                <Table.TableHead>
                  <Table.Row>
                    <Table.Head>Employee Name</Table.Head>
                    <Table.Head>Email</Table.Head>
                    <Table.Head>Role</Table.Head>
                    <Table.Head>Status</Table.Head>
                  </Table.Row>
                </Table.TableHead>
                <Table.TableBody>
                  {employees.map((emp) => (
                    <Table.Row key={emp.id}>
                      <Table.Cell>{emp.full_name || 'N/A'}</Table.Cell>
                      <Table.Cell>{emp.email || 'N/A'}</Table.Cell>
                      <Table.Cell>
                        {emp.role_id && (
                          <Badge
                            status={emp.role_id.code === 'admin' ? 'critical' : 'default'}
                          >
                            {emp.roles?.name || 'Role'}
                          </Badge>
                        )}
                        {!emp.role_id && <span style={{ color: '#e53935' }}>No Role</span>}
                      </Table.Cell>
                      <Table.Cell>
        {emp.is_active === true ? (
          <Badge status="success">Active</Badge>
        ) : (
          <Badge status="error">Inactive</Badge>
        )}
</Table.Cell>
</Table.Row>
</Table.TableBody>
</Table>
</Card>
) : (
  <p style={{ padding: '1rem', color: '#666' }}>
    No employees assigned to this department
  </p>
)}

          {/* Department Actions */}
          <div style={{ marginTop: '1.5rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
            <Button
              style={{
                background: '#1a237e',
                color: 'white',
                border: 'none',
                padding: '0.75rem',
                borderRadius: '8px',
                fontSize: '0.875rem',
              }}
              onClick={() => navigate('/admin/departments')}
            >
              Back to Departments
            </Button>
            <Button
              style={{
                background: '#388e3c',
                color: 'white',
                border: 'none',
                padding: '0.75rem',
                borderRadius: '8px',
                fontSize: '0.875rem',
              }}
            >
              Edit Department
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default DepartmentProfile;