import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import AdminSidebar from '@/components/AdminSidebar';
import AdminHeader from '@/components/AdminHeader';
import { Card, Button, Badge, Notification, Alert } from '@/components/ui';
import { useAuth } from '@/context/auth';

const InventoryOverview = () => {
  const { user, status } = useAuth();
  const navigate = useNavigate();

  const [inventoryData, setInventoryData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status !== 'authenticated' || user.account_type !== 'admin') {
      navigate('/');
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/admin/inventory/overview', {
          headers: { Authorization: `Bearer ${localStorage.getItem('solvix_token')}` },
        });
        const data = await res.json();
        setInventoryData(data);
      } catch (error) {
        console.error('Failed to fetch inventory data:', error);
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
        <h1>Inventory Overview</h1>
        <p>Loading inventory data...</p>
      </div>
    );
  }

  if (!inventoryData) {
    return (
      <div className="page">
        <Alert type="error">Failed to load inventory data</Alert>
      </div>
    );
  }

  const {
    totalProducts,
    totalStockQuantity,
    lowStockProducts,
    outOfStockProducts,
    categories,
    warehouseCount,
    warehouseOverview,
  } = inventoryData;

  return (
    <div className="page">
      <AdminSidebar />
      <main className="main-content" style={{ marginLeft: '240px', padding: '2rem', minHeight: '100vh' }}>
        <AdminHeader />

        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ margin: '0 0 1rem 0', color: '#1a237e', fontSize: '1.5rem' }}>
            Inventory Overview
          </h1>

          <p style={{ margin: '0 0 1rem 0', color: '#666', fontSize: '0.875rem' }}>
            Monitor stock levels and warehouse inventory across the organization.
          </p>
        </div>

        <div style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '2rem' }}>
          {/* Summary Stats Row */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            gap: '1rem',
            marginBottom: '1rem',
          }}>
            <Card style={{ padding: '1rem', textAlign: 'center', background: '#e8f5e9', borderRadius: '8px' }}>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#2e7d32' }}>
                {totalProducts}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#666', marginTop: '0.25rem' }}>Total Products</div>
            </Card>
            <Card style={{ padding: '1rem', textAlign: 'center', background: '#fff3e0', borderRadius: '8px' }}>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#f57f17' }}>
                {totalStockQuantity || 0}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#666', marginTop: '0.25rem' }}>Total Stock</div>
            </Card>
            <Card style={{ padding: '1rem', textAlign: 'center', background: '#fce8e6', borderRadius: '8px' }}>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#e53935' }}>
                {outOfStockProducts || 0}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#666', marginTop: '0.25rem' }}>Out of Stock</div>
            </Card>
            <Card style={{ padding: '1rem', textAlign: 'center', background: '#fff3e0', borderRadius: '8px' }}>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#f57f17' }}>
                {lowStockProducts || 0}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#666', marginTop: '0.25rem' }}>Low Stock</div>
            </Card>
          </div>

          {/* Warehouse Overview */}
          {warehouseOverview && warehouseOverview.length > 0 && (
            <Card style={{ marginTop: '1rem' }}>
              <h3 style={{ margin: '0 0 0.5rem 0', color: '#1a237e', fontSize: '0.875rem', textTransform: 'uppercase' }}>
                Warehouse Overview
              </h3>
              <p style={{ margin: '0 0 0.5rem 0', color: '#666', fontSize: '0.875rem' }}>
                {warehouseCount || 0} warehouses configured
              </p>
              <ul style={{ listStyle: 'none', padding: 0 }}>
                {warehouseOverview.slice(0, 5).map((wh) => (
                  <li key={wh.id} style={{ padding: '0.25rem 0', borderBottom: '1px solid #f0f0f0' }}>
                    <span style={{ color: '#1a237e', fontWeight: 'bold' }}>{wh.name || 'Unnamed'}</span>
                    <span style={{ fontSize: '0.75rem', color: '#666' }}>({wh.code || 'N/A'})</span>
                  </li>
                ))}
              </ul>
              <Button
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
                onClick={() => navigate('/admin/inventory')}
                >
                View All Warehouses
              </Button>
            </Card>
          )}

          {/* Low Stock Alerts */}
          {lowStockProducts > 0 && (
            <Card style={{ marginTop: '1rem', padding: '1rem', background: '#fff3e0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ fontSize: '0.875rem', color: '#f57f17', fontWeight: 'bold' }}>
                    {lowStockProducts} product(s) below minimum stock level
                  </span>
                </div>
                <Button
                  style={{
                    padding: '0.25rem 0.5rem',
                    fontSize: '0.75rem',
                    background: '#1a237e',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                  }}
                  >
                    Restock
                  </Button>
              </div>
            </Card>
          )}

          {/* Out of Stock Alerts */}
          {outOfStockProducts > 0 && (
            <Card style={{ marginTop: '1rem', padding: '1rem', background: '#fce8e6' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ fontSize: '0.875rem', color: '#e53935', fontWeight: 'bold' }}>
                    {outOfStockProducts} product(s) out of stock
                  </span>
                </div>
                <Button
                  style={{
                    padding: '0.25rem 0.5rem',
                    fontSize: '0.75rem',
                    background: '#1a237e',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                  }}
                  >
                    Reorder
                  </Button>
              </div>
            </Card>
          )}
        </div>

        {/* Product Categories */}
        {categories && Object.keys(categories).length > 0 && (
          <div style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginTop: '1rem' }}>
            <h3 style={{ margin: '0 0 1rem 0', color: '#1a237e', fontSize: '0.875rem', textTransform: 'uppercase' }}>
              Product Distribution by Category
            </h3>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))',
              gap: '0.5rem',
            }}>
              {Object.entries(categories).map(([name, available]) => (
                <div key={name} style={{ background: '#1a237e', height: '8px', borderRadius: '4px 4px 0 0', position: 'relative' }}>
                  <span style={{
                    position: 'absolute',
                    right: '0',
                    marginRight: '0.5rem',
                    fontSize: '0.65rem',
                    color: '#666',
                  }}>
                    {available}
                  </span>
                  <span style={{
                    display: 'block',
                    width: `${(available / totalProducts * 100 || 0)}%`,
                    height: '8px',
                    background: '#1a237e',
                    borderRadius: '4px 4px 0 0',
                  }} />
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default InventoryOverview;