import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import AdminSidebar from '@/components/AdminSidebar';
import AdminHeader from '@/components/AdminHeader';
import { Table, Button, Input, Select, Badge, Card, Notification } from '@/components/ui';
import { useAuth } from '@/context/auth';

const LeadOverview = () => {
  const { user, status } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // State for leads table
  const [leads, setLeads] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedSource, setSelectedSource] = useState('');

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status !== 'authenticated' || user.account_type !== 'admin') {
      navigate('/');
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/admin/leads?page=${page}&limit=${limit}&search=${search}&status=${selectedStatus}&source=${selectedSource}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('solvix_token')}` },
        });
        const data = await res.json();
        setLeads(data.leads || []);
        setTotalCount(data.totalCount || 0);
      } catch (error) {
        console.error('Failed to fetch leads:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, status, page, limit, search, selectedStatus, selectedSource]);

  if (status !== 'authenticated' || user.account_type !== 'admin') {
    return null;
  }

  if (loading) {
    return (
      <div className="page">
        <h1>Lead Overview</h1>
        <p>Loading lead data...</p>
      </div>
    );
  }

  // View lead details
  const viewLeadDetails = (leadId) => {
    navigate(`/admin/leads/${leadId}`);
  };

  return (
    <div className="page">
      <AdminSidebar />
      <main className="main-content" style={{ marginLeft: '240px', padding: '2rem', minHeight: '100vh' }}>
        <AdminHeader />

        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ margin: '0 0 1rem 0', color: '#1a237e', fontSize: '1.5rem' }}>
            Lead Overview
          </h1>

          <p style={{ margin: '0 0 1rem 0', color: '#666', fontSize: '0.875rem' }}>
            Organization-wide lead pipeline monitoring.
          </p>
        </div>

        {loading ? (
          <p>Loading leads...</p>
        ) : leads.length === 0 ? (
          <div style={{
            padding: '2rem',
            textAlign: 'center',
            color: '#666',
          }}>
            <svg style={{ width: '4rem', height: '4rem', margin: '0 auto 1rem' }}>
              <use href="#info" width="48" height="48" />
            </svg>
            <p>No leads found</p>
            <p style={{ marginTop: '0.5rem', color: '#999' }}>
              Leads will appear here as they are generated.
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <Table>
              <Table.TableHead>
                <Table.Row>
                  <Table.Head>Lead ID</Table.Head>
                  <Table.Head>Customer</Table.Head>
                  <Table.Head>Contact</Table.Head>
                  <Table.Head>Source</Table.Head>
                  <Table.Head>Status</Table.Head>
                  <Table.Head>System Type</Table.Head>
                  <Table.Head>Capacity</Table.Head>
                  <Table.Head>Assigned To</Table.Head>
                  <Table.Head>Created</Table.Head>
                  <Table.Head>Actions</Table.Head>
                </Table.Row>
              </Table.TableHead>
              <Table.TableBody>
                {leads.map((lead) => (
                  <Table.Row key={lead.id}>
                    <Table.Cell>{lead.lead_code || lead.id.substring(0, 8)}</Table.Cell>
                    <Table.Cell>{lead.customer_name || 'N/A'}</Table.Cell>
                    <Table.Cell>{lead.contact_details || 'N/A'}</Table.Cell>
                    <Table.Cell>{lead.source || 'N/A'}</Table.Cell>
                    <Table.Cell>
                      {lead.status === 'new' ? (
                        <Badge status="pending">New</Badge>
                      ) : lead.status === 'contacted' ? (
                        <Badge status="default">Contacted</Badge>
                      ) : lead.status === 'qualified' ? (
                        <Badge status="success">Qualified</Badge>
                      ) : lead.status === 'proposal_sent' ? (
                        <Badge status="info">Proposal Sent</Badge>
                      ) : lead.status === 'negotiation' ? (
                        <Badge status="warning">Negotiating</Badge>
                      ) : lead.status === 'converted' ? (
                        <Badge status="success">Converted</Badge>
                      ) : lead.status === 'lost' ? (
                        <Badge status="error">Lost</Badge>
                      ) : lead.status === 'disqualified' ? (
                        <Badge status="error">Disqualified</Badge>
                      ) : (
                        <Badge status="default">{lead.status}</Badge>
                      )}
                    </Table.Cell>
                    <Table.Cell>{lead.interested_system_type || 'N/A'}</Table.Cell>
                    <Table.Cell>{lead.interested_capacity || 'N/A'}</Table.Cell>
                    <Table.Cell>
                      {lead.assigned_to ? (
                        <span style={{ color: '#1a237e', fontWeight: 'bold' }}>
                          {lead.assigned_profiles?.full_name || 'Unassigned'}
                        </span>
                      ) : (
                        <span style={{ color: '#e53935' }}>Unassigned</span>
                      )}
                    </Table.Cell>
                    <Table.Cell>
                      {lead.created_at ? new Date(lead.created_at).toLocaleDateString() : 'N/A'}
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
                        onClick={() => viewLeadDetails(lead.id)}
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

        {/* Lead Actions Section */}
        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '1.5rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          marginTop: '2rem',
        }}>
          <h3 style={{ margin: '0 0 1rem 0', color: '#1a237e', fontSize: '0.875rem', textTransform: 'uppercase' }}>
            Lead Actions
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
              Assign Lead
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
              Lead Conversion
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
              Pipeline Stats
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default LeadOverview;