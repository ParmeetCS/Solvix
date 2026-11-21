import React, { useEffect, useState } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import AdminSidebar from '@/components/AdminSidebar';
import AdminHeader from '@/components/AdminHeader';
import { Table, Button, Input, Select, Badge, Icon, Drawer, Dialog, DialogAction, Notification } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { jsonResponse } from '@/services/api';

const EmployeeManagement = () => {
  const { user, status } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const path = useParams();

  // State for employee table
  const [employees, setEmployees] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [search, setSearch] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  // Department and role options
  const [departments, setDepartments] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch departments and roles
  useEffect(() => {
    if (status !== 'authenticated' || user.account_type !== 'admin') {
      navigate('/');
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch departments
        const deptRes = await fetch('/api/admin/departments', {
          headers: { Authorization: `Bearer ${localStorage.getItem('solvix_token')}` },
        });
        const deptData = await deptRes.json();
        setDepartments(deptData || []);

        // Fetch roles
        const rolesRes = await fetch('/api/admin/settings', {
          headers: { Authorization: `Bearer ${localStorage.getItem('solvix_token')}` },
        });
        const rolesData = await rolesRes.json();
        setRoles(rolesData.roles || []);

        // Fetch employees
        const empRes = await fetch(`/api/admin/employees?page=${page}&limit=${limit}&search=${search}&department=${selectedDepartment}&role=${selectedRole}&status=${selectedStatus}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('solvix_token')}` },
        });
        const empData = await empRes.json();
        setEmployees(empData.employees || []);
        setTotalCount(empData.totalCount || 0);
      } catch (error) {
        console.error('Failed to fetch employee data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, status, navigate, page, limit, search, selectedDepartment, selectedRole, selectedStatus]);

  if (status !== 'authenticated' || user.account_type !== 'admin') {
    return null;
  }

  if (loading) {
    return (
      <div className="page">
        <h1>Employee Management</h1>
        <p>Loading employee data...</p>
      </div>
    );
  }

  // Handle employee status change
  const handleStatusChange = async (employeeId, newStatus) => {
    const res = await fetch(`/api/admin/employees/[id]/status?id=${employeeId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('solvix_token')}`,
      },
      body: JSON.stringify({ status: newStatus }),
    });
    const data = await res.json();
    if (data.success) {
      // Refresh employee list
      const empRes = await fetch(`/api/admin/employees?page=${page}&limit=${limit}&search=${search}&department=${selectedDepartment}&role=${selectedRole}&status=${selectedStatus}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('solvix_token')}` },
      });
      const empData = await empRes.json();
      setEmployees(empData.employees || []);
      setTotalCount(empData.totalCount || 0);
      Notification.success({ title: 'Success', message: data.message || 'Employee status updated' });
    } else {
      Notification.error({ title: 'Error', message: data.error || 'Failed to update employee status' });
    }
  };

  // Handle department assignment
  const handleDepartmentChange = async (employeeId, departmentId) => {
    const res = await fetch(`/api/admin/employees/[id]/department?id=${employeeId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('solvix_token')}`,
      },
      body: JSON.stringify({ departmentId }),
    });
    const data = await res.json();
    if (data.success) {
      Notification.success({ title: 'Success', message: data.message || 'Department assigned' });
    } else {
      Notification.error({ title: 'Error', message: data.error || 'Failed to assign department' });
    }
  };

  // Handle view employee details
  const viewEmployeeDetails = async (employeeId) => {
    navigate(`/admin/employees/${employeeId}`);
  };

  return (
    <div className="page">
      <AdminSidebar />
      <main className="main-content" style={{ marginLeft: '240px', padding: '2rem', minHeight: '100vh' }}>
        <AdminHeader />

        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ margin: '0 0 1rem 0', color: '#1a237e', fontSize: '1.5rem' }}>
            Employee Management
          </h1>

          {/* Toolbar with search and filters */}
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '1.5rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            marginBottom: '1.5rem',
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
              <div style={{ flex: 1 }}>
                <Input
                  placeholder="Search by name, email, or employee ID"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{ width: '100%' }}
                />
              </div>

              <Select
                label="Department"
                value={selectedDepartment}
                onValueChange={(val) => setSelectedDepartment(val)}
                options={departments.map((d) => ({ value: d.id, label: d.name }))}
                style={{ width: '100%' }}
                isSearchable
              />

              <Select
                label="Role"
                value={selectedRole}
                onValueChange={(val) => setSelectedRole(val)}
                options={roles.map((r) => ({ value: r.id, label: r.name }))}
                style={{ width: '100%' }}
                isSearchable
              />

              <Select
                label="Status"
                value={selectedStatus}
                onValueChange={(val) => setSelectedStatus(val)}
                options={[
                  { value: '', label: 'All Statuses' },
                  { value: 'active', label: 'Active' },
                  { value: 'inactive', label: 'Inactive' },
                ]}
                style={{ width: '100%' }}
              />

              <Button
                style={{
                  background: '#1a237e',
                  color: 'white',
                  border: 'none',
                  padding: '0.75rem 1.5rem',
                  borderRadius: '8px',
                  fontSize: '0.875rem',
                }}
                onClick={() => {
                  // Refresh with current filters
                  const empRes = fetch(`/api/admin/employees?page=1&limit=${limit}&search=${search}&department=${selectedDepartment}&role=${selectedRole}&status=${selectedStatus}`, {
                    headers: { Authorization: `Bearer ${localStorage.getItem('solvix_token')}` },
                  });
                }}
              >
                Refresh
              </Button>
            </div>
          </div>

          {/* Employee Table */}
          <div style={{
            background: 'white',
            borderRadius: '12px',
            overflow: 'hidden',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          }}>
            {loading ? (
              <p>Loading employees...</p>
            ) : employees.length === 0 ? (
              <p style={{ padding: '2rem', color: '#666' }}>
                No employees found. Employees may need to register first.
              </p>
            ) : (
              <Table>
                <Table.TableHead>
                  <Table.Row>
                    <Table.Head>Employee ID</Table.Head>
                    <Table.Head>Name</Table.Head>
                    <Table.Head>Email</Table.Head>
                    <Table.Head>Phone</Table.Head>
                    <Table.Head>Department</Table.Head>
                    <Table.Head>Role</Table.Head>
                    <Table.Head>Status</Table.Head>
                    <Table.Head>Date Joined</Table.Head>
                    <Table.Head>Actions</Table.Head>
                  </Table.Row>
                </Table.TableHead>
                <Table.TableBody>
                  {employees.map((employee) => (
                    <Table.Row key={employee.id}>
                      <Table.Cell>{employee.employee_id || employee.id.substring(0, 8)}</Table.Cell>
                      <Table.Cell>{employee.full_name || 'N/A'}</Table.Cell>
                      <Table.Cell>{employee.email || 'N/A'}</Table.Cell>
                      <Table.Cell>{employee.phone || 'N/A'}</Table.Cell>
                      <Table.Cell>
                        {employee.department_id && (
                          <span style={{ color: '#1a237e', fontWeight: 'bold' }}>
                            {employee.departments?.name || 'Department'}
                          </span>
                        )}
                        {!employee.department_id && <span style={{ color: '#e53935' }}>Unassigned</span>}
                      </Table.Cell>
                      <Table.Cell>
                        {employee.role_id && (
                          <Badge
                            status={employee.role_id.code === 'admin' ? 'critical' : 'default'}
                          >
                            {employee.roles?.name || 'Role'}
                          </Badge>
                        )}
                        {!employee.role_id && <span style={{ color: '#e53935' }}>No Role</span>}
                      </Table.Cell>
                      <Table.Cell>
                        {employee.is_active === true ? (
                          <Badge status="success">Active</Badge>
                        ) : (
                          <Badge status="error">Inactive</Badge>
                        )}
                      </Table.Cell>
                      <Table.Cell>{employee.created_at ? new Date(employee.created_at).toLocaleDateString() : 'N/A'}</Table.Cell>
                      <Table.Cell>
                        <Button
                          style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                          onClick={() => viewEmployeeDetails(employee.id)}
                        >
                          Details
                        </Button>
                        <Button
                          style={{
                            marginLeft: '0.25rem',
                            padding: '0.25rem 0.5rem',
                            fontSize: '0.75rem',
                            background: '#1a237e',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                        }}
                        >
                          Edit
                        </Button>
                      </Table.Cell>
                    </Table.Row>
                  ))}
                </Table.TableBody>
              </Table>
            )}

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
        </div>

        {/* Employee Actions Section */}
        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '1.5rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          marginTop: '2rem',
        }}>
          <h3 style={{ margin: '0 0 1rem 0', color: '#1a237e', fontSize: '0.875rem', textTransform: 'uppercase' }}>
            Employee Actions
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
              onClick={() => navigate('/admin/employees/requests')}
            >
              View Pending Requests
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
              Add New Employee
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
              Bulk Operations
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default EmployeeManagement;