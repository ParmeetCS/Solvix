import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { apiClient } from '@/services/api/client';
import { session, loginPathFor } from '@/lib/session';

const AuthContext = createContext(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}

/**
 * Holds the signed-in user. The user stored in localStorage is only a hint for
 * a fast first paint; on every load the token is re-validated against
 * /api/auth/me, and an invalid session is discarded before any protected page
 * is shown. Authorisation itself is enforced again by the backend per request.
 */
export function AuthProvider({ children }) {
  const initialUser = session.getToken() ? session.getUser() : null;
  const [user, setUser] = useState(initialUser);
  const [status, setStatus] = useState(session.getToken() ? 'loading' : 'unauthenticated');

  const clear = useCallback(() => {
    session.clear();
    setUser(null);
    setStatus('unauthenticated');
  }, []);

  // Validate any stored session once on startup.
  useEffect(() => {
    let cancelled = false;
    async function validate() {
      if (!session.getToken()) {
        setStatus('unauthenticated');
        return;
      }
      try {
        const res = await apiClient.get('/api/auth/me');
        const fresh = res.data?.data?.user;
        if (cancelled) return;
        if (!fresh) throw new Error('No user');
        session.saveUser(fresh);
        setUser(fresh);
        setStatus('authenticated');
      } catch (err) {
        if (cancelled) return;
        // Only a definite auth rejection ends the session; if the backend is
        // simply unreachable keep the cached user so the UI can show an error.
        if (err.status === 401 || err.status === 403 || err.status === 404) {
          clear();
        } else if (session.getUser()) {
          setUser(session.getUser());
          setStatus('authenticated');
        } else {
          clear();
        }
      }
    }
    validate();
    return () => {
      cancelled = true;
    };
  }, [clear]);

  // The API client raises this when a request is rejected and cannot be refreshed.
  useEffect(() => {
    const onExpired = () => clear();
    window.addEventListener('solvix:session-expired', onExpired);
    return () => window.removeEventListener('solvix:session-expired', onExpired);
  }, [clear]);

  // Keep several tabs in sync: signing out in one signs out all.
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === 'solvix_token' && !e.newValue) clear();
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [clear]);

  const login = useCallback(async (portal, email, password) => {
    const res = await apiClient.post('/api/auth/login', { portal, email, password });
    const data = res.data?.data;
    if (!data?.token || !data?.user) throw new Error('Sign-in failed. Unexpected server response.');
    session.save(data);
    setUser(data.user);
    setStatus('authenticated');
    return data.user;
  }, []);

  const logout = useCallback(async () => {
    const portal = user?.portal;
    try {
      await apiClient.post('/api/auth/logout');
    } catch {
      // Logging out never depends on the network.
    }
    clear();
    return loginPathFor(portal);
  }, [user, clear]);

  const value = useMemo(
    () => ({
      user,
      status,
      loading: status === 'loading',
      isAuthenticated: status === 'authenticated',
      login,
      logout,
      hasModule: (m) => Boolean(user?.modules?.includes(m)),
    }),
    [user, status, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export default AuthContext;
