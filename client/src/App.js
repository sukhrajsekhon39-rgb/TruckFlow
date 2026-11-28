import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Layout from './components/Layout';
import ProtectedRoute, { GuestRoute } from './components/ProtectedRoute';
import { AuthProvider } from './auth/AuthContext';
import ScrollToTop from './components/ScrollToTop';
import Login from './pages/Login';
import Signup from './pages/Signup';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Landing from './pages/Landing';
import Dashboard from './pages/Dashboard';
import Loads from './pages/Loads';
import LoadDetail from './pages/LoadDetail';
import Drivers from './pages/Drivers';
import Trucks from './pages/Trucks';
import Trailers from './pages/Trailers';
import Brokers from './pages/Brokers';
import Analytics from './pages/Analytics';
import Settings from './pages/Settings';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
      <ScrollToTop />
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: 'var(--bg-card)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-light)',
            borderRadius: '14px',
            fontSize: '13.5px',
            padding: '12px 16px',
            boxShadow: 'var(--shadow-lg)',
          },
          success: { iconTheme: { primary: '#93C9A3', secondary: '#0A0A0B' } },
          error:   { iconTheme: { primary: '#E99595', secondary: '#0A0A0B' } },
        }}
      />
      <Routes>
        {/* Public */}
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<GuestRoute><Login /></GuestRoute>} />
        <Route path="/signup" element={<GuestRoute><Signup /></GuestRoute>} />
        <Route path="/forgot-password" element={<GuestRoute><ForgotPassword /></GuestRoute>} />
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* Signed-in app: every page only shows the signed-in company's data */}
        <Route element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }>
          <Route path="dashboard"  element={<Dashboard />} />
          <Route path="loads"      element={<Loads />} />
          <Route path="loads/:id"  element={<LoadDetail />} />
          <Route path="drivers"    element={<Drivers />} />
          <Route path="trucks"     element={<Trucks />} />
          <Route path="trailers"   element={<Trailers />} />
          <Route path="brokers"    element={<Brokers />} />
          <Route path="analytics"  element={<Analytics />} />
          <Route path="settings"   element={<Settings />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}