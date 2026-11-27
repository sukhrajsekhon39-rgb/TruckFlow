import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import TopographicBackground from './TopographicBackground';
import {
  LayoutDashboard, Package, Users, Truck, Container,
  Building2, BarChart3, Settings, ChevronLeft, ChevronRight,
  Zap, X, Menu, Sun, Moon, LogOut,
} from 'lucide-react';

const navItems = [
  { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/loads',     icon: Package,         label: 'Loads'     },
  { path: '/drivers',   icon: Users,           label: 'Drivers'   },
  { path: '/trucks',    icon: Truck,           label: 'Trucks'    },
  { path: '/trailers',  icon: Container,       label: 'Trailers'  },
  { path: '/brokers',   icon: Building2,       label: 'Brokers'   },
  { path: '/analytics', icon: BarChart3,       label: 'Analytics' },
  { path: '/settings',  icon: Settings,        label: 'Settings'  },
];

const mobileNavItems = [
  { path: '/dashboard', icon: LayoutDashboard, label: 'Home'      },
  { path: '/loads',     icon: Package,         label: 'Loads'     },
  { path: '/analytics', icon: BarChart3,       label: 'Analytics' },
  { path: '/settings',  icon: Settings,        label: 'Settings'  },
];

// Sidebar palette — always obsidian so it reads as a frame in both themes
const C = {
  bg:      '#0A0A0B',
  line:    'rgba(255,255,255,0.07)',
  text:    '#F7F5F1',
  dim:     '#CFCCC5',
  faint:   '#ADAAA3',
  gold:    '#D8BC86',
  goldLine:'rgba(216,188,134,0.5)',
  red:     '#E99595',
};
const SERIF = "'Instrument Serif', Georgia, serif";

function initials(name) {
  return (name || 'A').trim().split(/\s+/).slice(0, 2).map(p => p[0]).join('').toUpperCase();
}

function LogoMark({ size = 40 }) {
  return (
    <div className="logo-mark" style={{
      width: size, height: size, borderRadius: size * 0.28,
      background: 'linear-gradient(145deg, #E6CC98 0%, #C9A86C 100%)',
      boxShadow: '0 6px 18px -6px rgba(216,188,134,0.55), inset 0 1px 0 rgba(255,255,255,0.35)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0, color: '#0A0A0B',
    }}>
      <Zap size={size * 0.5} strokeWidth={2} fill="#0A0A0B" />
    </div>
  );
}

export default function Layout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const [theme, setTheme] = useState(() => localStorage.getItem('tf-theme') || 'dark');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('tf-theme', theme);
  }, [theme]);

  // Cross-fade colours briefly while the theme switches
  const toggleTheme = () => {
    const root = document.documentElement;
    root.classList.add('theme-anim');
    setTheme(t => t === 'dark' ? 'light' : 'dark');
    window.clearTimeout(window.__tfThemeTimer);
    window.__tfThemeTimer = window.setTimeout(() => root.classList.remove('theme-anim'), 500);
  };
  const closeMenu   = () => setMobileMenuOpen(false);
  const username    = localStorage.getItem('tf-user') || 'Admin';

  const handleLogout = () => {
    localStorage.removeItem('tf-token');
    localStorage.removeItem('tf-user');
    window.location.href = '/login';
  };

  const S = {
    navLink: (active) => ({
      display: 'flex', alignItems: 'center', gap: 12,
      padding: collapsed ? '11px 0' : '10px 14px',
      justifyContent: collapsed ? 'center' : 'flex-start',
      borderRadius: 10,
      fontSize: 15,
      fontWeight: active ? 600 : 500,
      color: active ? C.text : C.dim,
      background: active ? 'rgba(255,255,255,0.06)' : 'transparent',
      transition: 'all 0.2s ease',
      cursor: 'pointer',
      textDecoration: 'none',
      position: 'relative',
      whiteSpace: 'nowrap',
    }),
    activeDot: {
      width: 6, height: 6, borderRadius: '50%',
      background: C.gold, marginLeft: 'auto', flexShrink: 0,
    },
    footerBtn: {
      background: 'transparent',
      border: 'none',
      cursor: 'pointer',
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '9px 14px',
      minHeight: 40,
      borderRadius: 10,
      width: '100%',
      color: C.dim,
      fontSize: 14,
      fontWeight: 500,
      fontFamily: 'inherit',
      transition: 'all 0.2s ease',
    },
  };

  return (
    <>
      <style>{`
        .sidebar-nav-link {
          transition: background-color .3s ease, color .3s ease !important;
        }
        .sidebar-nav-link:hover {
          background: rgba(255,255,255,0.04) !important;
          color: ${C.text} !important;
        }
        .sidebar-nav-link svg { transition: transform .35s cubic-bezier(0.34,1.4,0.64,1), color .3s ease; }
        .sidebar-nav-link:hover svg { transform: translateX(2px) scale(1.08); }
        .nav-dot { animation: dotPop .45s cubic-bezier(0.34,1.6,0.64,1) backwards; }
        @keyframes dotPop { from { transform: scale(0); opacity: 0; } to { transform: none; opacity: 1; } }
        .side-anim > * { animation: sideIn .6s cubic-bezier(0.22,1,0.36,1) backwards; }
        .side-anim > *:nth-child(1) { animation-delay: .05s; } .side-anim > *:nth-child(2) { animation-delay: .09s; }
        .side-anim > *:nth-child(3) { animation-delay: .13s; } .side-anim > *:nth-child(4) { animation-delay: .17s; }
        .side-anim > *:nth-child(5) { animation-delay: .21s; } .side-anim > *:nth-child(6) { animation-delay: .25s; }
        .side-anim > *:nth-child(7) { animation-delay: .29s; } .side-anim > *:nth-child(8) { animation-delay: .33s; }
        .side-anim > *:nth-child(9) { animation-delay: .37s; }
        @keyframes sideIn { from { opacity: 0; transform: translateX(-8px); } to { opacity: 1; transform: none; } }
        .logo-mark { transition: transform .5s cubic-bezier(0.34,1.4,0.64,1), box-shadow .5s ease; }
        /* Dreamy gold glow on the always-dark chrome */
        .logo-mark { animation: logoGlow 6s ease-in-out infinite; }
        @keyframes logoGlow {
          0%, 100% { box-shadow: 0 6px 18px -6px rgba(216,188,134,0.55), 0 0 18px -2px rgba(216,188,134,0.30), inset 0 1px 0 rgba(255,255,255,0.35); }
          50%      { box-shadow: 0 6px 22px -4px rgba(216,188,134,0.75), 0 0 30px 0 rgba(216,188,134,0.45), inset 0 1px 0 rgba(255,255,255,0.35); }
        }
        .nav-dot { box-shadow: 0 0 10px rgba(216,188,134,0.9), 0 0 3px rgba(216,188,134,0.9); }
        .sidebar-nav-link svg[stroke="${C.gold}"], .side-anim svg[stroke="${C.gold}"] { filter: drop-shadow(0 0 5px rgba(216,188,134,0.6)); }
        .bottom-nav-link.active { text-shadow: 0 0 12px rgba(216,188,134,0.55); }
        .bottom-nav-link.active svg { filter: drop-shadow(0 0 6px rgba(216,188,134,0.6)); }
        .logo-link:hover .logo-mark { transform: rotate(-8deg) scale(1.06); box-shadow: 0 10px 26px -6px rgba(216,188,134,0.7), inset 0 1px 0 rgba(255,255,255,0.35) !important; }
        .bottom-nav-link svg { transition: transform .4s cubic-bezier(0.34,1.6,0.64,1); }
        .bottom-nav-link.active svg { transform: translateY(-2px) scale(1.08); }
        .bottom-nav-link:active svg { transform: scale(0.88); }
        .mobile-theme-btn svg { transition: transform .6s cubic-bezier(0.34,1.4,0.64,1); }
        .mobile-theme-btn:active svg, .sidebar-footer-btn:active svg { transform: rotate(90deg) scale(0.9); }
        .sidebar-footer-btn svg { transition: transform .5s cubic-bezier(0.34,1.4,0.64,1); }
        .sidebar-footer-btn:hover {
          background: rgba(255,255,255,0.04) !important;
          color: ${C.text} !important;
        }
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @media (max-width: 768px) {
          .desktop-sidebar { display: none !important; }
          .mobile-header   { display: flex !important; }
          .mobile-bottom-nav { display: flex !important; }
          .main-content {
            padding: 20px 16px 96px !important;
            margin-top: 60px !important;
          }
          .grid-2, .grid-3 { grid-template-columns: 1fr !important; }
          .dashboard-two-col { grid-template-columns: 1fr !important; }
          .stats-grid { grid-template-columns: 1fr 1fr !important; gap: 10px !important; }
          .stat-value { font-size: 28px !important; }
          .load-detail-grid { grid-template-columns: 1fr !important; }
          .analytics-grid { grid-template-columns: 1fr !important; }
          .page-header-row { flex-direction: column !important; align-items: flex-start !important; gap: 10px !important; }
          .page-header-row > .btn { width: 100%; justify-content: center; }
          .filter-row { flex-wrap: wrap !important; }
          .filter-row .search-bar { min-width: 100% !important; }
          .hide-mobile { display: none !important; }
          .modal-overlay { padding: 0 !important; align-items: flex-end !important; }
          .modal { max-width: 100% !important; width: 100% !important; border-radius: 22px 22px 0 0 !important; max-height: calc(100dvh - 24px) !important; }
          .modal-lg { max-width: 100% !important; }
          table { min-width: 100%; width: max-content; }
        }
        @media (max-width: 390px) {
          .stats-grid { grid-template-columns: 1fr !important; }
          .main-content { padding: 16px 12px 96px !important; }
        }
      `}</style>

      <div style={{ display: 'flex', minHeight: '100vh' }}>

        {/* ── DESKTOP SIDEBAR ── */}
        <aside
          className="desktop-sidebar"
          style={{
            width: collapsed ? 76 : 248,
            background: C.bg,
            borderRight: `1px solid ${C.line}`,
            display: 'flex',
            flexDirection: 'column',
            transition: 'width 0.3s cubic-bezier(0.22,1,0.36,1)',
            flexShrink: 0,
            position: 'sticky',
            top: 0,
            height: '100vh',
            overflow: 'hidden',
            zIndex: 100,
          }}
        >
          {/* Logo */}
          <div className="logo-link" style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: collapsed ? '28px 0 0' : '28px 26px 0',
            justifyContent: collapsed ? 'center' : 'flex-start',
          }}>
            <LogoMark />
            {!collapsed && (
              <div style={{ overflow: 'hidden' }}>
                <div style={{ fontFamily: SERIF, fontSize: 28, lineHeight: 1, color: C.text }}>
                  TruckFlow
                </div>
                <div style={{
                  fontSize: 11, fontWeight: 600, color: C.faint, marginTop: 6,
                  letterSpacing: '0.12em', textTransform: 'uppercase',
                }}>
                  Fleet Management
                </div>
              </div>
            )}
          </div>

          {/* Nav */}
          <nav className="side-anim" style={{
            flex: 1,
            padding: '36px 16px 12px',
            display: 'flex', flexDirection: 'column', gap: 2,
            overflowY: 'auto', overflowX: 'hidden',
          }}>
            {navItems.map(({ path, icon: Icon, label }) => {
              const active = location.pathname.startsWith(path);
              return (
                <NavLink
                  key={path}
                  to={path}
                  className="sidebar-nav-link"
                  style={S.navLink(active)}
                  title={collapsed ? label : undefined}
                >
                  <Icon size={18} strokeWidth={1.8} color={active ? C.gold : undefined} style={{ flexShrink: 0 }} />
                  {!collapsed && <span>{label}</span>}
                  {!collapsed && active && <span className="nav-dot" style={S.activeDot} />}
                </NavLink>
              );
            })}
          </nav>

          {/* Footer */}
          <div style={{ padding: '0 16px 20px', display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* User info */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 12,
              justifyContent: collapsed ? 'center' : 'flex-start',
              padding: collapsed ? '14px 0' : '14px 10px',
              borderTop: `1px solid ${C.line}`,
              marginBottom: 6,
            }}>
              <div style={{
                width: 34, height: 34, borderRadius: '50%',
                background: 'linear-gradient(135deg,#2A2A2E,#18181B)',
                border: '1px solid rgba(255,255,255,0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: C.gold, fontSize: 13, fontWeight: 600, flexShrink: 0,
              }}>
                {initials(username)}
              </div>
              {!collapsed && (
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 14, color: C.text, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{username}</div>
                  <div style={{ fontSize: 12.5, color: C.faint }}>Signed in</div>
                </div>
              )}
            </div>

            {/* Theme toggle */}
            <button
              className="sidebar-footer-btn"
              style={{ ...S.footerBtn, justifyContent: collapsed ? 'center' : 'flex-start' }}
              onClick={toggleTheme}
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {theme === 'dark'
                ? <Sun size={17} strokeWidth={1.8} />
                : <Moon size={17} strokeWidth={1.8} />
              }
              {!collapsed && (
                <span>{theme === 'dark' ? 'Light mode' : 'Dark mode'}</span>
              )}
            </button>

            {/* Logout */}
            <button
              className="sidebar-footer-btn"
              style={{ ...S.footerBtn, justifyContent: collapsed ? 'center' : 'flex-start' }}
              onClick={handleLogout}
              aria-label="Sign out"
            >
              <LogOut size={17} strokeWidth={1.8} />
              {!collapsed && <span>Sign out</span>}
            </button>

            {/* Collapse */}
            <button
              className="sidebar-footer-btn"
              style={{ ...S.footerBtn, justifyContent: collapsed ? 'center' : 'flex-start' }}
              onClick={() => setCollapsed(c => !c)}
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {collapsed
                ? <ChevronRight size={17} strokeWidth={1.8} />
                : <><ChevronLeft size={17} strokeWidth={1.8} /><span>Collapse</span></>
              }
            </button>
          </div>
        </aside>

        {/* ── MOBILE HEADER ── */}
        <div
          className="mobile-header"
          style={{
            display: 'none',
            position: 'fixed', top: 0, left: 0, right: 0, zIndex: 300,
            background: 'rgba(10,10,11,0.86)',
            backdropFilter: 'blur(14px)',
            WebkitBackdropFilter: 'blur(14px)',
            borderBottom: `1px solid ${C.line}`,
            padding: '0 16px', height: 60,
            alignItems: 'center', justifyContent: 'space-between',
          }}
        >
          <div className="logo-link" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <LogoMark size={32} />
            <span style={{ fontFamily: SERIF, fontSize: 25, lineHeight: 1, color: C.text }}>
              TruckFlow
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <button
              className="mobile-theme-btn"
              onClick={toggleTheme}
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              style={{
                background: 'transparent', border: 'none', cursor: 'pointer',
                width: 44, height: 44, borderRadius: 999, display: 'flex',
                alignItems: 'center', justifyContent: 'center', color: C.dim,
              }}
            >
              {theme === 'dark' ? <Sun size={18} strokeWidth={1.5} /> : <Moon size={18} strokeWidth={1.5} />}
            </button>
            <button
              onClick={() => setMobileMenuOpen(o => !o)}
              aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
              style={{
                background: 'transparent', border: 'none', cursor: 'pointer',
                width: 44, height: 44, borderRadius: 999, display: 'flex',
                alignItems: 'center', justifyContent: 'center', color: C.text,
              }}
            >
              {mobileMenuOpen ? <X size={22} strokeWidth={1.5} /> : <Menu size={22} strokeWidth={1.5} />}
            </button>
          </div>
        </div>

        {/* ── MOBILE DROPDOWN MENU ── */}
        {mobileMenuOpen && (
          <>
            <div
              onClick={closeMenu}
              style={{
                position: 'fixed', inset: 0, zIndex: 280,
                background: 'rgba(5,5,6,0.66)',
                backdropFilter: 'blur(6px)',
              }}
            />
            <div className="side-anim" style={{
              position: 'fixed', top: 60, left: 0, right: 0, zIndex: 290,
              background: C.bg,
              borderBottom: `1px solid ${C.line}`,
              padding: '10px 12px 16px',
              animation: 'slideDown 0.2s ease',
            }}>
              {navItems.map(({ path, icon: Icon, label }) => {
                const active = location.pathname.startsWith(path);
                return (
                  <NavLink
                    key={path}
                    to={path}
                    onClick={closeMenu}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 14,
                      padding: '13px 14px',
                      borderRadius: 12,
                      color: active ? C.text : C.dim,
                      background: active ? 'rgba(255,255,255,0.06)' : 'transparent',
                      fontWeight: active ? 600 : 500,
                      fontSize: 16,
                      marginBottom: 2,
                      textDecoration: 'none',
                    }}
                  >
                    <Icon size={19} strokeWidth={1.8} color={active ? C.gold : undefined} />
                    <span>{label}</span>
                    {active && <span className="nav-dot" style={S.activeDot} />}
                  </NavLink>
                );
              })}

              {/* Account */}
              <div style={{ borderTop: `1px solid ${C.line}`, margin: '10px 4px 0', paddingTop: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: '50%',
                  background: 'linear-gradient(135deg,#2A2A2E,#18181B)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: C.gold, fontSize: 13, fontWeight: 600, flexShrink: 0,
                }}>
                  {initials(username)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, color: C.text, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{username}</div>
                  <div style={{ fontSize: 12.5, color: C.faint }}>Signed in</div>
                </div>
                <button
                  onClick={handleLogout}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    height: 44, padding: '0 16px', borderRadius: 999,
                    border: '1px solid rgba(233,149,149,0.35)', background: 'transparent',
                    color: C.red, fontFamily: 'inherit', fontSize: 14, fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  <LogOut size={16} strokeWidth={1.8} /> Sign out
                </button>
              </div>
            </div>
          </>
        )}

        {/* ── MAIN CONTENT ── */}
        <main style={{
          flex: 1,
          display: 'flex', flexDirection: 'column',
          minWidth: 0, overflowX: 'hidden',
          background: 'var(--bg-primary)',
        }}>
          <TopographicBackground />
          <div key={location.pathname} className="main-content page-enter" style={{ flex: 1 }}>
            <Outlet />
          </div>
        </main>

        {/* ── MOBILE BOTTOM NAV ── */}
        <nav
          className="mobile-bottom-nav"
          style={{
            display: 'none',
            position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 300,
            background: 'rgba(10,10,11,0.9)',
            backdropFilter: 'blur(14px)',
            WebkitBackdropFilter: 'blur(14px)',
            borderTop: `1px solid ${C.line}`,
            padding: `8px 0 calc(8px + env(safe-area-inset-bottom))`,
            justifyContent: 'space-around',
            alignItems: 'center',
          }}
        >
          {mobileNavItems.map(({ path, icon: Icon, label }) => {
            const active = location.pathname.startsWith(path);
            return (
              <NavLink
                key={path}
                to={path}
                className={`bottom-nav-link${active ? ' active' : ''}`}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                  padding: '4px 12px',
                  color: active ? C.gold : C.faint,
                  fontSize: 11.5,
                  fontWeight: active ? 600 : 500,
                  letterSpacing: '0.02em',
                  minWidth: 56,
                  textDecoration: 'none',
                  transition: 'color 0.2s ease',
                }}
              >
                <Icon size={21} strokeWidth={1.8} />
                <span>{label}</span>
              </NavLink>
            );
          })}
        </nav>

      </div>
    </>
  );
}
