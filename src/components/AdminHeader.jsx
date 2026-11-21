import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Sun, Menu, LogOut, User, Shield, Mail, MailOpen, Layout, Users, Folder, Coins, BarChart, Bell, Settings } from 'lucide-react';

const AdminHeader = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Fetch notifications on mount
  useEffect(() => {
    // In a real implementation, this would fetch from the API
    const mockNotifications = [
      { id: 1, title: 'New employee access request', type: 'info', read: false },
      { id: 2, title: 'Pending approval for John Doe', type: 'warning', read: false },
    ];
    setNotifications(mockNotifications);
    setUnreadCount(mockNotifications.filter(n => !n.read).length);
  }, []);

  const toggleMobile = () => setMobileOpen(!mobileOpen);

  return (
    <header
      style={{
        padding: '1rem 1.5rem',
        background: 'var(--solvix-navy, #1a237e)',
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: '64px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        position: 'fixed',
        top: 0,
        left: '240px',
        right: 0,
        zIndex: 1000,
        transition: 'left 0.3s ease',
      }}
    >
      <div className="header-left" style={{
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
      }}>
        <a href="/admin/dashboard" style={{ textDecoration: 'none', color: 'white' }}>
          <svg width="32" height="32" viewBox="0 0 40 40" style={{ marginRight: '0.5rem' }}>
            <use href="#sun" width="32" height="32" />
          </svg>
          <span style={{ fontWeight: 'bold', color: 'var(--solvix-accent, #f57f17)' }}>SOLVIX</span>
        </a>
        <button onClick={toggleMobile} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}>
          {mobileOpen ? <X width="24" height="24" /> : <Menu width="24" height="24" />}
        </button>
      </div>

      <div className="header-right" style={{
        display: 'flex',
        alignItems: 'center',
        gap: '1.5rem',
      }}>
        <div style={{ position: 'relative' }}>
          <button
            style={{
              background: 'none',
              border: 'none',
              color: 'white',
              padding: '0.5rem',
              cursor: 'pointer',
              fontSize: '1.2rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <Bell width="20" height="20" />
            <span
              style={{
                position: 'absolute',
                top: '2px',
                right: '2px',
                width: '8px',
                height: '8px',
                background: 'var(--solvix-accent, #f57f17)',
                borderRadius: '50%',
              }}
            >
              {unreadCount > 0 ? unreadCount : ''}
            </span>
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <User width="24" height="24" />
          <span style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.8)' }}>Admin</span>
          <svg
            width="20"
            height="20"
            style={{ marginLeft: '0.5rem', color: 'rgba(255,255,255,0.5)' }}
            aria-hidden="true"
          >
            <use href="#log-out" width="20" height="20" />
          </svg>
        </div>
      </div>
    </header>
  );
};

export default AdminHeader;