import React, { useEffect, useState } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import AdminSidebar from '@/components/AdminSidebar';
import AdminHeader from '@/components/AdminHeader';
import { Card, Alert } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { jsonResponse } from '@/services/api';

const EmployeeProfile = () => {
  const { user, status } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();

  const [employee, setEmployee] = useState(null);
  const [assignedDepartments, setAssignedDepartments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status !== 'authenticated' || user.account_type !== 'admin') {
      navigate('/');
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch employee details
        const empRes = await fetch(`/api/admin/employees/[id]?id=${id}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('solvix_token')}` },
        });
        const empData = await empRes.json();
        setEmployee(empData);

        // Fetch assigned departments
        const deptRes = await fetch(`/api/admin/employees/[id]/department?id=${id}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('solvix_token')}` },
        });
        const deptData = await deptRes.json();
        setAssignedDepartments(deptData.assignedDepartments || []);
      } catch (error) {
        console.error('Failed to fetch employee profile:', error);
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
        <h1>Employee Profile</h1>
        <p>Loading employee profile...</p>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="page">
        <Alert type="error">Employee not found</Alert>
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
            Employee Profile: {employee.full_name || 'Unknown'}
          </h1>

          {/* Employee Information Card */}
          <Card style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ margin: '0 0 1rem 0', color: '#1a237e', fontSize: '0.875rem', textTransform: 'uppercase' }},
              Employee Information
            >
              <Table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <Table.Row>
                  <Table.Cell style={{ width: '40%' }}>Employee ID</Table.Cell>
                  <Table.Cell style={{ width: '60%' }}>{employee.employee_id || employee.id.substring(0, 8)}</Table.Cell>
                </Table.Row>
                <Table.Row>
                  <Table.Cell>Full Name</Table.Cell>
                  <Table.Cell>{employee.full_name || 'N/A'}</Table.Cell>
                </Table.Row>
                <Table.Row>
                  <Table.Cell>Email</Table.Cell>
                  <Table.Cell>{employee.email || 'N/A'}</Table.Cell>
                </Table.Row>
                <Table.Row>
                  <Table.Cell>Phone</Table.Cell>
                  <Table.Cell>{employee.phone || 'N/A'}</Table.Cell>
                </Table.Row>
                <Table.Row>
                  <Table.Cell>Account Status</Table.Cell>
                  <Table.Cell>
                    {employee.is_active === true ? (
                      <Badge status="success">Active</Badge>
                    ) : (
                      <Badge status="error">Inactive</Badge>
                    )}
                  </Table.Cell>
                </Table.Row>
                <Table.Row>
                  <Table.Cell>Date Joined</Table.Cell>
                  <Table.Cell>{employee.created_at ? new Date(employee.created_at).toLocaleDateString() : 'N/A'}</Table.Cell>
                </Table.Row>
                <Table.Row>
                  <Table.Cell>Department</Table.Cell>
                  <Table.Cell>
                    {employee.department_id && (
                      <span style={{ color: '#1a237e', fontWeight: 'bold' }}>
                        {employee.departments?.name || 'Department'}
                      </span>
                    )}
                    {!employee.department_id && <span style={{ color: '#e53935' }}>Unassigned</span>}
                  </Table.Cell>
                </Table.Row>
                <Table.Row>
                  <Table.Cell>Assigned Role</Table.Cell>
                  <Table.Cell>
                    {employee.role_id && (
                      <Badge
                        status={employee.role_id.code === 'admin' ? 'critical' : 'default'}
                      >
                        {employee.roles?.name || 'No Role'}
                      </Badge>
                    )}
                    {!employee.role_id && <span style={{ color: '#e53935' }}>No Role</span>}
                  </Table.Cell>
                </Table.Row>
                <Table.Row>
                  <Table.Cell>Department Requested</Table.Cell>
                  <Table.Cell>{employee.department_requested || 'None'}</Table.Cell>
                </Table.Row>
              </Table>
            </Table>
          </Card>

          {/* Assigned Departments */}
          {assignedDepartments.length > 0 && (
            <Card>
              <h3 style={{ margin: '0 0 1rem 0', color: '#1a237e', fontSize: '0.875rem', textTransform: 'uppercase' }}>
                Assigned Departments
              </h3>
              <ul style={{ listStyle: 'none', padding: 0 }}>
                {assignedDepartments.map((dept) => (
                  <li key={dept.id} style={{
                    padding: '0.25rem 0',
                    borderBottom: '1px solid #f0f0f0',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}>
                    <span style={{ color: '#1a237e', fontWeight: 'bold' }}>{dept.departments?.name || dept.name}</span>
                    <span style={{ fontSize: '0.75rem', color: '#666' }}>
                      {dept.is_approved ? 'Approved' : 'Pending'}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {/* Action Buttons */}
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
              onClick={() => navigate('/admin/employees')}
            >
              Back to List
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
              Edit Profile
            </Button>
            <Button
              style={{
                background: '#f57f17',
                color: 'white',
                border: 'none',
                padding: '0.75rem',
                borderRadius: '8px',
                fontSize: '0.875rem',
              }}
            >
              Assign Department
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default EmployeeProfile;