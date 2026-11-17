import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap, Eye, EyeOff } from 'lucide-react';
import { authApi } from '../utils/api';

export default function Login() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await authApi.login({ username, password });
      localStorage.setItem('tf-token', res.data.token);
      localStorage.setItem('tf-user', res.data.username);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-primary)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
    }}>
      <div style={{ width: '100%', maxWidth: 400 }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{
            width: 52, height: 52, borderRadius: 14,
            background: '#f97316',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 14px',
            boxShadow: '0 4px 20px rgba(249,115,22,0.4)',
          }}>
            <Zap size={26} color="white" fill="white" />
          </div>
          <h1 style={{
            fontSize: 26, fontWeight: 700,
            color: 'var(--text-primary)',
            letterSpacing: '-0.02em',
            marginBottom: 4,
          }}>
            TruckFlow
          </h1>
          <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>
            Sign in to your fleet dashboard
          </p>
        </div>

        {/* Card */}
        <div className="card" style={{ padding: 28 }}>
          {error && (
            <div style={{
              background: 'var(--red-dim)',
              border: '1px solid var(--red-border)',
              color: 'var(--red)',
              borderRadius: 8,
              padding: '10px 14px',
              fontSize: 14,
              marginBottom: 20,
              fontWeight: 500,
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="form-group">
              <label className="form-label">Username</label>
              <input
                className="form-control"
                type="text"
                placeholder="Enter username"
                value={username}
                onChange={e => setUsername(e.target.value)}
                autoFocus
                autoComplete="username"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  className="form-control"
                  type={showPw ? 'text' : 'password'}
                  placeholder="Enter password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoComplete="current-password"
                  style={{ paddingRight: 42 }}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPw(s => !s)}
                  style={{
                    position: 'absolute', right: 12, top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none', border: 'none',
                    cursor: 'pointer', color: 'var(--text-muted)',
                    padding: 2, display: 'flex',
                  }}
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{ width: '100%', justifyContent: 'center', marginTop: 4, padding: '11px 16px', fontSize: 15 }}
            >
              {loading ? <div className="spinner" /> : null}
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}