import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import AdminSidebar from '@/components/AdminSidebar';
import AdminHeader from '@/components/AdminHeader';
import { Table, Button, Input, Select, Badge, Card, Notification } from '@/components/ui';
import { useAuth } from '@/context/auth';

const ProjectManagement = () => {
  const { user, status } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // State for projects table
  const [projects, setProjects] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status !== 'authenticated' || user.account_type !== 'admin') {
      navigate('/');
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/admin/projects?page=${page}&limit=${limit}&search=${search}&status=${selectedStatus}&department=${selectedDepartment}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('solvix_token')}` },
        });
        const data = await res.json();
        setProjects(data.projects || []);
        setTotalCount(data.totalCount || 0);
      } catch (error) {
        console.error('Failed to fetch projects:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, status, page, limit, search, selectedStatus, selectedDepartment]);

  if (status !== 'authenticated' || user.account_type !== 'admin') {
    return null;
  }

  if (loading) {
    return (
      <div className="page">
        <h1>Project Management</h1>
        <p>Loading project data...</p>
      </div>
    );
  }

  // View project details
  const viewProjectDetails = (projectId) => {
    navigate(`/admin/projects/${projectId}`);
  };

  return (
    <div className="page">
      <AdminSidebar />
      <main className="main-content" style={{ marginLeft: '240px', padding: '2rem', minHeight: '100vh' }}>
        <AdminHeader />

        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ margin: '0 0 1rem 0', color: '#1a237e', fontSize: '1.5rem' }}>
            Project Management
          </h1>

          <p style={{ margin: '0 0 1rem 0', color: '#666', fontSize: '0.875rem' }}>
            Organization-wide project monitoring and progress tracking.
          </p>
        </div>

        {loading ? (
          <p>Loading projects...</p>
        ) : projects.length === 0 ? (
          <div style={{
            padding: '2rem',
            textAlign: 'center',
            color: '#666',
          }}>
            <svg style={{ width: '4rem', height: '4rem', margin: '0 auto 1rem' }}>
              <use href="#construction" width="48" height="48" />
            </svg>
            <p>No projects found</p>
            <p style={{ marginTop: '0.5rem', color: '#999' }}>
              Projects will appear here as they are created.
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <Table>
              <Table.TableHead>
                <Table.Row>
                  <Table.Head>Project ID</Table.Head>
                  <Table.Head>Customer</Table.Head>
                  <Table.Head>Project Type</Table.Head>
                  <Table.Head>System Capacity</Table.Head>
                  <Table.Head>Status</Table.Head>
                  <Table.Head>Assigned Technician</Table.Head>
                  <Table.Head>Start Date</Table.Head>
                  <Table.Head>Progress</Table.Head>
                  <Table.Head>Actions</Table.Head>
                </Table.Row>
              </Table.TableHead>
              <Table.TableBody>
                {projects.map((project) => (
                  <Table.Row key={project.id}>
                    <Table.Cell>{project.installation_code || project.id.substring(0, 8)}</Table.Cell>
                    <Table.Cell>{project.customer_name || 'N/A'}</Table.Cell>
                    <Table.Cell>{project.system_type || 'N/A'}</Table.Cell>
                    <Table.Cell>
                      {project.system_capacity_kw !== undefined ? `${project.system_capacity_kw} kW` : 'N/A'}
                    </Table.Cell>
                    <Table.Cell>
                      {project.status === 'scheduled' ? (
                        <Badge status="default">Scheduled</Badge>
                      ) : project.status === 'in_progress' ? (
                        <Badge status="success">In Progress</Badge>
                      ) : project.status === 'completed' ? (
                        <Badge status="success">Completed</Badge>
                      ) : project.status === 'on_hold' ? (
                        <Badge status="warning">On Hold</Badge>
                      ) : (
                        <Badge status="default">{project.status}</Badge>
                      )}
                    </Table.Cell>
                    <Table.Cell>
                      {project.assigned_technician || 'Unassigned'}
                    </Table.Cell>
                    <Table.Cell>
                      {project.scheduled_start ? new Date(project.scheduled_start).toLocaleDateString() : 'N/A'}
                    </Table.Cell>
                    <Table.Cell>
                      <div style={{ width: '100%', height: '8px', background: '#e0e0e0', borderRadius: '4px', overflow: 'hidden' }}>
                        <div
                          style={{
                            width: project.actual_completion_date ? '100%' : '70%',
                            height: '8px',
                            background: '#1a237e',
                            borderRadius: '4px',
                            transition: 'width 0.3s',
                          }}
                        />
                      </div>
                      {project.actual_completion_date ? `70% complete` : `${project.status === 'in_progress' ? 'In progress' : ''}`}
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
                        onClick={() => viewProjectDetails(project.id)}
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

        {/* Project Actions Section */}
        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '1.5rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          marginTop: '2rem',
        }}>
          <h3 style={{ margin: '0 0 1rem 0', color: '#1a237e', fontSize: '0.875rem', textTransform: 'uppercase' }}>
            Project Actions
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
              New Project
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
              Project Progress
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
              Department Filter
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ProjectManagement;