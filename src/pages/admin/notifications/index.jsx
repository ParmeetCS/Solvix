import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import AdminSidebar from '@/components/AdminSidebar';
import AdminHeader from '@/components/AdminHeader';
import { Table, Input, Select, Badge, Card, Notification, Button } from '@/components/ui';
import { useAuth } from '@/context/auth';

const Notifications = () => {
  const { user, status } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // State for notifications
  const [notifications, setNotifications] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [selectedType, setSelectedType] = useState('');
  const [readFilter, setReadFilter] = useState('all');

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status !== 'authenticated' || user.account_type !== 'admin') {
      navigate('/');
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/admin/notifications?page=${page}&limit=${limit}&type=${selectedType}&read=${readFilter}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('solvix_token')}` },
        });
        const data = await res.json();
        setNotifications(data.notifications || []);
        setTotalCount(data.totalCount || 0);
      } catch (error) {
        console.error('Failed to fetch notifications:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, status, page, limit, selectedType, readFilter]);

  if (status !== 'authenticated' || user.account_type !== 'admin') {
    return null;
  }

  if (loading) {
    return (
      <div className="page">
        <h1>Notifications</h1>
        <p>Loading notifications...</p>
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
            Notifications
          </h1>

          <p style={{ margin: '0 0 1rem 0', color: '#666', fontSize: '0.875rem' }}>
            In-app notification center for administrative actions.
          </p>
        </div>

        {loading ? (
          <p>Loading notifications...</p>
        ) : notifications.length === 0 ? (
          <div style={{
            padding: '2rem',
            textAlign: 'center',
            color: '#666',
          }}>
            <svg style={{ width: '4rem', height: '4rem', margin: '0 auto 1rem' }}>
              <use href="#info" width="48" height="48" />
            </svg>
            <p>No notifications</p>
            <p style={{ marginTop: '0.5rem', color: '#999' }}>
              No new notifications at this time.
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <Table>
              <Table.TableHead>
                <Table.Row>
                  <Table.Head>Time</Table.Head>
                  <Table.Head>Type</Table.Head>
                  <Table.Head>Title</Table.Head>
                  <Table.Head>Read Status</Table.Head>
                  <Table.Head>Action</Table.Head>
                </Table.Row>
              </Table.TableHead>
              <Table.TableBody>
                {notifications.map((notif) => (
                  <Table.Row key={notif.id}>
                    <Table.Cell>
                      {notif.created_at ? new Date(notif.created_at).toLocaleString() : 'N/A'}
                    </Table.Cell>
                    <Table.Cell>
                      {notif.type && notif.type === 'success' ? (
                        <Badge status="success">Success</Badge>
                      ) : notif.type === 'error' ? (
                        <Badge status="error">Error</Badge>
                      ) : notif.type === 'warning' ? (
                        <Badge status="warning">Warning</Badge>
                      ) : notif.type === 'info' ? (
                        <Badge status="default">Info</Badge>
                      ) : (
                        <Badge status="default">{notif.type}</Badge>
                      )}
                    </Table.Cell>
                    <Table.Cell>{notif.title || 'N/A'}</Table.Cell>
                    <Table.Cell>
                      {notif.read === true ? (
                        <Badge status="success">Read</Badge>
                      ) : (
                        <Badge status="pending">Unread</Badge>
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
                        onClick={() => {}}
                        title="Mark as read"
                        >
                        Read
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

        {/* Mark all as read button */}
        {notifications.some((n) => n.read === false) && (
          <Button
            style={{
              marginTop: '1rem',
              width: '100%',
              padding: '0.5rem',
              background: '#1a237e',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              fontSize: '0.875rem',
            }}
            onClick={() => {}}
          >
            Mark All as Read
          </Button>
        )}
      </main>
    </div>
  );
};

export default Notifications;