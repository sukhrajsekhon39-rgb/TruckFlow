import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { loadsApi, analyticsApi } from '../utils/api';
import { DollarSign, Route, Package, TrendingUp, Clock, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

function StatusBadge({ status }) {
  const map = { 'Pending': 'badge-pending', 'In Transit': 'badge-transit', 'Delivered': 'badge-delivered', 'Invoiced': 'badge-invoiced', 'Paid': 'badge-paid' };
  return <span className={`badge ${map[status] || ''}`}>{status}</span>;
}

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  return isMobile;
}

export default function Dashboard() {
  const [analytics, setAnalytics] = useState(null);
  const [recentLoads, setRecentLoads] = useState([]);
  const [loading, setLoading] = useState(true);
  const isMobile = useIsMobile();

  useEffect(() => {
    Promise.all([
      analyticsApi.getSummary(),
      loadsApi.getAll({ limit: 8 }),
    ]).then(([aRes, lRes]) => {
      setAnalytics(aRes.data);
      setRecentLoads(lRes.data.slice(0, 8));
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="page-loader"><div className="spinner" /></div>;

  const t = analytics?.totals || {};
  const now = new Date();
  const greeting = now.getHours() < 12 ? 'Good morning' : now.getHours() < 17 ? 'Good afternoon' : 'Good evening';
  const pendingInvoice = recentLoads.filter(l => l.status === 'Delivered').length;

  return (
    <div className="page-enter">
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em' }}>{greeting} 👋</h1>
        <p style={{ color: 'var(--text-secondary)', marginTop: 4, fontSize: 14 }}>
          {format(now, 'EEEE, MMMM d, yyyy')}
        </p>
      </div>

      {/* Alert */}
      {pendingInvoice > 0 && (
        <div style={{
          background: 'var(--yellow-dim)', border: '1px solid rgba(245,158,11,0.3)',
          borderRadius: 'var(--radius-sm)', padding: '12px 16px',
          marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10,
          fontSize: 14, color: 'var(--yellow)', flexWrap: 'wrap',
        }}>
          <AlertCircle size={16} style={{ flexShrink: 0 }} />
          <span><strong>{pendingInvoice} load{pendingInvoice > 1 ? 's' : ''}</strong> awaiting invoice</span>
          <Link to="/loads?status=Delivered" style={{ marginLeft: 'auto', textDecoration: 'underline', color: 'inherit', whiteSpace: 'nowrap' }}>View →</Link>
        </div>
      )}

      {/* Stats */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: isMobile ? 10 : 14,
        marginBottom: 24,
      }}>
        {[
          { label: 'Total Revenue', value: `$${(t.totalRevenue || 0).toLocaleString()}`, sub: 'All time', color: 'orange', icon: <DollarSign size={18} color="var(--accent)" />, iconBg: 'var(--accent-dim)' },
          { label: 'Total Loads', value: (t.totalLoads || 0).toLocaleString(), sub: 'All time', color: 'blue', icon: <Package size={18} color="var(--blue)" />, iconBg: 'var(--blue-dim)' },
          { label: 'Total Miles', value: (t.totalMiles || 0).toLocaleString(), sub: 'All time', color: 'green', icon: <Route size={18} color="var(--green)" />, iconBg: 'var(--green-dim)' },
          { label: 'Avg Rate/Mile', value: `$${(t.avgRatePerMile || 0).toFixed(2)}`, sub: 'All time avg', color: 'purple', icon: <TrendingUp size={18} color="var(--purple)" />, iconBg: 'rgba(139,92,246,0.15)' },
        ].map(s => (
          <div key={s.label} className={`stat-card ${s.color}`}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ minWidth: 0 }}>
                <div className="stat-label">{s.label}</div>
                <div className="stat-value" style={{ fontSize: isMobile ? 18 : 28 }}>{s.value}</div>
                <div className="stat-sub">{s.sub}</div>
              </div>
              {!isMobile && (
                <div style={{ padding: 8, background: s.iconBg, borderRadius: 8, flexShrink: 0 }}>{s.icon}</div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Main content — stacks on mobile */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : '1fr 280px',
        gap: 20,
      }}>
        {/* Recent loads */}
        <div className="card" style={{ padding: 0, minWidth: 0 }}>
          <div style={{ padding: '16px 18px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="section-title" style={{ fontSize: 15 }}>
              <Clock size={15} color="var(--accent)" /> Recent Loads
            </div>
            <Link to="/loads" className="btn btn-ghost btn-sm">View all →</Link>
          </div>
          {/* Mobile: card list instead of table */}
          {isMobile ? (
            <div style={{ padding: '8px 0' }}>
              {recentLoads.length === 0 ? (
                <div className="empty-state"><p>No loads yet</p></div>
              ) : recentLoads.map(load => (
                <div
                  key={load._id}
                  onClick={() => window.location.href = `/loads/${load._id}`}
                  style={{
                    padding: '12px 16px',
                    borderBottom: '1px solid var(--border)',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 10,
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span className="mono" style={{ color: 'var(--accent)', fontSize: 13, fontWeight: 600 }}>{load.loadNumber}</span>
                      <StatusBadge status={load.status} />
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {load.pickup?.city || '—'}{load.delivery?.city ? ` → ${load.delivery.city}` : ''}
                    </div>
                    {load.driver?.name && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{load.driver.name}</div>}
                  </div>
                  <div style={{ color: 'var(--green)', fontWeight: 700, fontSize: 15, flexShrink: 0 }}>
                    ${(load.rate || 0).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Load #</th>
                    <th>Driver</th>
                    <th>Route</th>
                    <th>Rate</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentLoads.length === 0 ? (
                    <tr><td colSpan={5} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No loads yet</td></tr>
                  ) : recentLoads.map(load => (
                    <tr key={load._id} style={{ cursor: 'pointer' }} onClick={() => window.location.href = `/loads/${load._id}`}>
                      <td><span className="mono" style={{ color: 'var(--accent)' }}>{load.loadNumber}</span></td>
                      <td>{load.driver?.name || '—'}</td>
                      <td style={{ fontSize: 12 }}>
                        {load.pickup?.city || '—'}
                        {load.delivery?.city ? <span style={{ color: 'var(--text-muted)' }}> → {load.delivery.city}</span> : ''}
                      </td>
                      <td style={{ color: 'var(--green)', fontWeight: 600 }}>${(load.rate || 0).toLocaleString()}</td>
                      <td><StatusBadge status={load.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Sidebar cards — always full width on mobile */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card">
            <div style={{ fontWeight: 600, marginBottom: 14, fontSize: 14 }}>Load Status</div>
            {(analytics?.statusBreakdown || []).map(s => (
              <div key={s._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <StatusBadge status={s._id} />
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={{ fontWeight: 600, fontSize: 14 }}>{s.count}</span>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>${(s.revenue || 0).toLocaleString()}</span>
                </div>
              </div>
            ))}
            {!analytics?.statusBreakdown?.length && <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No data yet</p>}
          </div>

          <div className="card">
            <div style={{ fontWeight: 600, marginBottom: 14, fontSize: 14 }}>Top Drivers</div>
            {(analytics?.topDrivers || []).slice(0, 4).map(d => (
              <div key={d._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{d.loads} loads · {(d.miles || 0).toLocaleString()} mi</div>
                </div>
                <span style={{ color: 'var(--green)', fontWeight: 600, fontSize: 13, flexShrink: 0, marginLeft: 8 }}>${(d.revenue || 0).toLocaleString()}</span>
              </div>
            ))}
            {!analytics?.topDrivers?.length && <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No data yet</p>}
          </div>
        </div>
      </div>
    </div>
  );
}