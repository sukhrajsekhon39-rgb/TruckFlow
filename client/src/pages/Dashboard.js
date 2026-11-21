import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { loadsApi, analyticsApi, driversApi } from '../utils/api';
import { DollarSign, Route, Package, TrendingUp, Clock, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, parse, startOfDay, startOfWeek, startOfMonth, addDays, addWeeks, addMonths, differenceInCalendarDays } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

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

const WEEK_OPTS = { weekStartsOn: 1 }; // 1 = Monday, change to 0 for Sunday
const STATUS_OPTS = ['Pending', 'In Transit', 'Delivered', 'Invoiced', 'Paid'];
const money = n => `$${Math.round(n || 0).toLocaleString()}`;

// Start (inclusive) and end (exclusive) of the period being shown
function rangeFor(mode, anchor, from, to) {
  if (mode === 'week') {
    const s = startOfWeek(anchor, WEEK_OPTS);
    return { start: s, end: addDays(s, 7) };
  }
  if (mode === 'month') {
    const s = startOfMonth(anchor);
    return { start: s, end: addMonths(s, 1) };
  }
  const f = parse(from, 'yyyy-MM-dd', new Date());
  const t = parse(to, 'yyyy-MM-dd', new Date());
  if (isNaN(f) || isNaN(t) || f > t) return null;
  return { start: startOfDay(f), end: addDays(startOfDay(t), 1) };
}

// Revenue per day (or per week for long custom ranges) for the bar chart
function buildBuckets(loads, start, end, mode, dateOf) {
  const n = differenceInCalendarDays(end, start);
  const step = n <= 45 ? 1 : 7;
  const fmt = mode === 'week' ? 'EEE' : mode === 'month' ? 'd' : 'M/d';
  const buckets = [];
  for (let i = 0; i < n; i += step) {
    buckets.push({ day: format(addDays(start, i), fmt), Revenue: 0, s: addDays(start, i), e: addDays(start, Math.min(i + step, n)) });
  }
  loads.forEach(l => {
    const d = dateOf(l);
    const b = buckets.find(x => d >= x.s && d < x.e);
    if (b) b.Revenue += l.rate || 0;
  });
  return buckets.map(({ day, Revenue }) => ({ day, Revenue }));
}

