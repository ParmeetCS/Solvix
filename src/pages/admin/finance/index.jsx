import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import AdminSidebar from '@/components/AdminSidebar';
import AdminHeader from '@/components/AdminHeader';
import { Card, Button, Badge, Notification } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { jsonResponse } from '@/services/api';

const FinanceOverview = () => {
  const { user, status } = useAuth();
  const navigate = useNavigate();

  const [financeData, setFinanceData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status !== 'authenticated' || user.account_type !== 'admin') {
      navigate('/');
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/admin/finance/overview', {
          headers: { Authorization: `Bearer ${localStorage.getItem('solvix_token')}` },
        });
        const data = await res.json();
        setFinanceData(data);
      } catch (error) {
        console.error('Failed to fetch finance data:', error);
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
        <h1>Finance Overview</h1>
        <p>Loading finance data...</p>
      </div>
    );
  }

  if (!financeData) {
    return (
      <div className="page">
        <Alert type="error">Failed to load finance data</Alert>
      </div>
    );
  }

  const {
    totalRevenue,
    totalExpenses,
    netRevenue,
    pendingPayments,
    totalOutstanding,
    invoiceStats,
    recentTransactions,
  } = financeData;

  return (
    <div className="page">
      <AdminSidebar />
      <main className="main-content" style={{ marginLeft: '240px', padding: '2rem', minHeight: '100vh' }}>
        <AdminHeader />

        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ margin: '0 0 1rem 0', color: '#1a237e', fontSize: '1.5rem' }}>
            Finance Overview
          </h1>

          <p style={{ margin: '0 0 1rem 0', color: '#666', fontSize: '0.875rem' }}>
            Organization financial summary and transaction tracking.
          </p>
        </div>

        {/* Revenue & Expenses Summary Card */}
        <Card style={{ background: '#e3f2fd', marginBottom: '1.5rem' }}>
          <div style={{ padding: '1.5rem' }}>
            <h3 style={{ margin: '0 0 1rem 0', color: '#1a237e', fontSize: '0.875rem', textTransform: 'uppercase' }},
              Financial Summary
            >
              <Table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <Table.Row>
                  <Table.Cell style={{ width: '50%' }>
                    <div style={{ fontSize: '0.875rem', color: '#1a237e' }}>Total Revenue</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1a237e' }}>
                      {totalRevenue > 0 ? `$${totalRevenue.toFixed(2)}` : '0.00'}
                    </div>
                  </Table.Cell>
                  <Table.Cell style={{ width: '50%' }}>
                    <div style={{ fontSize: '0.875rem', color: '#1a237e' }}>Total Expenses</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#e53935' }}>
                      {totalExpenses > 0 ? `$${totalExpenses.toFixed(2)}` : '0.00'}
                    </div>
                  </Table.Cell>
                </Table.Row>
                <Table.Row>
                  <Table.Cell style={{ fontWeight: 'bold' }}>Net Revenue</Table.Cell>
                  <Table.Cell>
                    <Badge
                      status={netRevenue >= 0 ? 'success' : 'error'}
                      style={{ marginLeft: 'auto' }}
                    >
                      {netRevenue >= 0 ? `+$${netRevenue.toFixed(2)}` : `-$${Math.abs(netRevenue).toFixed(2)}`}
                    </Badge>
                  </Table.Cell>
                </Table.Row>
              </Table>
            </Table>
          </div>
        </Card>

        {/* Outstanding Payments Card */}
        <Card style={{ background: '#fff3e0', marginBottom: '1.5rem' }}>
          <div style={{ padding: '1.5rem' }}>
            <h3 style={{ margin: '0 0 1rem 0', color: '#1a237e', fontSize: '0.875rem', textTransform: 'uppercase' }}>
              Outstanding Payments
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
              <div style={{ background: '#fff', padding: '1rem', borderRadius: '8px' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#f57f17' }}>
                  {pendingPayments}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#666' }}>Pending Payments</div>
              </div>
              <div style={{ background: '#fff', padding: '1rem', borderRadius: '8px' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#e53935' }}>
                  {totalOutstanding > 0 ? `$${totalOutstanding.toFixed(2)}` : '0.00'}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#666' }}>Total Outstanding</div>
              </div>
            </div>
          </div>
        </Card>

        {/* Invoice Statistics */}
        {invoiceStats && invoiceStats.total > 0 && (
          <Card style={{ marginBottom: '1.5rem' }}>
            <div style={{ padding: '1.5rem' }}>
              <h3 style={{ margin: '0 0 1rem 0', color: '#1a237e', fontSize: '0.875rem', textTransform: 'uppercase' }}>
                Invoice Statistics
              </h3>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))',
                gap: '1rem',
              }}>
                <div style={{ background: '#e8f5e9', padding: '0.75rem', borderRadius: '8px', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#2e7d32' }}>
                    {invoiceStats.paid || 0}
                  </div>
                  <div style={{ fontSize: '0.65rem', color: '#666' }}>Paid</div>
                </div>
                <div style={{ background: '#e3f2fd', padding: '0.75rem', borderRadius: '8px', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#1a237e' }}>
                    {invoiceStats.unpaid || 0}
                  </div>
                  <div style={{ fontSize: '0.65rem', color: '#666' }}>Unpaid</div>
                </div>
                <div style={{ background: '#fff3e0', padding: '0.75rem', borderRadius: '8px', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#f57f17' }}>
                    {invoiceStats.total - (invoiceStats.paid || 0) - (invoiceStats.unpaid || 0)}
                  </div>
                  <div style={{ fontSize: '0.65rem', color: '#666' }}>Sent</div>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Recent Transactions */}
        {recentTransactions && recentTransactions.length > 0 && (
          <Card style={{ marginTop: '1.5rem' }}>
            <div style={{ padding: '1.5rem' }}>
              <h3 style={{ margin: '0 0 1rem 0', color: '#1a237e', fontSize: '0.875rem', textTransform: 'uppercase' }}>
                Recent Transactions
              </h3>
              <ul style={{ listStyle: 'none', padding: 0, maxHeight: '200px', overflow: 'auto' }}>
                {recentTransactions.slice(0, 5).map((tx) => (
                  <li key={tx.id} style={{
                    padding: '0.5rem 0',
                    borderBottom: '1px solid #f0f0f0',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}>
                    <span style={{ fontSize: '0.875rem', color: '#333' }}>
                      {tx.transaction_type}: {tx.amount > 0 ? `$${tx.amount.toFixed(2)}` : `-$${Math.abs(tx.amount).toFixed(2)}`}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: '#666', textTransform: 'uppercase' }}>
                      {tx.transaction_type}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </Card>
        )}
      </main>
    </div>
  );
};

export default FinanceOverview;