import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { authApi } from '../utils/api';

// The sign-in page is always obsidian, whatever theme the app is set to.
const C = {
  bg:       '#0A0A0B',
  line:     'rgba(255,255,255,0.07)',
  field:    'rgba(255,255,255,0.2)',
  text:     '#F7F5F1',
  dim:      '#D2CFC8',
  faint:    '#ADAAA3',
  gold:     '#D8BC86',
  goldLine: 'rgba(216,188,134,0.5)',
  red:      '#E99595',
};
const SERIF = "'Instrument Serif', Georgia, serif";

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
    <div className="login-root" style={{
      minHeight: '100vh',
      background: C.bg,
      color: C.text,
      display: 'flex',
      flexWrap: 'wrap',
    }}>
      <style>{`
        .login-field {
          display: flex; align-items: center;
          height: 52px; padding: 0 18px;
          border: 1px solid ${C.field};
          border-radius: 14px;
          background: rgba(255,255,255,0.02);
          transition: all 0.2s ease;
        }
        .login-field:hover { border-color: rgba(255,255,255,0.22); }
        .login-field:focus-within {
          border-color: ${C.goldLine};
          box-shadow: 0 0 0 4px rgba(205,176,122,0.10);
        }
        .login-field input {
          flex: 1; min-width: 0;
          border: 0; outline: 0; background: transparent;
          color: ${C.text}; font: inherit; font-size: 15.5px;
        }
        .login-field input::placeholder { color: #9A978F; }
        .login-label {
          font-size: 12.5px; font-weight: 600;
          letter-spacing: 0.08em; text-transform: uppercase;
          color: ${C.faint};
        }
        .login-eye {
          border: 0; background: transparent; color: ${C.faint};
          cursor: pointer; width: 44px; height: 44px; margin-right: -12px;
          display: flex; align-items: center; justify-content: center;
          border-radius: 999px;
        }
        .login-eye:hover { color: ${C.text}; }
        .login-submit {
          height: 54px; border: 0; border-radius: 999px;
          background: ${C.gold}; color: ${C.bg};
          font: inherit; font-size: 15.5px; font-weight: 600; letter-spacing: 0;
          cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 10px;
          transition: all 0.2s ease;
        }
        .login-submit:hover:not(:disabled) {
          filter: brightness(1.08);
          box-shadow: 0 12px 32px -10px rgba(205,176,122,0.55);
        }
        .login-submit:disabled { opacity: 0.6; cursor: not-allowed; }
        @media (max-width: 900px) {
          .login-brand { flex-basis: 100% !important; min-height: auto !important; padding: 32px 24px !important; border-right: 0 !important; border-bottom: 1px solid ${C.line}; }
          .login-brand h1 { font-size: 46px !important; }
          .login-route { display: none !important; }
        }
      `}</style>

      {/* ── Brand panel ── */}
      <section className="login-brand" style={{
        flex: '1 1 560px',
        minHeight: '100vh',
        padding: '56px 64px',
        display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 48,
        borderRight: `1px solid ${C.line}`,
        background: 'radial-gradient(120% 80% at 0% 100%, #17150F 0%, #0A0A0B 60%)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12,
            background: 'linear-gradient(145deg, #E6CC98 0%, #C9A86C 100%)',
            boxShadow: '0 6px 18px -6px rgba(216,188,134,0.55), inset 0 1px 0 rgba(255,255,255,0.35)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.bg,
          }}>
            <Zap size={22} strokeWidth={2} fill={C.bg} />
          </div>
          <div style={{ fontFamily: SERIF, fontSize: 32, lineHeight: 1 }}>TruckFlow</div>
        </div>

        <svg className="login-route" viewBox="0 0 560 260" style={{ width: '100%', maxWidth: 560, height: 'auto' }} aria-hidden="true">
          <path d="M20 220 C 140 220, 160 80, 300 90 S 460 40, 540 30" fill="none" stroke="rgba(205,176,122,0.55)" strokeWidth="1.2" strokeDasharray="2 7" strokeLinecap="round" />
          <path d="M20 240 C 180 240, 240 160, 360 150 S 500 120, 540 110" fill="none" stroke="rgba(255,255,255,0.10)" strokeWidth="1" />
          <circle cx="20" cy="220" r="5" fill={C.bg} stroke={C.gold} strokeWidth="1.4" />
          <circle cx="300" cy="90" r="3" fill={C.gold} />
          <circle cx="540" cy="30" r="5" fill={C.gold} />
        </svg>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 18, maxWidth: 520 }}>
          <h1 style={{ fontFamily: SERIF, fontWeight: 400, fontSize: 72, lineHeight: 0.98, letterSpacing: '-0.015em' }}>
            Every mile,<br />
            <span style={{ fontStyle: 'italic', color: C.gold }}>accounted for.</span>
          </h1>
          <p style={{ color: C.dim, fontSize: 17, lineHeight: 1.6, maxWidth: 440 }}>
            Loads, drivers, brokers and invoices — one quiet place to run the whole fleet.
          </p>
        </div>
      </section>

      {/* ── Form ── */}
      <section style={{
        flex: '1 1 440px',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '56px 24px',
      }}>
        <form onSubmit={handleSubmit} style={{ width: '100%', maxWidth: 380, display: 'flex', flexDirection: 'column', gap: 26 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div className="login-label">Welcome back</div>
            <h2 style={{ fontFamily: SERIF, fontWeight: 400, fontSize: 44, lineHeight: 1 }}>Sign in</h2>
          </div>

          {error && (
            <div role="alert" style={{
              border: '1px solid rgba(233,149,149,0.3)',
              background: 'rgba(233,149,149,0.08)',
              color: C.red,
              borderRadius: 12,
              padding: '12px 16px',
              fontSize: 14.5,
            }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <label className="login-label" htmlFor="login-username">Username</label>
            <div className="login-field">
              <input
                id="login-username"
                type="text"
                placeholder="Enter username"
                value={username}
                onChange={e => setUsername(e.target.value)}
                autoFocus
                autoComplete="username"
                required
              />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <label className="login-label" htmlFor="login-password">Password</label>
            <div className="login-field">
              <input
                id="login-password"
                type={showPw ? 'text' : 'password'}
                placeholder="Enter password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                className="login-eye"
                onClick={() => setShowPw(s => !s)}
                aria-label={showPw ? 'Hide password' : 'Show password'}
              >
                {showPw ? <EyeOff size={17} strokeWidth={1.5} /> : <Eye size={17} strokeWidth={1.5} />}
              </button>
            </div>
          </div>

          <button type="submit" className="login-submit" disabled={loading}>
            {loading
              ? <><div className="spinner" style={{ borderColor: 'rgba(10,10,11,0.25)', borderTopColor: C.bg }} />Signing in…</>
              : <>Sign in<ArrowRight size={15} strokeWidth={1.7} /></>
            }
          </button>

          <div style={{ height: 1, background: C.line }} />
          <div style={{ color: C.faint, fontSize: 13.5 }}>TruckFlow · Fleet Management</div>
        </form>
      </section>
    </div>
  );
}
