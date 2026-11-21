import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import AdminSidebar from '@/components/AdminSidebar';
import AdminHeader from '@/components/AdminHeader';
import { Card, Input, Select, Badge, Button, Alert } from '@/components/ui';
import { useAuth } from '@/context/auth';

const AdminSettings = () => {
  const { user, status } = useAuth();
  const navigate = useNavigate();

  // State for settings sections
  const [departments, setDepartments] = useState([]);
  const [roles, setRoles] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status !== 'authenticated' || user.account_type !== 'admin') {
      navigate('/');
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch settings data
        const settingsRes = await fetch('/api/admin/settings', {
          headers: { Authorization: `Bearer ${localStorage.getItem('solvix_token')}` },
        });
        const settingsData = await settingsRes.json();

        setDepartments(settingsData.departments || []);
        setRoles(settingsData.roles || []);
      } catch (error) {
        console.error('Failed to fetch settings:', error);
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
        <h1>Admin Settings</h1>
        <p>Loading settings data...</p>
      </div>
    );
  }

  return (
    <div className="page">
      <AdminSidebar />
      <main className="main-content" style={{ marginLeft: '240px', padding: '2rem', minHeight: '100vh' }}>
        <AdminHeader />

        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ margin: '0 0 1rem 0', color: '#1a237e', fontSize: '1.5rem' }}>
            Admin Settings
          </h1>

          <p style={{ margin: '0 0 1rem 0', color: '#666', fontSize: '0.875rem' }}>
            Organization configuration and security settings.
          </p>
        </div>

        {/* Departments Section */}
        <Card style={{ marginBottom: '1.5rem' }}>
          <div style={{ padding: '1.5rem' }}>
            <h3 style={{ margin: '0 0 0.5rem 0', color: '#1a237e', fontSize: '0.875rem', textTransform: 'uppercase' }}>
              Department Management
            </h3>
            <p style={{ margin: '0 0 0.5rem 0', color: '#666', fontSize: '0.75rem' }}>
              Configure organizational departments and assign employees.
            </p>
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
              onClick={() => navigate('/admin/departments')}
            >
              Manage Departments
            </Button>
          </div>
        </Card>

        {/* Roles Section */}
        <Card style={{ marginBottom: '1.5rem' }}>
          <div style={{ padding: '1.5rem' }}>
            <h3 style={{ margin: '0 0 0.5rem 0', color: '#1a237e', fontSize: '0.875rem', textTransform: 'uppercase' }}>
              Role Management
            </h3>
            <p style={{ margin: '0 0 0.5rem 0', color: '#666', fontSize: '0.75rem' }}>
              Configure user roles and permissions.
            </p>
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
              onClick={() => navigate('/admin/settings')}
            >
              View Roles
            </Button>
          </div>
        </Card>

        {/* Notification Preferences Section */}
        <Card style={{ marginBottom: '1.5rem' }}>
          <div style={{ padding: '1.5rem' }}>
            <h3 style={{ margin: '0 0 0.5rem 0', color: '#1a237e', fontSize: '0.875rem', textTransform: 'uppercase' }}>
              Notification Preferences
            </h3>
            <p style={{ margin: '0 0 0.5rem 0', color: '#666', fontSize: '0.75rem' }}>
              Configure notification settings for the organization.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', marginTop: '0.5rem' }}>
              <div style={{ background: '#e3f2fd', padding: '0.75rem', borderRadius: '8px' }}>
                <span style={{ fontSize: '0.875rem', color: '#1a237e' }}>New employee requests</span>
                <Badge status="default">Enabled</Badge>
              </div>
              <div style={{ background: '#e3f2fd', padding: '0.75rem', borderRadius: '8px' }}>
                <span style={{ fontSize: '0.875rem', color: '#1a237e' }}>Low stock alerts</span>
                <Badge status="default">Enabled</Badge>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', marginTop: '0.5rem' }}>
              <div style={{ background: '#e3f2fd', padding: '0.75rem', borderRadius: '8px' }}>
                <span style={{ fontSize: '0.875rem', color: '#1a237e' }}>Project updates</span>
                <Badge status="default">Enabled</Badge>
              </div>
              <div style={{ background: '#e3f2fd', padding: '0.75rem', borderRadius: '8px' }}>
                <span style={{ fontSize: '0.875rem', color: '#1a237e' }}>New leads</span>
                <Badge status="default">Enabled</Badge>
              </div>
            </div>
          </div>
        </Card>

        {/* Security Section */}
        <Card style={{ marginBottom: '1.5rem' }}>
          <div style={{ padding: '1.5rem' }}>
            <h3 style={{ margin: '0 0 0.5rem 0', color: '#1a237e', fontSize: '0.875rem', textTransform: 'uppercase' }}>
              Security Settings
            </h3>
            <p style={{ margin: '0 0 0.5rem 0', color: '#666', fontSize: '0.75rem' }}>
              Account security and authentication configuration.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', marginTop: '0.5rem' }}>
              <div style={{ background: '#ffebee', padding: '0.75rem', borderRadius: '8px' }}>
                <span style={{ fontSize: '0.875rem', color: '#e53935' }}>Session timeout</span>
                <span style={{ fontSize: '0.75rem', color: '#666' }}>30 minutes</span>
              </div>
              <div style={{ background: '#ffebee', padding: '0.75rem', borderRadius: '8px' }}>
                <span style={{ fontSize: '0.875rem', color: '#e53935' }}>Failed login attempts</span>
                <span style={{ fontSize: '0.75rem', color: '#666' }}>5 attempts</span>
              </div>
            </div>
            <Button
              style={{
                marginTop: '0.5rem',
                width: '100%',
                padding: '0.5rem',
                background: '#e53935',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '0.875rem',
              }}
            >
              Update Security Settings
            </Button>
          </div>
        </Card>

        {/* Account Settings Section */}
        <Card>
          <div style={{ padding: '1.5rem' }}>
            <h3 style={{ margin: '0 0 0.5rem 0', color: '#1a237e', fontSize: '0.875rem', textTransform: 'uppercase' }}>
              Account Settings
            </h3>
            <p style={{ margin: '0 0 0.5rem 0', color: '#666', fontSize: '0.75rem' }}>
              Personal account configuration.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', marginTop: '0.5rem' }}>
              <div style={{ background: '#e3f2fd', padding: '0.75rem', borderRadius: '8px' }}>
                <span style={{ fontSize: '0.875rem', color: '#1a237e' }}>Default dashboard view</span>
                <span style={{ fontSize: '0.75rem', color: '#666' }}>Analytics</span>
              </div>
              <div style={{ background: '#e3f2fd', padding: '0.75rem', borderRadius: '8px' }}>
                <span style={{ fontSize: '0.875rem', color: '#1a237e' }}>Time zone</span>
                <span style={{ fontSize: '0.75rem', color: '#666' }}>UTC</span>
              </div>
            </div>
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
            >
              Save Account Settings
            </Button>
          </div>
        </Card>
      </main>
    </div>
  );
};

export default AdminSettings;