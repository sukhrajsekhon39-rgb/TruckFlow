import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
import TopographicBackground from './TopographicBackground';
import { LogoMark, Wordmark } from './Brand';
import {
  LayoutDashboard, Package, Users, Truck, Container,
  Building2, BarChart3, Settings, ChevronLeft, ChevronRight,
  X, Menu, LogOut, Plus,
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

// Desktop sidebar groups
const navGroups = [
  { label: 'Operations', items: navItems.slice(0, 2) },
  { label: 'Fleet',      items: navItems.slice(2, 6) },
  { label: 'Insights',   items: navItems.slice(6) },
];

// Phone dock: two links, the gold + button, two links
const mobileNavLeft = [
  { path: '/dashboard', icon: LayoutDashboard, label: 'Home'      },
  { path: '/loads',     icon: Package,         label: 'Loads'     },
];
const mobileNavRight = [
  { path: '/analytics', icon: BarChart3,       label: 'Analytics' },
  { path: '/settings',  icon: Settings,        label: 'Settings'  },
];

// What the + button can add. Each page opens its "Add" form when the URL has ?new=1
const addOptions = [
  { path: '/loads',    icon: Package,   label: 'Load',    sub: 'New shipment with pickup and delivery' },
  { path: '/drivers',  icon: Users,     label: 'Driver',  sub: 'Name, phone and CDL details' },
  { path: '/trucks',   icon: Truck,     label: 'Truck',   sub: 'Unit number, make and model' },
  { path: '/trailers', icon: Container, label: 'Trailer', sub: 'Unit number and type' },
  { path: '/brokers',  icon: Building2, label: 'Broker',  sub: 'Company and contact' },
];

// Floating chrome (always obsidian) with a plain, faint edge
const GILD_FILL = 'linear-gradient(180deg,#141417,#0E0E10) padding-box';
const GILD_EDGE = 'linear-gradient(rgba(255,255,255,0.08),rgba(255,255,255,0.08)) border-box';
const GILD_DEPTH = 'inset 0 1px 0 rgba(255,255,255,0.05), 0 30px 60px -30px rgba(0,0,0,0.95)';

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

function initials(name) {
  return (name || 'A').trim().split(/\s+/).slice(0, 2).map(p => p[0]).join('').toUpperCase();
}

export default function Layout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  // Close the phone menus whenever the page changes
  useEffect(() => { setAddOpen(false); setMobileMenuOpen(false); }, [location.pathname, location.search]);

  const startAdd = (path) => { setAddOpen(false); navigate(`${path}?new=1`); };


  // The app is dark only (the light theme was removed)
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'dark');
    localStorage.removeItem('tf-theme');
  }, []);

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
      padding: collapsed ? '9px 0' : '8px 14px',
      justifyContent: collapsed ? 'center' : 'flex-start',
      borderRadius: 12,
      fontSize: 15,
      fontWeight: active ? 600 : 500,
      color: active ? C.text : C.dim,
      background: active ? 'linear-gradient(90deg,rgba(216,188,134,0.12),rgba(216,188,134,0.02))' : 'transparent',
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
    iconBtn: {
      width: 34, height: 34, flexShrink: 0, padding: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'transparent', border: 'none', borderRadius: 10,
      color: C.dim, cursor: 'pointer',
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
        .sidebar-nav-link.is-active:hover { background: linear-gradient(90deg,rgba(216,188,134,0.16),rgba(216,188,134,0.03)) !important; }
        /* Glowing gold marker on the card's edge beside the current page */
        .sidebar-nav-link.is-active::before {
          content: ''; position: absolute; left: -16px; top: 10px; bottom: 10px; width: 3px;
          border-radius: 0 3px 3px 0; background: ${C.gold}; box-shadow: 0 0 12px rgba(216,188,134,0.95);
        }
        .nav-grp {
          display: flex; align-items: baseline; gap: 8px;
          padding: 12px 14px 5px; white-space: nowrap;
          font-size: 10.5px; font-weight: 600; letter-spacing: .12em; text-transform: uppercase; color: #C9AE7E;
        }
        .nav-grp:first-child { padding-top: 4px; }
        .nav-sep { height: 1px; margin: 10px 14px; background: rgba(216,188,134,0.18); }
        .nav-sep:first-child { display: none; }
        /* Phone dock */
        .dock-link.active { background: rgba(216,188,134,0.10); }
        .dock-fab { transition: transform .35s cubic-bezier(0.34,1.4,0.64,1), box-shadow .3s ease; }
        .dock-fab:active { transform: scale(0.92); }
        .dock-fab svg { transition: transform .35s cubic-bezier(0.34,1.4,0.64,1); }
        .dock-fab.open svg { transform: rotate(45deg); }
        .add-sheet { animation: sheetUp .28s cubic-bezier(0.22,1,0.36,1); }
        .add-sheet > button { animation: sideIn .45s cubic-bezier(0.22,1,0.36,1) backwards; }
        .add-sheet > button:nth-child(2) { animation-delay: .03s; } .add-sheet > button:nth-child(3) { animation-delay: .06s; }
        .add-sheet > button:nth-child(4) { animation-delay: .09s; } .add-sheet > button:nth-child(5) { animation-delay: .12s; }
        .add-sheet > button:nth-child(6) { animation-delay: .15s; }
        .add-opt:active { background: rgba(216,188,134,0.10) !important; }
        @keyframes sheetUp { from { opacity: 0; transform: translateY(14px) scale(.98); } to { opacity: 1; transform: none; } }
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
        /* Subtle, static gold glow on the always-dark chrome */
        .logo-mark { box-shadow: 0 6px 22px -6px rgba(216,188,134,0.70), 0 0 28px -2px rgba(216,188,134,0.48), inset 0 1px 0 rgba(255,255,255,0.35) !important; }
        .nav-dot { box-shadow: 0 0 12px rgba(216,188,134,0.95); }
        .sidebar-nav-link svg[stroke="${C.gold}"], .side-anim svg[stroke="${C.gold}"] { filter: drop-shadow(0 0 12px rgba(216,188,134,0.95)); }
        .bottom-nav-link.active { text-shadow: 0 0 18px rgba(216,188,134,0.50), 0 0 3px rgba(216,188,134,0.32); }
        .bottom-nav-link.active svg { filter: drop-shadow(0 0 12px rgba(216,188,134,0.95)); }
        .logo-link:hover .logo-mark { transform: rotate(-8deg) scale(1.06); }
        .bottom-nav-link svg { transition: transform .4s cubic-bezier(0.34,1.6,0.64,1); }
        .bottom-nav-link.active svg { transform: translateY(-2px) scale(1.08); }
        .bottom-nav-link:active svg { transform: scale(0.88); }
        .sidebar-footer-btn:active svg { transform: scale(0.9); }
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
            padding: calc(24px + env(safe-area-inset-top, 0px)) max(16px, env(safe-area-inset-right, 0px)) calc(124px + env(safe-area-inset-bottom, 0px)) max(16px, env(safe-area-inset-left, 0px)) !important;
            margin-top: 66px !important;
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
          .main-content { padding: calc(20px + env(safe-area-inset-top, 0px)) max(12px, env(safe-area-inset-right, 0px)) calc(124px + env(safe-area-inset-bottom, 0px)) max(12px, env(safe-area-inset-left, 0px)) !important; }
        }
      `}</style>

      <div style={{ display: 'flex', minHeight: '100vh' }}>

        {/* ── DESKTOP SIDEBAR ── */}
        <aside
          className="desktop-sidebar"
          style={{
            width: collapsed ? 76 : 248,
            margin: '14px 0 14px 14px',
            borderRadius: 22,
            border: '1px solid transparent',
            background: `${GILD_FILL}, ${GILD_EDGE}`,
            boxShadow: GILD_DEPTH,
            display: 'flex',
            flexDirection: 'column',
            transition: 'width 0.3s cubic-bezier(0.22,1,0.36,1)',
            flexShrink: 0,
            position: 'sticky',
            top: 14,
            height: 'calc(100vh - 28px)',
            overflow: 'hidden',
            zIndex: 100,
          }}
        >
          {/* Logo */}
          <div className="logo-link" style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: collapsed ? '22px 0 0' : '22px 24px 0',
            justifyContent: collapsed ? 'center' : 'flex-start',
          }}>
            <LogoMark />
            {!collapsed && (
              <div style={{ overflow: 'hidden' }}>
                <div style={{ lineHeight: 1 }}>
                  <Wordmark size={28} color={C.text} />
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
            padding: '18px 16px 10px',
            display: 'flex', flexDirection: 'column', gap: 2,
            overflowY: 'auto', overflowX: 'hidden',
          }}>
            {navGroups.map(g => (
              <React.Fragment key={g.label}>
                {collapsed
                  ? <div className="nav-sep" />
                  : <div className="nav-grp">{g.label}</div>}
                {g.items.map(({ path, icon: Icon, label }) => {
                  const active = location.pathname.startsWith(path);
                  return (
                    <NavLink
                      key={path}
                      to={path}
                      className={`sidebar-nav-link${active ? ' is-active' : ''}`}
                      style={S.navLink(active)}
                      title={collapsed ? label : undefined}
                    >
                      <Icon size={18} strokeWidth={1.8} color={active ? C.gold : undefined} style={{ flexShrink: 0 }} />
                      {!collapsed && <span>{label}</span>}
                    </NavLink>
                  );
                })}
              </React.Fragment>
            ))}
          </nav>

          {/* Footer: account row with sign-out and collapse */}
          <div style={{
            margin: '0 12px', padding: collapsed ? '12px 0 14px' : '12px 4px 14px',
            borderTop: '1px solid rgba(216,188,134,0.12)',
            display: 'flex', flexDirection: collapsed ? 'column' : 'row',
            alignItems: 'center', gap: collapsed ? 6 : 10,
          }}>
            <div title={collapsed ? username : undefined} style={{
              width: 34, height: 34, borderRadius: '50%',
              background: 'linear-gradient(135deg,#2A2A2E,#18181B)',
              border: '1px solid rgba(216,188,134,0.35)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: C.gold, fontSize: 13, fontWeight: 600, flexShrink: 0,
            }}>
              {initials(username)}
            </div>
            {!collapsed && (
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 14, color: C.text, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{username}</div>
                <div style={{ fontSize: 12.5, color: C.faint }}>Signed in</div>
              </div>
            )}
            <button className="sidebar-footer-btn" style={S.iconBtn} onClick={handleLogout} aria-label="Sign out" title="Sign out">
              <LogOut size={16} strokeWidth={1.8} />
            </button>
            <button className="sidebar-footer-btn" style={S.iconBtn} onClick={() => setCollapsed(c => !c)}
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} title={collapsed ? 'Expand' : 'Collapse'}>
              {collapsed ? <ChevronRight size={16} strokeWidth={1.8} /> : <ChevronLeft size={16} strokeWidth={1.8} />}
            </button>
          </div>
        </aside>

        {/* ── MOBILE HEADER ── */}
        <div
          className="mobile-header"
          style={{
            display: 'none',
            position: 'fixed', zIndex: 300,
            top: 'calc(10px + env(safe-area-inset-top, 0px))',
            left: 'max(12px, env(safe-area-inset-left, 0px))',
            right: 'max(12px, env(safe-area-inset-right, 0px))',
            height: 56,
            borderRadius: 18,
            border: '1px solid transparent',
            background: `linear-gradient(180deg,rgba(20,20,23,0.92),rgba(14,14,16,0.92)) padding-box, ${GILD_EDGE}`,
            boxShadow: GILD_DEPTH,
            backdropFilter: 'blur(14px)',
            WebkitBackdropFilter: 'blur(14px)',
            padding: '0 4px 0 12px',
            alignItems: 'center', justifyContent: 'space-between',
          }}
        >
          <div className="logo-link" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <LogoMark size={32} />
            <Wordmark size={25} color={C.text} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
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
              position: 'fixed', zIndex: 290,
              top: 'calc(74px + env(safe-area-inset-top, 0px))',
              left: 'max(12px, env(safe-area-inset-left, 0px))',
              right: 'max(12px, env(safe-area-inset-right, 0px))',
              maxHeight: 'calc(100dvh - 90px - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px))', overflowY: 'auto',
              borderRadius: 20,
              border: '1px solid transparent',
              background: `${GILD_FILL}, ${GILD_EDGE}`,
              boxShadow: GILD_DEPTH,
              padding: '10px 10px 14px',
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

        {/* ── MOBILE "ADD" SHEET (opened by the + button) ── */}
        {addOpen && (
          <>
            <div
              onClick={() => setAddOpen(false)}
              style={{ position: 'fixed', inset: 0, zIndex: 305, background: 'rgba(5,5,6,0.66)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }}
            />
            <div
              className="add-sheet"
              role="menu"
              aria-label="Add new"
              style={{
                position: 'fixed', zIndex: 310,
                left: 'max(12px, env(safe-area-inset-left, 0px))',
                right: 'max(12px, env(safe-area-inset-right, 0px))',
                bottom: 'calc(104px + env(safe-area-inset-bottom, 0px))',
                borderRadius: 22,
                border: '1px solid transparent',
                background: `${GILD_FILL}, ${GILD_EDGE}`,
                boxShadow: GILD_DEPTH,
                padding: 10,
                display: 'flex', flexDirection: 'column', gap: 6,
              }}
            >
              <div style={{ padding: '6px 8px 4px', fontSize: 10.5, fontWeight: 600, letterSpacing: '.12em', textTransform: 'uppercase', color: '#C9AE7E' }}>
                Add new
              </div>
              {addOptions.map(({ path, icon: Icon, label, sub }) => (
                <button
                  key={path}
                  role="menuitem"
                  className="add-opt"
                  onClick={() => startAdd(path)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 14, width: '100%',
                    padding: '10px 12px', minHeight: 60, borderRadius: 14,
                    border: 'none', borderTop: '1px solid rgba(255,255,255,0.035)',
                    background: 'rgba(255,255,255,0.026)', color: C.text,
                    fontFamily: 'inherit', textAlign: 'left', cursor: 'pointer',
                  }}
                >
                  <span style={{
                    width: 38, height: 38, borderRadius: 12, flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'rgba(216,188,134,0.10)', boxShadow: 'inset 0 0 0 1px rgba(216,188,134,0.25)',
                  }}>
                    <Icon size={18} strokeWidth={1.8} color={C.gold} />
                  </span>
                  <span style={{ minWidth: 0 }}>
                    <span style={{ display: 'block', fontSize: 15.5, fontWeight: 600 }}>{label}</span>
                    <span style={{ display: 'block', fontSize: 12.5, color: C.faint, marginTop: 1 }}>{sub}</span>
                  </span>
                </button>
              ))}
            </div>
          </>
        )}

        {/* ── MOBILE BOTTOM DOCK ── */}
        <nav
          className="mobile-bottom-nav"
          style={{
            display: 'none',
            position: 'fixed', zIndex: addOpen ? 315 : 300, // stays above the add menu's backdrop so + can close it
            left: 'max(12px, env(safe-area-inset-left, 0px))',
            right: 'max(12px, env(safe-area-inset-right, 0px))',
            bottom: 'calc(12px + env(safe-area-inset-bottom, 0px))',
            height: 66,
            borderRadius: 24,
            border: '1px solid transparent',
            background: `linear-gradient(180deg,rgba(20,20,23,0.94),rgba(14,14,16,0.94)) padding-box, ${GILD_EDGE}`,
            boxShadow: GILD_DEPTH,
            backdropFilter: 'blur(14px)',
            WebkitBackdropFilter: 'blur(14px)',
            padding: '0 6px',
            justifyContent: 'space-around',
            alignItems: 'center',
          }}
        >
          {[...mobileNavLeft, null, ...mobileNavRight].map(item => {
            if (!item) {
              return (
                <button
                  key="add"
                  className={`dock-fab${addOpen ? ' open' : ''}`}
                  onClick={() => setAddOpen(o => !o)}
                  aria-label={addOpen ? 'Close add menu' : 'Add new'}
                  aria-expanded={addOpen}
                  style={{
                    width: 56, height: 56, marginTop: -30, borderRadius: 18, flexShrink: 0,
                    border: 'none', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'linear-gradient(145deg,#E6CC98,#C9A86C)', color: '#0A0A0B',
                    boxShadow: '0 0 28px -4px rgba(216,188,134,0.65), 0 10px 24px -8px #000, inset 0 1px 0 rgba(255,255,255,0.4)',
                  }}
                >
                  <Plus size={25} strokeWidth={2.2} />
                </button>
              );
            }
            const { path, icon: Icon, label } = item;
            const active = location.pathname.startsWith(path);
            return (
              <NavLink
                key={path}
                to={path}
                className={`bottom-nav-link dock-link${active ? ' active' : ''}`}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3,
                  width: 60, height: 50, borderRadius: 14,
                  color: active ? C.gold : C.faint,
                  fontSize: 11,
                  fontWeight: active ? 600 : 500,
                  letterSpacing: '0.02em',
                  textDecoration: 'none',
                  transition: 'color 0.2s ease, background-color 0.2s ease',
                }}
              >
                <Icon size={20} strokeWidth={1.8} />
                <span>{label}</span>
              </NavLink>
            );
          })}
        </nav>

      </div>
    </>
  );
}
