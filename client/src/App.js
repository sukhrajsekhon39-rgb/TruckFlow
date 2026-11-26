import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import ScrollToTop from './components/ScrollToTop';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Loads from './pages/Loads';
import LoadDetail from './pages/LoadDetail';
import Drivers from './pages/Drivers';
import Trucks from './pages/Trucks';
import Trailers from './pages/Trailers';
import Brokers from './pages/Brokers';
import Analytics from './pages/Analytics';
import Settings from './pages/Settings';
import GmailInbox from './pages/GmailInbox';

export default function App() {
  return (
    <BrowserRouter>
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
        <Route path="/login" element={<Login />} />

        {/* Protected */}
        <Route path="/" element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard"  element={<Dashboard />} />
          <Route path="loads"      element={<Loads />} />
          <Route path="loads/:id"  element={<LoadDetail />} />
          <Route path="drivers"    element={<Drivers />} />
          <Route path="trucks"     element={<Trucks />} />
          <Route path="trailers"   element={<Trailers />} />
          <Route path="brokers"    element={<Brokers />} />
          <Route path="analytics"  element={<Analytics />} />
          <Route path="settings"   element={<Settings />} />
          <Route path="gmail"      element={<GmailInbox />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}