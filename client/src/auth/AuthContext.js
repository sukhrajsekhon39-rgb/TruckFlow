import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authApi, setSessionEndedHandler } from '../utils/api';

// Who is signed in, and to which company. The session itself is an httpOnly cookie
// the page can't read, so we ask the server on load.
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [state, setState] = useState({ status: 'loading', user: null, company: null });

  const refresh = useCallback(async () => {
    try {
      const { data } = await authApi.me();
      setState({ status: 'in', user: data.user, company: data.company });
    } catch {
      setState({ status: 'out', user: null, company: null });
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  // Any request that comes back "signed out" flips the app to the signed-out state
  useEffect(() => {
    setSessionEndedHandler(() => setState(s => (s.status === 'in' ? { status: 'out', user: null, company: null, expired: true } : s)));
  }, []);

  // Leftovers from the old single-login version
  useEffect(() => { try { localStorage.removeItem('tf-token'); localStorage.removeItem('tf-user'); } catch {} }, []);

  const value = useMemo(() => ({
    ...state,
    signedIn: ({ user, company }) => setState({ status: 'in', user, company }),
    setUser: user => setState(s => ({ ...s, user: { ...s.user, ...user } })),
    setCompany: company => setState(s => ({ ...s, company: { ...s.company, ...company } })),
    signOut: async () => {
      try { await authApi.logout(); } catch {}
      setState({ status: 'out', user: null, company: null });
    },
    signedOut: () => setState({ status: 'out', user: null, company: null }),
    refresh,
  }), [state, refresh]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
