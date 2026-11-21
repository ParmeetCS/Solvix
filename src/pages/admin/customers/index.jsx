import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import AdminSidebar from '@/components/AdminSidebar';
import AdminHeader from '@/components/AdminHeader';
import { Table, Button, Input, Select, Badge, Card, Notification } from '@/components/ui';
import { useAuth } from '@/context/auth';

const CustomerManagement = () => {
  const { user, status } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // State for customers table
  const [customers, setCustomers] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [search, setSearch] = useState('');
  const [selectedCustomerType, setSelectedCustomerType] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status !== 'authenticated' || user.account_type !== 'admin') {
      navigate('/');
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/admin/customers?page=${page}&limit=${limit}&search=${search}&customerType=${selectedCustomerType}&status=${selectedStatus}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('solvix_token')}` },
        });
        const data = await res.json();
        setCustomers(data.customers || []);
        setTotalCount(data.totalCount || 0);
      } catch (error) {
        console.error('Failed to fetch customers:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, status, page, limit, search, selectedCustomerType, selectedStatus]);

  if (status !== 'authenticated' || user.account_type !== 'admin') {
    return null;
  }

  if (loading) {
    return (
      <div className="page">
        <h1>Customer Management</h1>
        <p>Loading customer data...</p>
      </div>
    );
  }

  // View customer details
  const viewCustomerDetails = (customerId) => {
    navigate(`/admin/customers/${customerId}`);
  };

  return (
    <div className="page">
      <AdminSidebar />
      <main className="main-content" style={{ marginLeft: '240px', padding: '2rem', minHeight: '100vh' }}>
        <AdminHeader />

        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ margin: '0 0 1rem 0', color: '#1a237e', fontSize: '1.5rem' }}>
            Customer Management
          </h1>

          <p style={{ margin: '0 0 1rem 0', color: '#666', fontSize: '0.875rem' }}>
            Manage customer accounts and their relationship with SOLVIX.
          </p>
        </div>

        {loading ? (
          <p>Loading customers...</p>
        ) : customers.length === 0 ? (
          <div style={{
            padding: '2rem',
            textAlign: 'center',
            color: '#666',
          }}>
            <svg style={{ width: '4rem', height: '4rem', margin: '0 auto 1rem' }}>
              <use href="#user" width="48" height="48" />
            </svg>
            <p>No customers found</p>
            <p style={{ marginTop: '0.5rem', color: '#999' }}>
              Customers may need to register first.
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <Table>
              <Table.TableHead>
                <Table.Row>
                  <Table.Head>Customer ID</Table.Head>
                  <Table.Head>Customer Name</Table.Head>
                  <Table.Head>Email</Table.Head>
                  <Table.Head>Phone</Table.Head>
                  <Table.Head>Type</Table.Head>
                  <Table.Head>Status</Table.Head>
                  <Table.Head>Projects</Table.Head>
                  <Table.Head>Actions</Table.Head>
                </Table.Row>
              </Table.TableHead>
              <Table.TableBody>
                {customers.map((customer) => (
                  <Table.Row key={customer.id}>
                    <Table.Cell>{customer.customer_code || customer.id.substring(0, 8)}</Table.Cell>
                    <Table.Cell>{customer.contact_name || 'N/A'}</Table.Cell>
                    <Table.Cell>{customer.email || 'N/A'}</Table.Cell>
                    <Table.Cell>{customer.phone || 'N/A'}</Table.Cell>
                    <Table.Cell>
                      {customer.customer_type || 'N/A'}
                    </Table.Cell>
                    <Table.Cell>
                      {customer.status === 'active' ? (
                        <Badge status="success">Active</Badge>
                      ) : (
                        <Badge status="error">Inactive</Badge>
                      )}
                    </Table.Cell>
                    <Table.Cell>
                      {customer.projectCount !== undefined ? customer.projectCount : '0'}
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
                        onClick={() => viewCustomerDetails(customer.id)}
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

        {/* Customer Actions Section */}
        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '1.5rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          marginTop: '2rem',
        }}>
          <h3 style={{ margin: '0 0 1rem 0', color: '#1a237e', fontSize: '0.875rem', textTransform: 'uppercase' }}>
            Customer Actions
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
              Add Customer
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
              Import Customers
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
              Customer Settings
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default CustomerManagement;