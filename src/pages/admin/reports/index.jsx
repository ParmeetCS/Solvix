import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import AdminSidebar from '@/components/AdminSidebar';
import AdminHeader from '@/components/AdminHeader';
import { Card, Input, Select, Badge, Notification } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { jsonResponse } from '@/services/api';

const ReportsAnalytics = () => {
  const { user, status } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // State for reports filtering
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [reportType, setReportType] = useState('all');

  const [loading, setLoading] = useState(true);

  // State for various reports
  const [employeeDistribution, setEmployeeDistribution] = useState(null);
  const [customerGrowth, setCustomerGrowth] = useState(null);
  const [leadConversion, setLeadConversion] = useState(null);
  const [projectStatus, setProjectStatus] = useState(null);
  const [revenueExpense, setRevenueExpense] = useState(null);
  const [departmentActivity, setDepartmentActivity] = useState(null);

  useEffect(() => {
    if (status !== 'authenticated' || user.account_type !== 'admin') {
      navigate('/');
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch reports data
        const reportsRes = await fetch('/api/admin/reports', {
          headers: { Authorization: `Bearer ${localStorage.getItem('solvix_token')}` },
        });
        const reportsData = await reportsRes.json();

        // Parse different report types
        if (reportsData.activityLogs) {
          setEmployeeDistribution(reportsData.activityLogs.summary.actionCounts || null);
        }
        if (reportsData.availableDepartments) {
          // Use departments data for filtering
        }

        // Set individual reports from the data structure
        setEmployeeDistribution(reportsData.summary?.actionCounts || null);
        setCustomerGrowth(reportsData.customerGrowth || null);
        setLeadConversion(reportsData.leadConversion || null);
        setProjectStatus(reportsData.projectStatus || null);
        setRevenueExpense(reportsData.revenueExpense || null);
        setDepartmentActivity(reportsData.departmentActivity || null);
      } catch (error) {
        console.error('Failed to fetch reports:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, status, dateFrom, dateTo, selectedDepartment, reportType]);

  if (status !== 'authenticated' || user.account_type !== 'admin') {
    return null;
  }

  if (loading) {
    return (
      <div className="page">
        <h1>Reports & Analytics</h1>
        <p>Loading reports data...</p>
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
            Reports & Analytics
          </h1>

          <p style={{ margin: '0 0 1rem 0', color: '#666', fontSize: '0.875rem' }}>
            Central reports interface with date range and department filtering.
          </p>
        </div>

        {/* Reports Filters */}
        <Card style={{ background: 'white', marginBottom: '1.5rem' }}>
          <div style={{ padding: '1.5rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <Label>Date Range</Label>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  style={{ width: '100%' }}
                />
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <Label>Department</Label>
                <Select
                  value={selectedDepartment}
                  onValueChange={(val) => setSelectedDepartment(val)}
                  options={[
                    { value: '', label: 'All Departments' },
                    { value: 'admin', label: 'Administration' },
                    { value: 'sales', label: 'Sales & CRM' },
                    { value: 'site-survey', label: 'Site Survey' },
                    { value: 'warehouse', label: 'Warehouse & Inventory' },
                    { value: 'installation', label: 'Installation & Technical' },
                    { value: 'support', label: 'Customer Support & Warranty' },
                    { value: 'accounts', label: 'Accounts & Finance' },
                    { value: 'subsidy', label: 'Subsidy & Documentation' },
                  ]}
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <Label>Report Type</Label>
                <Select
                  value={reportType}
                  onValueChange={(val) => setReportType(val)}
                  options={[
                    { value: 'all', label: 'All Reports' },
                    { value: 'employee', label: 'Employee Distribution' },
                    { value: 'customer', label: 'Customer Growth' },
                    { value: 'lead', label: 'Lead Conversion' },
                    { value: 'project', label: 'Project Status' },
                    { value: 'financial', label: 'Revenue & Expense' },
                    { value: 'department', label: 'Department Activity' },
                  ]}
                  style={{ width: '100%' }}
                />
              </div>
            </div>

            <Button
              style={{
                background: '#1a237e',
                color: 'white',
                border: 'none',
                width: '100%',
                padding: '0.75rem',
                borderRadius: '8px',
                fontSize: '0.875rem',
                marginTop: '0.5rem',
              }}
              onClick={() => {
                // Trigger report refresh with current filters
                // In a real implementation, this would re-fetch with filter params
              }}
            >
              Generate Report
            </Button>
          </div>
        </Card>

        {/* Report Sections */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
          {/* Employee Distribution Report */}
          {employeeDistribution && (
            <Card style={{ marginBottom: '1.5rem' }}>
              <div style={{ padding: '1.5rem' }}>
                <h3 style={{ margin: '0 0 0.5rem 0', color: '#1a237e', fontSize: '0.875rem', textTransform: 'uppercase' }}>
                  Employee Distribution
                </h3>
                <p style={{ margin: '0', color: '#666', fontSize: '0.75rem' }}>
                  Total employee actions: {Object.values(employeeDistribution || {}).reduce((a, b) => a + b, 0) || 0}
                </p>
                <ul style={{ listStyle: 'none', padding: 0 }}>
                  {Object.entries(employeeDistribution || {}).slice(0, 5).map(([action, count]) => (
                    <li key={action} style={{ padding: '0.25rem 0', borderBottom: '1pxsolid #f0f0f0' }}>
                      <span style={{ color: '#1a237e', width: '120px', display: 'inline-block' }}>{action}</span>
                      <span>{count}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </Card>
          )}

          {/* Customer Growth Report */}
          {customerGrowth && (
            <Card style={{ marginBottom: '1.5rem' }}>
              <div style={{ padding: '1.5rem' }}>
                <h3 style={{ margin: '0 0 0.5rem 0', color: '#1a237e', fontSize: '0.875rem', textTransform: 'uppercase' }}>
                  Customer Growth
                </h3>
                <p style={{ margin: '0', color: '#666', fontSize: '0.75rem' }}>
                  Customer growth data will appear here
                </p>
              </div>
            </Card>
          )}

          {/* Lead Conversion Report */}
          {leadConversion && (
            <Card style={{ marginBottom: '1.5rem' }}>
              <div style={{ padding: '1.5rem' }}>
                <h3 style={{ margin: '0 0 0.5rem 0', color: '#1a237e', fontSize: '0.875rem', textTransform: 'uppercase' }}>
                  Lead Conversion
                </p>
                <p style={{ margin: '0', color: '#666', fontSize: '0.75rem' }}>
                  Lead conversion data will appear here
                </p>
              </div>
            </Card>
          )}

          {/* Project Status Report */}
          {projectStatus && (
            <Card style={{ marginBottom: '1.5rem' }}>
              <div style={{ padding: '1.5rem' }}>
                <h3 style={{ margin: '0 0 0.5rem 0', color: '#1a237e', fontSize: '0.875rem', textTransform: 'uppercase' }}>
                  Project Status
                </h3>
                <p style={{ margin: '0', color: '#666', fontSize: '0.75rem' }}>
                  Project status data will appear here
                </p>
              </div>
            </Card>
          )}

          {/* Revenue & Expense Report */}
          {revenueExpense && (
            <Card style={{ marginBottom: '1.5rem' }}>
              <div style={{ padding: '1.5rem' }}>
                <h3 style={{ margin: '0 0 0.5rem 0', color: '#1a237e', fontSize: '0.875rem', textTransform: 'uppercase' }}>
                  Revenue & Expense
                </h3>
                <p style={{ margin: '0', color: '#666', fontSize: '0.75rem' }}>
                  Revenue/expense summary data will appear here
                </p>
              </div>
            </Card>
          )}

          {/* Department Activity Report */}
          {departmentActivity && (
            <Card style={{ marginBottom: '1.5rem' }}>
              <div style={{ padding: '1.5rem' }}>
                <h3 style={{ margin: '0 0 0.5rem 0', color: '#1a237e', fontSize: '0.875rem', textTransform: 'uppercase' }}>
                  Department Activity
                </h3>
                <p style={{ margin: '0', color: '#666', fontSize: '0.75rem' }}>
                  Department activity data will appear here
                </p>
              </div>
            </Card>
          )}
        </div>

        {/* Export Options */}
        <div style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginTop: '1.5rem' }}>
          <h3 style={{ margin: '0 0 0.5rem 0', color: '#1a237e', fontSize: '0.875rem', textTransform: 'uppercase' }}>
            Export Reports
          </h3>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: '1rem',
            marginTop: '0.5rem',
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
              Export to CSV
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
              Export to PDF
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
              Print Summary
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ReportsAnalytics;