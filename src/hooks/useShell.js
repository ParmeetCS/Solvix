import { useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/auth';
import { getNavItems } from '@/config/navigation';

/**
 * Shared behaviour for every dashboard layout: the sidebar items for the
 * signed-in user's portal, and a logout that sends them to their own sign-in
 * page while replacing the history entry (Back cannot return to a dashboard).
 */
export function useShell() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const navItems = useMemo(() => getNavItems(user), [user]);

  const handleLogout = useCallback(async () => {
    const target = await logout();
    navigate(target, { replace: true });
  }, [logout, navigate]);

  return { user, navItems, handleLogout };
}
