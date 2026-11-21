import React, { useEffect, useState } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import AdminSidebar from '@/components/AdminSidebar';
import AdminHeader from '@/components/AdminHeader';
import { Card, Table, Badge } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { jsonResponse } from '@/services/api';

const CustomerProfile = () => {
  const { user, status } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();

  const [customer, setCustomer] = useState(null);
  const [projectCount, setProjectCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status !== 'authenticated' || user.account_type !== 'admin') {
      navigate('/');
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch customer details
        const custRes = await fetch(`/api/admin/customers/[id]?id=${id}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('solvix_token')}` },
        });
        const custData = await custRes.json();
        setCustomer(custData);

        // Count projects via orders linked to this customer
        if (customer && customer.id) {
          const projRes = await fetch(`/api/admin/projects?search=${customer.contact_name || ''}`, {
            headers: { Authorization: `Bearer ${localStorage.getItem('solvix_token')}` },
          });
          const projData = await projRes.json();
          // Count orders for this customer instead
          const ordersRes = await fetch(`/api/admin/orders?search=${customer.contact_name || ''}`, {
            headers: { Authorization: `Bearer ${localStorage.getItem('solvix_token')}` },
          });
          const ordersData = await ordersRes.json();
          setProjectCount(ordersData.projects ? ordersData.projects.length : 0);
        }
      } catch (error) {
        console.error('Failed to fetch customer profile:', error);
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
        <h1>Customer Profile</h1>
        <p>Loading customer profile...</p>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="page">
        <Alert type="error">Customer not found</Alert>
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
            Customer: {customer.contact_name || customer.customer_code || 'Unknown'}
          </h1>

          {/* Customer Information Card */}
          <Card style={{ marginBottom: '1.5rem' }}>
            <Table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <Table.Row>
                <Table.Cell style={{ width: '40%' }}>Customer ID</Table.Cell>
                <Table.Cell>{customer.customer_code || customer.id.substring(0, 8)}</Table.Cell>
              </Table.Row>
              <Table.Row>
                <Table.Cell>Company Name</Table.Cell>
                <Table.Cell>{customer.company_name || 'N/A'}</Table.Cell>
              </Table.Row>
              <Table.Row>
                <Table.Cell>Contact Name</Table.Cell>
                <Table.Cell>{customer.contact_name || 'N/A'}</Table.Cell>
              </Table.Row>
              <Table.Row>
                <Table.Cell>Email</Table.Cell>
                <Table.Cell>{customer.email || 'N/A'}</Table.Cell>
              </Table.Row>
              <Table.Row>
                <Table.Cell>Phone</Table.Cell>
                <Table.Cell>{customer.phone || 'N/A'}</Table.Cell>
              </Table.Row>
              <Table.Row>
                <Table.Cell>Customer Type</Table.Cell>
                <Table.Cell>{customer.customer_type || 'N/A'}</Table.Cell>
              </Table.Row>
              <Table.Row>
                <Table.Cell>Status</Table.Cell>
                <Table.Cell>
                  {customer.status === 'active' ? (
                    <Badge status="success">Active</Badge>
                  ) : (
                    <Badge status="error">Inactive</Badge>
                  )}
                </Table.Cell>
              </Table.Row>
              <Table.Row>
                <Table.Cell>Tax ID</Table.Cell>
                <Table.Cell>{customer.tax_id || 'N/A'}</Table.Cell>
              </Table.Row>
              <Table.Row>
                <Table.Cell>Notes</Table.Cell>
                <Table.Cell>{customer.notes || 'N/A'}</Table.Cell>
              </Table.Row>
            </Table>
          </Card>

          {/* Associated Projects Summary */}
          {projectCount > 0 && (
            <Card>
              <h3 style={{ margin: '0 0 1rem 0', color: '#1a237e', fontSize: '0.875rem', textTransform: 'uppercase' }}>
                Associated Projects ({projectCount})
              </h3>
              <p style={{ margin: '0', color: '#333' }}>
                This customer has {projectCount} project(s) associated with their account.
              </p>
            </Card>
          )}

          {/* Action Button */}
          <div style={{ marginTop: '1.5rem' }}>
            <Button
              style={{
                background: '#1a237e',
                color: 'white',
                border: 'none',
                padding: '0.75rem',
                borderRadius: '8px',
                fontSize: '0.875rem',
              }}
              onClick={() => navigate('/admin/customers')}
            >
              Back to Customers
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default CustomerProfile;