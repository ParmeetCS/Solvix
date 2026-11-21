import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/auth';
import { homeFor, loginPathFor } from '@/lib/session';

// Where a visitor who is not signed in is sent for each module.
const MODULE_LOGIN = {
  sales: '/login/sales',
  technician: '/login/technician',
  installation: '/login/technician',
  survey: '/login/employee',
  warehouse: '/login/staff',
  support: '/login/staff',
  finance: '/login/staff',
  subsidy: '/login/staff',
};

function FullPageMessage({ children }) {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        background: 'var(--app-bg)',
        color: 'var(--text-muted)',
        fontFamily: 'inherit',
      }}
    >
      {children}
    </div>
  );
}

/**
 * RequireAuth - the only way into a protected area.
 *
 *   portals: portals allowed in ('admin' | 'sales' | 'technician' | 'staff' | 'customer'). Admins pass
 *            only where 'admin' is listed.
 *   module:  the user must hold this module (e.g. 'warehouse'); admins hold all of them.
 *
 * Not signed in      -> that area's sign-in page (history entry is replaced, so Back
 *                       never returns to a protected page after sign-out)
 * Signed in, no rights -> /access-denied
 * Employee awaiting approval -> /pending-approval
 */
export function RequireAuth({ portals, module, loginPortal, children }) {
  const { status, user } = useAuth();
  const location = useLocation();

  if (status === 'loading') return <FullPageMessage>Checking your session…</FullPageMessage>;

  if (status !== 'authenticated' || !user) {
    const to = loginPortal
      ? loginPathFor(loginPortal)
      : portals ? loginPathFor(portals[0])
      : module ? (MODULE_LOGIN[module] || '/login/employee')
      : '/login/customer';
    return <Navigate to={to} replace state={{ from: location.pathname }} />;
  }

  if (!user.approved) return <Navigate to="/pending-approval" replace />;

  if (portals && !portals.includes(user.portal)) {
    // Admins may open any module-gated area below.
    if (!(module && user.portal === 'admin')) {
      return <Navigate to="/access-denied" replace />;
    }
  }

  if (module && !user.modules?.includes(module)) {
    return <Navigate to="/access-denied" replace />;
  }

  return children;
}

/**
 * PublicOnly - sign-in, sign-up and (optionally) the landing page are for
 * visitors who are not signed in. A signed-in user is sent to their own
 * dashboard, which is what happens when they press Back from a dashboard.
 */
export function PublicOnly({ children }) {
  const { status, user } = useAuth();
  const location = useLocation();

  if (status === 'loading') return <FullPageMessage>Loading…</FullPageMessage>;

  const wantsPublicSite = new URLSearchParams(location.search).get('view') === 'public';
  if (status === 'authenticated' && user && !wantsPublicSite) {
    return <Navigate to={homeFor(user)} replace />;
  }
  return children;
}

/** Pending-approval page: only for signed-in employees without an approved department. */
export function PendingOnly({ children }) {
  const { status, user } = useAuth();
  if (status === 'loading') return <FullPageMessage>Loading…</FullPageMessage>;
  if (status !== 'authenticated' || !user) return <Navigate to="/login/employee" replace />;
  if (user.approved) return <Navigate to={homeFor(user)} replace />;
  return children;
}
