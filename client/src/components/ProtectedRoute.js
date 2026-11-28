import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { LogoMark } from './Brand';

export function AuthSplash() {
  return (
    <div style={{ minHeight: '100vh', background: '#0A0A0B', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <LogoMark size={44} className="logo-mark auth-splash-mark" />
    </div>
  );
}

// App pages: signed-in users only
export default function ProtectedRoute({ children }) {
  const { status, expired } = useAuth();
  const location = useLocation();
  if (status === 'loading') return <AuthSplash />;
  if (status !== 'in') {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search, expired }} />;
  }
  return children;
}

// Sign-in / sign-up pages: send signed-in users straight to the app
export function GuestRoute({ children }) {
  const { status } = useAuth();
  if (status === 'loading') return <AuthSplash />;
  if (status === 'in') return <Navigate to="/dashboard" replace />;
  return children;
}
