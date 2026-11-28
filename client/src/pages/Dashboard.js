import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { analyticsApi } from '../utils/api';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import CountUp from '../components/CountUp';
import { format, parse, startOfDay, startOfWeek, startOfMonth, addDays, addWeeks, addMonths } from 'date-fns';
import DateTimePicker from '../components/DateTimePicker';

function StatusBadge({ status }) {
  const map = { 'Pending': 'badge-pending', 'In Transit': 'badge-transit', 'Delivered': 'badge-delivered', 'Invoiced': 'badge-invoiced', 'Paid': 'badge-paid' };
  return <span className={`badge ${map[status] || ''}`}>{status}</span>;
}

// Gold trend line: running total of revenue across the period, one point per day
function Sparkline({ loads, start, end, dateOf }) {
  const days = Math.max(1, Math.round((end - start) / 86400000));
  const perDay = new Array(days).fill(0);
  loads.forEach(l => {
    const i = Math.floor((startOfDay(dateOf(l)) - start) / 86400000);
    if (i >= 0 && i < days) perDay[i] += l.rate || 0;
  });
  let run = 0;
  const pts = perDay.map(v => (run += v));
  const max = run || 1;
  const W = 300, H = 60;
  const xy = pts.map((v, i) => [days === 1 ? W : (i / (days - 1)) * W, H - 4 - (v / max) * (H - 10)]);
  const line = xy.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
  return (
    <svg className="hero-spark" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id="heroSparkFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--accent)" stopOpacity="0.32" />
          <stop offset="1" stopColor="var(--accent)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${line} L${W} ${H} L0 ${H} Z`} fill="url(#heroSparkFill)" />
      <path d={line} fill="none" stroke="var(--accent)" strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
    </svg>
  );
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

// Totals + filtered loads for a week / month / custom range
function WorkSummary({ isMobile }) {
  const navigate = useNavigate();
  const [mode, setMode] = useState('week'); // 'week' | 'month' | 'custom'
  const [anchor, setAnchor] = useState(() => new Date());
  const [from, setFrom] = useState(() => format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [to, setTo] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [loads, setLoads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const range = rangeFor(mode, anchor, from, to);
  const startMs = range ? range.start.getTime() : 0;
  const endMs = range ? range.end.getTime() : 0;

  useEffect(() => {
    if (!range) { setLoads([]); setLoading(false); setError(false); return; }
    let cancelled = false;
    setLoading(true);
    setError(false);
    analyticsApi.getRange({ start: range.start.toISOString(), end: range.end.toISOString(), by: 'pickup' })
      .then(res => { if (!cancelled) setLoads(res.data.loads || []); })
      .catch(() => { if (!cancelled) setError(true); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [startMs, endMs]);

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

  const dateOf = l => new Date(l.pickup?.scheduledTime || l.createdAt);

  const sorted = [...loads].sort((a, b) => dateOf(b) - dateOf(a)); // newest first
  const revenue = loads.reduce((s, l) => s + (l.rate || 0), 0);
  const miles = loads.reduce((s, l) => s + (l.miles || 0), 0);
  const unpaid = loads.filter(l => l.status !== 'Paid').reduce((s, l) => s + (l.rate || 0), 0);
  const milesRevenue = loads.filter(l => l.miles > 0).reduce((s, l) => s + (l.rate || 0), 0); // loads with unknown miles don't skew $/mile

  const kpis = [
    { label: 'Loads', value: loads.length, color: 'blue' },
    { label: 'Miles', value: miles.toLocaleString(), color: 'green' },
    { label: 'Rev / Mile', value: miles ? `$${(milesRevenue / miles).toFixed(2)}` : '—', color: 'purple' },
    { label: 'Avg Rate', value: loads.length ? money(revenue / loads.length) : '—', color: 'blue' },
  ];

  return (
    <div style={{ marginBottom: 36 }}>
      {/* Title + period controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 16, marginBottom: 20 }}>
        <div>
          <div className="serif" style={{ fontSize: isMobile ? 28 : 34, lineHeight: 1 }}>{title}</div>
          <div style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 8 }}>{subtitle}</div>
        </div>
        <div className="period-controls" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <div className="period-group" style={{ display: 'flex', gap: 6 }}>
            {[['week', 'Week'], ['month', 'Month'], ['custom', 'Custom']].map(([m, label]) => (
              <button key={m} className={`btn btn-sm ${mode === m ? 'btn-primary' : 'btn-secondary'}`} onClick={() => { setMode(m); setAnchor(new Date()); }}>{label}</button>
            ))}
          </div>
          {mode !== 'custom' && (
            <div className="period-group" style={{ display: 'flex', gap: 6 }}>
              <button className="btn btn-secondary btn-sm btn-icon" aria-label="Previous" onClick={() => step(-1)}><ChevronLeft size={16} /></button>
              <button className="btn btn-secondary btn-sm" onClick={() => setAnchor(new Date())} disabled={isCurrent}>{mode === 'week' ? 'This week' : 'This month'}</button>
              <button className="btn btn-secondary btn-sm btn-icon" aria-label="Next" onClick={() => step(1)}><ChevronRight size={16} /></button>
            </div>
          )}
        </div>
      </div>

      {/* Custom range pickers */}
      {mode === 'custom' && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 14 }}>
          <DateTimePicker mode="date" compact clearable={false} value={from} onChange={setFrom} placeholder="From" />
          <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>to</span>
          <DateTimePicker mode="date" compact clearable={false} value={to} onChange={setTo} placeholder="To" />
        </div>
      )}

      {!range ? (
        <div className="card" style={{ color: 'var(--text-muted)', fontSize: 13 }}>Choose a start date that is on or before the end date.</div>
      ) : error ? (
        <div className="card" style={{ color: 'var(--text-muted)', fontSize: 13 }}>Could not load this period. Try again.</div>
      ) : loading ? (
        <div className="card" style={{ display: 'flex', justifyContent: 'center', padding: 30 }}><div className="spinner" /></div>
      ) : (
        <>
          {/* Totals for the selection */}
          <div className="stagger" style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, minmax(0, 1fr))', gap: isMobile ? 10 : 14, marginBottom: 16 }}>
            <div className="stat-card hero">
              <div>
                <div className="stat-label">Revenue</div>
                <div className="stat-value" style={{ fontSize: isMobile ? 40 : 60 }}><CountUp value={money(revenue)} /></div>
              </div>
              <div>
                <Sparkline loads={loads} start={range.start} end={range.end} dateOf={dateOf} />
                <div className="hero-foot">
                  <span>Unpaid <strong>{money(unpaid)}</strong></span>
                  <span>{loads.length} load{loads.length === 1 ? '' : 's'}</span>
                </div>
              </div>
            </div>
            {kpis.map(k => (
              <div key={k.label} className={`stat-card ${k.color}`}>
                <div className="stat-label">{k.label}</div>
                <div className="stat-value" style={{ fontSize: isMobile ? 26 : 34 }}><CountUp value={k.value} /></div>
              </div>
            ))}
          </div>

          {/* Loads for the selection */}
          <div className="card" style={{ padding: 0, minWidth: 0 }}>
            <div className="card-head" style={{ padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', fontSize: 17, fontWeight: 600, letterSpacing: '-0.01em', alignItems: 'baseline', gap: 10 }}>
                Loads
                <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-sans)', fontSize: 13 }}>{sorted.length}</span>
              </div>
              <Link to="/loads" className="btn btn-ghost btn-sm">View all →</Link>
            </div>

            {isMobile ? (
              <div style={{ padding: 10 }}>
                {sorted.length === 0 ? (
                  <div className="empty-state"><p>No loads in this period</p></div>
                ) : sorted.map(load => (
                  <div
                    key={load._id}
                    onClick={() => navigate(`/loads/${load._id}`)}
                    className="pill-row clickable"
                    style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span className="mono" style={{ color: 'var(--accent)', fontSize: 13, fontWeight: 600 }}>{load.loadNumber}</span>
                        <StatusBadge status={load.status} />
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {load.pickup?.city || '—'}{load.delivery?.city ? ` → ${load.delivery.city}` : ''}
                      </div>
                      <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 2 }}>
                        {format(dateOf(load), 'EEE MMM d')}{load.miles ? ` · ${load.miles.toLocaleString()} mi` : ''}{load.driver?.name ? ` · ${load.driver.name}` : ''}{load.broker?.name ? ` · ${load.broker.name}` : ''}
                      </div>
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
                      <th>Pickup</th>
                      <th>Load #</th>
                      <th>Driver</th>
                      <th>Broker</th>
                      <th>Route</th>
                      <th>Miles</th>
                      <th>Rate</th>
                      <th>$/Mile</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sorted.length === 0 ? (
                      <tr><td colSpan={9} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No loads in this period</td></tr>
                    ) : sorted.map(load => (
                      <tr key={load._id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/loads/${load._id}`)}>
                        <td style={{ whiteSpace: 'nowrap' }}>{format(dateOf(load), 'EEE MMM d')}</td>
                        <td><span className="mono" style={{ color: 'var(--accent)' }}>{load.loadNumber}</span></td>
                        <td>{load.driver?.name || '—'}</td>
                        <td>{load.broker?.name || '—'}</td>
                        <td style={{ fontSize: 13 }}>
                          {load.pickup?.city || '—'}
                          {load.delivery?.city ? <span style={{ color: 'var(--text-muted)' }}> → {load.delivery.city}</span> : ''}
                        </td>
                        <td>{load.miles ? load.miles.toLocaleString() : '—'}</td>
                        <td style={{ color: 'var(--green)', fontWeight: 600 }}>${(load.rate || 0).toLocaleString()}</td>
                        <td>{load.miles ? `$${(load.rate / load.miles).toFixed(2)}` : '—'}</td>
                        <td><StatusBadge status={load.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default function Dashboard() {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const isMobile = useIsMobile();

  useEffect(() => {
    analyticsApi.getSummary()
      .then(res => setAnalytics(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="page-loader"><div className="spinner" /></div>;

  const now = new Date();
  const greeting = now.getHours() < 12 ? 'Good morning' : now.getHours() < 17 ? 'Good afternoon' : 'Good evening';
  // Counts every delivered load, not just the most recent few
  const pendingInvoice = (analytics?.statusBreakdown || []).find(s => s._id === 'Delivered')?.count || 0;

  return (
    <div className="page-enter">
      {/* Header */}
      <div style={{ marginBottom: 32, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div className="eyebrow">{format(now, 'EEEE, MMMM d, yyyy')}</div>
        <h1 className="serif" style={{ fontSize: isMobile ? 42 : 56, lineHeight: 1 }}>
          {greeting}<span style={{ fontStyle: 'italic', color: 'var(--accent)' }}>.</span>
        </h1>
      </div>

      {/* Alert */}
      {pendingInvoice > 0 && (
        <div style={{
          background: 'var(--accent-dim)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius)', padding: '16px 22px',
          marginBottom: 32, display: 'flex', alignItems: 'center', gap: 14,
          fontSize: 13.5, color: 'var(--text-primary)', flexWrap: 'wrap',
        }}>
          <span className="pulse-dot" style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--accent)', flexShrink: 0 }} />
          <span><strong style={{ fontWeight: 600 }}>{pendingInvoice} load{pendingInvoice > 1 ? 's' : ''}</strong> delivered and awaiting invoice</span>
          <Link to="/loads?status=Delivered" style={{ marginLeft: 'auto', color: 'var(--accent)', fontWeight: 500, whiteSpace: 'nowrap' }}>Review now →</Link>
        </div>
      )}

      {/* Week / month / custom summary, filters and loads */}
      <WorkSummary isMobile={isMobile} />

      {/* Status + top drivers (all time) */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 14 }}>
        <div className="card">
          <div style={{ marginBottom: 16, fontSize: 17, fontWeight: 600, letterSpacing: '-0.01em', lineHeight: 1.2 }}>Load Status</div>
          {(analytics?.statusBreakdown || []).map(s => (
            <div key={s._id} className="pill-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <StatusBadge status={s._id} />
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ fontWeight: 600, fontSize: 14 }}>{s.count}</span>
                <span style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>${(s.revenue || 0).toLocaleString()}</span>
              </div>
            </div>
          ))}
          {!analytics?.statusBreakdown?.length && <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No data yet</p>}
        </div>

        <div className="card">
          <div style={{ marginBottom: 16, fontSize: 17, fontWeight: 600, letterSpacing: '-0.01em', lineHeight: 1.2 }}>Top Drivers</div>
          {(analytics?.topDrivers || []).slice(0, 4).map(d => (
            <div key={d._id} className="pill-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.name}</div>
                <div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>{d.loads} loads · {(d.miles || 0).toLocaleString()} mi</div>
              </div>
              <span style={{ color: 'var(--green)', fontWeight: 600, fontSize: 13, flexShrink: 0, marginLeft: 8 }}>${(d.revenue || 0).toLocaleString()}</span>
            </div>
          ))}
          {!analytics?.topDrivers?.length && <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No data yet</p>}
        </div>
      </div>
    </div>
  );
}