function WorkSummary({ isMobile }) {
  const [mode, setMode] = useState('week'); // 'week' | 'month' | 'custom'
  const [anchor, setAnchor] = useState(() => new Date());
  const [from, setFrom] = useState(() => format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [to, setTo] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [by, setBy] = useState('pickup');
  const [driver, setDriver] = useState('');
  const [status, setStatus] = useState('');
  const [drivers, setDrivers] = useState([]);
  const [loads, setLoads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [showLoads, setShowLoads] = useState(false);

  const range = rangeFor(mode, anchor, from, to);
  const startMs = range ? range.start.getTime() : 0;
  const endMs = range ? range.end.getTime() : 0;

  useEffect(() => {
    driversApi.getAll().then(res => setDrivers(res.data || [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (!range) { setLoads([]); setLoading(false); setError(false); return; }
    let cancelled = false;
    setLoading(true);
    setError(false);
    analyticsApi.getRange({ start: range.start.toISOString(), end: range.end.toISOString(), by, driver, status })
      .then(res => { if (!cancelled) setLoads(res.data.loads || []); })
      .catch(() => { if (!cancelled) setError(true); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [startMs, endMs, by, driver, status]);

  const now = new Date();
  const isCurrent = mode === 'week'
    ? startOfWeek(anchor, WEEK_OPTS).getTime() === startOfWeek(now, WEEK_OPTS).getTime()
    : mode === 'month'
      ? startOfMonth(anchor).getTime() === startOfMonth(now).getTime()
      : false;

  const title = mode === 'week'
    ? (isCurrent ? 'This Week' : `Week of ${format(startOfWeek(anchor, WEEK_OPTS), 'MMM d')}`)
    : mode === 'month'
      ? (isCurrent ? 'This Month' : format(anchor, 'MMMM yyyy'))
      : 'Custom Range';
  const subtitle = range
    ? `${format(range.start, 'MMM d')} – ${format(addDays(range.end, -1), 'MMM d, yyyy')}`
    : 'Pick a start and end date';

  const step = dir => setAnchor(a => (mode === 'week' ? addWeeks(a, dir) : addMonths(a, dir)));

  const dateOf = l =>
    new Date((by === 'delivery' ? l.delivery?.scheduledTime : l.pickup?.scheduledTime) || l.createdAt);

  const revenue = loads.reduce((s, l) => s + (l.rate || 0), 0);
  const miles = loads.reduce((s, l) => s + (l.miles || 0), 0);
  const unpaid = loads.filter(l => l.status !== 'Paid').reduce((s, l) => s + (l.rate || 0), 0);

  const chart = range ? buildBuckets(loads, range.start, range.end, mode, dateOf) : [];

  const driverMap = {};
  loads.forEach(l => {
    const key = l.driver?._id || 'none';
    if (!driverMap[key]) driverMap[key] = { name: l.driver?.name || 'Unassigned', loads: 0, miles: 0, revenue: 0 };
    driverMap[key].loads += 1;
    driverMap[key].miles += l.miles || 0;
    driverMap[key].revenue += l.rate || 0;
  });
  const byDriver = Object.values(driverMap).sort((a, b) => b.revenue - a.revenue);
  const showDrivers = !driver && byDriver.length > 0;

  const kpis = [
    { label: 'Revenue', value: money(revenue), color: 'orange' },
    { label: 'Loads', value: loads.length, color: 'blue' },
    { label: 'Miles', value: miles.toLocaleString(), color: 'green' },
    { label: 'Rev / Mile', value: miles ? `$${(revenue / miles).toFixed(2)}` : '—', color: 'purple' },
    { label: 'Avg Rate', value: loads.length ? money(revenue / loads.length) : '—', color: 'blue' },
    { label: 'Unpaid', value: money(unpaid), color: 'orange' },
  ];

  const sel = { width: 'auto', minWidth: 130, padding: '6px 10px', fontSize: 13 };

  return (
    <div style={{ marginBottom: 24 }}>
      {/* Title + period controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 10 }}>
        <div>
          <div style={{ fontSize: 17, fontWeight: 700 }}>{title}</div>
          <div style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 2 }}>{subtitle}</div>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          {[['week', 'Week'], ['month', 'Month'], ['custom', 'Custom']].map(([m, label]) => (
            <button key={m} className={`btn btn-sm ${mode === m ? 'btn-primary' : 'btn-secondary'}`} onClick={() => { setMode(m); setAnchor(new Date()); }}>{label}</button>
          ))}
          {mode !== 'custom' && (
            <>
              <button className="btn btn-secondary btn-sm" aria-label="Previous" onClick={() => step(-1)}><ChevronLeft size={15} /></button>
              <button className="btn btn-secondary btn-sm" onClick={() => setAnchor(new Date())} disabled={isCurrent}>{mode === 'week' ? 'This week' : 'This month'}</button>
              <button className="btn btn-secondary btn-sm" aria-label="Next" onClick={() => step(1)}><ChevronRight size={15} /></button>
            </>
          )}
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 14 }}>
        {mode === 'custom' && (
          <>
            <input type="date" className="form-control" style={{ ...sel, minWidth: 140 }} value={from} onChange={e => setFrom(e.target.value)} />
            <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>to</span>
            <input type="date" className="form-control" style={{ ...sel, minWidth: 140 }} value={to} onChange={e => setTo(e.target.value)} />
          </>
        )}
        <select className="form-control" style={sel} value={driver} onChange={e => setDriver(e.target.value)}>
          <option value="">All drivers</option>
          {drivers.map(d => <option key={d._id} value={d._id}>{d.name}</option>)}
          <option value="none">Unassigned</option>
        </select>
        <select className="form-control" style={sel} value={status} onChange={e => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          <option value="unpaid">Unpaid (not Paid)</option>
          {STATUS_OPTS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select className="form-control" style={sel} value={by} onChange={e => setBy(e.target.value)}>
          <option value="pickup">By pickup date</option>
          <option value="delivery">By delivery date</option>
        </select>
        {(driver || status) && (
          <button className="btn btn-ghost btn-sm" onClick={() => { setDriver(''); setStatus(''); }}>Clear filters</button>
        )}
      </div>

      {!range ? (
        <div className="card" style={{ color: 'var(--text-muted)', fontSize: 13 }}>Choose a start date that is on or before the end date.</div>
      ) : error ? (
        <div className="card" style={{ color: 'var(--text-muted)', fontSize: 13 }}>Could not load this period. Try again.</div>
      ) : loading ? (
        <div className="card" style={{ display: 'flex', justifyContent: 'center', padding: 30 }}><div className="spinner" /></div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(6, 1fr)', gap: isMobile ? 10 : 14, marginBottom: 14 }}>
            {kpis.map(k => (
              <div key={k.label} className={`stat-card ${k.color}`}>
                <div className="stat-label">{k.label}</div>
                <div className="stat-value" style={{ fontSize: isMobile ? 18 : 22 }}>{k.value}</div>
              </div>
            ))}
          </div>

          {loads.length === 0 ? (
            <div className="card" style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center' }}>No loads in this period</div>
          ) : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile || !showDrivers ? '1fr' : '1fr 280px', gap: 14, marginBottom: 14 }}>
                <div className="card" style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 600, marginBottom: 12, fontSize: 14 }}>Revenue by {differenceInCalendarDays(range.end, range.start) > 45 ? 'Week' : 'Day'}</div>
                  <ResponsiveContainer width="100%" height={170}>
                    <BarChart data={chart}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="day" stroke="var(--text-muted)" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                      <YAxis stroke="var(--text-muted)" tick={{ fontSize: 11 }} tickFormatter={v => `$${v}`} width={52} />
                      <Tooltip
                        formatter={v => [money(v), 'Revenue']}
                        contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13 }}
                      />
                      <Bar dataKey="Revenue" fill="var(--accent)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {showDrivers && (
                  <div className="card">
                    <div style={{ fontWeight: 600, marginBottom: 14, fontSize: 14 }}>By Driver</div>
                    {byDriver.map(d => (
                      <div key={d.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.name}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                            {d.loads} load{d.loads > 1 ? 's' : ''} · {d.miles.toLocaleString()} mi{d.miles ? ` · $${(d.revenue / d.miles).toFixed(2)}/mi` : ''}
                          </div>
                        </div>
                        <span style={{ color: 'var(--green)', fontWeight: 600, fontSize: 13, flexShrink: 0, marginLeft: 8 }}>{money(d.revenue)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <button className="btn btn-secondary btn-sm" onClick={() => setShowLoads(v => !v)} style={{ marginBottom: showLoads ? 10 : 0 }}>
                {showLoads ? 'Hide loads' : `Show the ${loads.length} load${loads.length > 1 ? 's' : ''}`}
              </button>
              {showLoads && (
                <div className="card" style={{ padding: 0 }}>
                  <div className="table-container">
                    <table>
                      <thead>
                        <tr><th>{by === 'delivery' ? 'Delivery' : 'Pickup'}</th><th>Load #</th><th>Route</th><th>Driver</th><th>Miles</th><th>Rate</th><th>$/Mile</th><th>Status</th></tr>
                      </thead>
                      <tbody>
                        {loads.map(l => (
                          <tr key={l._id}>
                            <td>{format(dateOf(l), 'EEE MMM d')}</td>
                            <td><Link to={`/loads/${l._id}`} className="mono" style={{ color: 'var(--accent)', fontWeight: 600 }}>{l.loadNumber}</Link></td>
                            <td>{l.pickup?.city || '—'} → {l.delivery?.city || '—'}</td>
                            <td>{l.driver?.name || '—'}</td>
                            <td>{l.miles ? l.miles.toLocaleString() : '—'}</td>
                            <td>{money(l.rate)}</td>
                            <td>{l.miles ? `$${(l.rate / l.miles).toFixed(2)}` : '—'}</td>
                            <td><StatusBadge status={l.status} /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
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

      {/* Work summary: week / month / custom, with filters */}
      <WorkSummary isMobile={isMobile} />

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
