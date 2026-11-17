import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Package, Users, Truck, Container,
  Building2, BarChart3, Settings, ChevronLeft, ChevronRight,
  Mail, Zap, X, Menu, Sun, Moon, LogOut,
} from 'lucide-react';

const navItems = [
  { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/loads',     icon: Package,         label: 'Loads'     },
  { path: '/drivers',   icon: Users,           label: 'Drivers'   },
  { path: '/trucks',    icon: Truck,           label: 'Trucks'    },
  { path: '/trailers',  icon: Container,       label: 'Trailers'  },
  { path: '/brokers',   icon: Building2,       label: 'Brokers'   },
  { path: '/analytics', icon: BarChart3,       label: 'Analytics' },
  { path: '/gmail',     icon: Mail,            label: 'Gmail'     },
  { path: '/settings',  icon: Settings,        label: 'Settings'  },
];

const mobileNavItems = [
  { path: '/dashboard', icon: LayoutDashboard, label: 'Home'      },
  { path: '/loads',     icon: Package,         label: 'Loads'     },
  { path: '/gmail',     icon: Mail,            label: 'Gmail'     },
  { path: '/analytics', icon: BarChart3,       label: 'Analytics' },
  { path: '/settings',  icon: Settings,        label: 'Settings'  },
];

export default function Layout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const [theme, setTheme] = useState(() => localStorage.getItem('tf-theme') || 'dark');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('tf-theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark');
  const closeMenu   = () => setMobileMenuOpen(false);
  const username    = localStorage.getItem('tf-user') || 'Admin';

  const handleLogout = () => {
    localStorage.removeItem('tf-token');
    localStorage.removeItem('tf-user');
    window.location.href = '/login';
  };

  // Sidebar is always dark — gives it strong visual separation in both modes
  const S = {
    sidebar: {
      background:   '#0f1520',
      borderRight:  '1px solid #1e2d45',
    },
    logoArea: {
      borderBottom: '1px solid #1e2d45',
    },
    navLink: (active) => ({
      display: 'flex', alignItems: 'center', gap: 11,
      padding: '9px 12px',
      borderRadius: '8px',
      fontSize: 14,
      fontWeight: active ? 600 : 400,
      color: active ? '#f1f5f9' : '#8899aa',
      background: active ? 'rgba(249,115,22,0.15)' : 'transparent',
      transition: 'all 0.15s ease',
      cursor: 'pointer',
      textDecoration: 'none',
      position: 'relative',
      overflow: 'hidden',
      whiteSpace: 'nowrap',
    }),
    activeBar: {
      position: 'absolute', left: 0, top: '18%',
      height: '64%', width: 3,
      background: '#f97316',
      borderRadius: '0 3px 3px 0',
    },
    footer: {
      borderTop: '1px solid #1e2d45',
    },
    footerBtn: {
      background: 'transparent',
      border: 'none',
      cursor: 'pointer',
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '8px 12px',
      borderRadius: 8,
      width: '100%',
      color: '#8899aa',
      fontSize: 13,
      fontWeight: 400,
      fontFamily: 'inherit',
      transition: 'all 0.15s ease',
    },
  };

  return (
    <>
      <style>{`
        .sidebar-nav-link:hover {
          background: rgba(255,255,255,0.06) !important;
          color: #f1f5f9 !important;
        }
        .sidebar-footer-btn:hover {
          background: rgba(255,255,255,0.07) !important;
          color: #f1f5f9 !important;
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
            padding: 16px 16px 90px !important;
            margin-top: 56px !important;
          }
          .grid-2, .grid-3 { grid-template-columns: 1fr !important; }
          .dashboard-two-col { grid-template-columns: 1fr !important; }
          .stats-grid { grid-template-columns: 1fr 1fr !important; gap: 10px !important; }
          .stat-value { font-size: 20px !important; }
          .load-detail-grid { grid-template-columns: 1fr !important; }
          .analytics-grid { grid-template-columns: 1fr !important; }
          .page-header-row { flex-direction: column !important; align-items: flex-start !important; gap: 10px !important; }
          .page-header-row > .btn { width: 100%; justify-content: center; }
          .filter-row { flex-wrap: wrap !important; }
          .filter-row .search-bar { min-width: 100% !important; }
          .hide-mobile { display: none !important; }
          .modal-overlay { padding: 0 !important; align-items: flex-end !important; }
          .modal { max-width: 100% !important; width: 100% !important; border-radius: 16px 16px 0 0 !important; max-height: 92vh !important; }
          .modal-lg { max-width: 100% !important; }
          table { min-width: 560px; }
        }
        @media (max-width: 390px) {
          .stats-grid { grid-template-columns: 1fr !important; }
          .main-content { padding: 12px 12px 90px !important; }
        }
      `}</style>

      <div style={{ display: 'flex', minHeight: '100vh' }}>

        {/* ── DESKTOP SIDEBAR ── */}
        <aside
          className="desktop-sidebar"
          style={{
            width: collapsed ? 64 : 216,
            ...S.sidebar,
            display: 'flex',
            flexDirection: 'column',
            transition: 'width 0.28s cubic-bezier(0.4,0,0.2,1)',
            flexShrink: 0,
            position: 'sticky',
            top: 0,
            height: '100vh',
            overflow: 'hidden',
            zIndex: 100,
          }}
        >
          {/* Logo */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '18px 14px',
            minHeight: 62,
            ...S.logoArea,
          }}>
            <div style={{
              width: 34, height: 34, borderRadius: 9,
              background: '#f97316',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
              boxShadow: '0 2px 8px rgba(249,115,22,0.4)',
            }}>
              <Zap size={17} color="white" fill="white" />
            </div>
            {!collapsed && (
              <div style={{ overflow: 'hidden' }}>
                <div style={{
                  fontWeight: 700, fontSize: 15,
                  color: '#f1f5f9',
                  letterSpacing: '-0.02em',
                  lineHeight: 1.2,
                }}>
                  TruckFlow
                </div>
                <div style={{ fontSize: 11, color: '#5a7080', marginTop: 1 }}>
                  Fleet Management
                </div>
              </div>
            )}
          </div>

          {/* Nav */}
          <nav style={{
            flex: 1,
            padding: '10px 8px',
            display: 'flex', flexDirection: 'column', gap: 1,
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
                >
                  {active && <div style={S.activeBar} />}
                  <Icon
                    size={17}
                    color={active ? '#f97316' : undefined}
                    style={{ flexShrink: 0, marginLeft: active ? 2 : 0 }}
                  />
                  {!collapsed && <span>{label}</span>}
                </NavLink>
              );
            })}
          </nav>

          {/* Footer */}
          <div style={{ padding: '8px', ...S.footer }}>
            {/* User info */}
            {!collapsed && (
              <div style={{
                padding: '8px 12px 10px',
                marginBottom: 4,
                borderBottom: '1px solid #1e2d45',
              }}>
                <div style={{ fontSize: 11, color: '#5a7080', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>Signed in as</div>
                <div style={{ fontSize: 13, color: '#f1f5f9', fontWeight: 600 }}>{username}</div>
              </div>
            )}

            {/* Theme toggle */}
            <button
              className="sidebar-footer-btn"
              style={{
                ...S.footerBtn,
                justifyContent: collapsed ? 'center' : 'flex-start',
                marginBottom: 2,
              }}
              onClick={toggleTheme}
            >
              {theme === 'dark'
                ? <Sun size={15} color="#facc15" />
                : <Moon size={15} color="#60a5fa" />
              }
              {!collapsed && (
                <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
              )}
            </button>

            {/* Logout */}
            <button
              className="sidebar-footer-btn"
              style={{ ...S.footerBtn, justifyContent: collapsed ? 'center' : 'flex-start', marginBottom: 2, color: '#f87171' }}
              onClick={handleLogout}
            >
              <LogOut size={15} color="#f87171" />
              {!collapsed && <span>Sign Out</span>}
            </button>

            {/* Collapse */}
            <button
              className="sidebar-footer-btn"
              style={{
                ...S.footerBtn,
                justifyContent: collapsed ? 'center' : 'flex-end',
              }}
              onClick={() => setCollapsed(c => !c)}
            >
              {collapsed
                ? <ChevronRight size={15} />
                : <><span style={{ marginRight: 2 }}>Collapse</span><ChevronLeft size={15} /></>
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
            background: '#0f1520',
            borderBottom: '1px solid #1e2d45',
            padding: '0 16px', height: 56,
            alignItems: 'center', justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <div style={{
              width: 28, height: 28, borderRadius: 7,
              background: '#f97316',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Zap size={14} color="white" fill="white" />
            </div>
            <span style={{ fontWeight: 700, fontSize: 15, color: '#f1f5f9' }}>
              TruckFlow
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <button
              onClick={toggleTheme}
              style={{
                background: 'transparent', border: 'none', cursor: 'pointer',
                padding: 8, borderRadius: 8, display: 'flex', alignItems: 'center',
              }}
            >
              {theme === 'dark'
                ? <Sun size={18} color="#facc15" />
                : <Moon size={18} color="#60a5fa" />
              }
            </button>
            <button
              onClick={() => setMobileMenuOpen(o => !o)}
              style={{
                background: 'transparent', border: 'none', cursor: 'pointer',
                padding: 8, borderRadius: 8, display: 'flex', alignItems: 'center',
                color: '#f1f5f9',
              }}
            >
              {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
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
                background: 'rgba(0,0,0,0.6)',
                backdropFilter: 'blur(4px)',
              }}
            />
            <div style={{
              position: 'fixed', top: 56, left: 0, right: 0, zIndex: 290,
              background: '#0f1520',
              borderBottom: '1px solid #1e2d45',
              padding: '8px 10px 14px',
              animation: 'slideDown 0.18s ease',
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
                      padding: '12px 14px',
                      borderRadius: 9,
                      color: active ? '#f97316' : '#b0bec8',
                      background: active ? 'rgba(249,115,22,0.12)' : 'transparent',
                      fontWeight: active ? 600 : 400,
                      fontSize: 15,
                      marginBottom: 2,
                      textDecoration: 'none',
                    }}
                  >
                    <Icon size={18} />
                    <span>{label}</span>
                  </NavLink>
                );
              })}
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
          <div className="main-content page-enter" style={{ flex: 1 }}>
            <Outlet />
          </div>
        </main>

        {/* ── MOBILE BOTTOM NAV ── */}
        <nav
          className="mobile-bottom-nav"
          style={{
            display: 'none',
            position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 300,
            background: '#0f1520',
            borderTop: '1px solid #1e2d45',
            padding: `6px 0 calc(6px + env(safe-area-inset-bottom))`,
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
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                  padding: '4px 12px',
                  color: active ? '#f97316' : '#5a7080',
                  fontSize: 10.5,
                  fontWeight: active ? 600 : 400,
                  minWidth: 52,
                  textDecoration: 'none',
                  transition: 'color 0.15s ease',
                }}
              >
                <Icon size={21} />
                <span>{label}</span>
              </NavLink>
            );
          })}
        </nav>

      </div>
    </>
  );
}