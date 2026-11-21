import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

/**
 * ProtectedRoute - allows access to authenticated users only.
 * Unauthenticated users are redirected to the appropriate login page.
 */
export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { status, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Check authentication status
    if (status === 'loading') {
      // During loading, allow access (or show a spinner)
      return;
    }

    if (status === 'unauthenticated' || status === 'error') {
      // Redirect to customer login for unauthenticated users
      // In a full implementation, we'd check account type
      navigate('/login/customer');
    }
  }, [status, user, navigate]);

  if (status === 'loading') {
    // During loading, render children (could show a spinner)
    return children;
  }

  // Authenticated users can access
  return children;
}

/**
 * PublicRoute - allows access to unauthenticated users only.
 * Authenticated users are redirected to the customer portal.
 */
export function PublicRoute({ children }: { children: React.ReactNode }) {
  const { status } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (status === 'authenticated') {
      navigate('/');
    }
  }, [status, navigate]);

  if (status === 'loading') {
    return children;
  }

  // Unauthenticated users can access
  return children;
}

/**
 * RoleGuard - restricts access based on account type.
 * 
 * @param accountType - The required account type ('customer', 'employee', 'admin')
 * @param redirect - Where to redirect if access is denied
 */
export function RoleGuard({ 
  children, 
  accountType: requiredAccountType = 'customer',
  redirect = '/login/customer'
 }: { 
  children: React.ReactNode; 
  accountType: 'customer' | 'employee' | 'admin';
  redirect: string;
}) {
  const { status, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (status === 'loading') return;
    
    if (status === 'unauthenticated' || status === 'error') {
      navigate(redirect);
      return;
    }

    if (user?.account_type !== requiredAccountType) {
      // Redirect to appropriate page based on account type
      if (requiredAccountType === 'employee' && user?.account_type === 'customer') {
        navigate('/login/employee');
      } else if (requiredAccountType === 'customer' && user?.account_type === 'employee') {
        navigate('/pending-approval');
      } else {
        navigate(redirect);
      }
    }
  }, [status, user, accountType, navigate, redirect]);

  if (status === 'loading') {
    return children;
  }

  // Check if user has the required account type
  if (user?.account_type !== requiredAccountType) {
    navigate(redirect);
    return null;
  }

  return children;
}

/**
 * DepartmentGuard - restricts access based on assigned department.
 * 
 * @param requiredDepartment - The required department code/name
 * @param redirect - Where to redirect if access is denied
 */
export function DepartmentGuard({ 
  children, 
  requiredDepartment,
  redirect = '/access-denied'
 }: { 
  children: React.ReactNode; 
  requiredDepartment: string;
  redirect: string;
}) {
  const { status, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (status === 'loading') return;
    
    if (status === 'unauthenticated' || status === 'error') {
      navigate('/login/customer');
      return;
    }

    // Check if user has the required department assigned
    if (user?.department !== requiredDepartment && user?.department !== null) {
      navigate(redirect);
      return;
    }

    // Users without a department assigned but with correct account type
    // can pass through (they may be in the approval flow)
    if (!user?.department && requiredDepartment) {
        // Allow through for pending employees
    }
  }, [status, user, requiredDepartment, navigate]);

  if (status === 'loading') {
    return children;
  }

  // Check department access
  if (user?.department !== requiredDepartment && user?.is_active) {
    navigate(redirect);
    return null;
  }

  return children;
}