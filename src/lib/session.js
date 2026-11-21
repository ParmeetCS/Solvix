// Single place that reads and writes the browser session. Nothing else in the
// app touches the token keys directly.
const TOKEN_KEY = 'solvix_token';
const REFRESH_KEY = 'solvix_refresh_token';
const USER_KEY = 'solvix_user';
const LEGACY_ROLE_KEY = 'solvix_role';

function safe(fn, fallback = null) {
  try {
    return fn();
  } catch {
    return fallback;
  }
}

export const session = {
  getToken: () => safe(() => localStorage.getItem(TOKEN_KEY)),
  getRefreshToken: () => safe(() => localStorage.getItem(REFRESH_KEY)),
  getUser: () => safe(() => JSON.parse(localStorage.getItem(USER_KEY) || 'null')),
  save({ token, refresh_token, user }) {
    safe(() => {
      if (token) localStorage.setItem(TOKEN_KEY, token);
      if (refresh_token) localStorage.setItem(REFRESH_KEY, refresh_token);
      if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
    });
  },
  saveUser(user) {
    safe(() => localStorage.setItem(USER_KEY, JSON.stringify(user)));
  },
  clear() {
    safe(() => {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(REFRESH_KEY);
      localStorage.removeItem(USER_KEY);
      localStorage.removeItem(LEGACY_ROLE_KEY);
    });
  },
};

/** Sign-in page for each portal. */
export const LOGIN_PATHS = {
  admin: '/login/admin',
  sales: '/login/sales',
  technician: '/login/technician',
  staff: '/login/staff',
  customer: '/login/customer',
};

export function loginPathFor(portal) {
  return LOGIN_PATHS[portal] || '/login/customer';
}

/** Where a signed-in user belongs. */
export function homeFor(user) {
  if (!user) return '/';
  if (!user.approved) return '/pending-approval';
  return user.home || '/';
}
