import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { analyticsApi, driversApi, brokersApi } from '../utils/api';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Download } from 'lucide-react';
import {
  format, parse, startOfDay, startOfWeek, startOfMonth, startOfYear,
  addDays, addMonths, addYears, differenceInCalendarDays,
} from 'date-fns';

const WEEK_OPTS = { weekStartsOn: 1 }; // 1 = Monday, change to 0 for Sunday
const ALL_START = new Date(2000, 0, 1);
const ALL_END = new Date(2100, 0, 1);
const STATUS_OPTS = ['Pending', 'In Transit', 'Delivered', 'Invoiced', 'Paid'];

const money = n => `$${Math.round(n || 0).toLocaleString()}`;
const rpmText = v => (v == null ? '—' : `$${v.toFixed(2)}`);

const PRESETS = [
  ['thisWeek', 'This week'], ['lastWeek', 'Last week'],
  ['thisMonth', 'This month'], ['lastMonth', 'Last month'],
  ['last30', 'Last 30 days'], ['last90', 'Last 90 days'],
  ['thisYear', 'This year'], ['all', 'All time'], ['custom', 'Custom range'],
];

// ---------- Period + the period right before it (for comparisons) ----------
function getPeriod(preset, from, to, now) {
  const tomorrow = addDays(startOfDay(now), 1);
  let start, end, prevStart, prevEnd, prevLabel;

  if (preset === 'thisWeek') {
    start = startOfWeek(now, WEEK_OPTS); end = addDays(start, 7);
    prevStart = addDays(start, -7); prevEnd = start; prevLabel = 'last week';
  } else if (preset === 'lastWeek') {
    end = startOfWeek(now, WEEK_OPTS); start = addDays(end, -7);
    prevStart = addDays(start, -7); prevEnd = start; prevLabel = 'the week before';
  } else if (preset === 'thisMonth') {
    start = startOfMonth(now); end = addMonths(start, 1);
    prevStart = addMonths(start, -1); prevEnd = start; prevLabel = 'last month';
  } else if (preset === 'lastMonth') {
    end = startOfMonth(now); start = addMonths(end, -1);
    prevStart = addMonths(start, -1); prevEnd = start; prevLabel = 'the month before';
  } else if (preset === 'last30' || preset === 'last90') {
    const n = preset === 'last30' ? 30 : 90;
    end = tomorrow; start = addDays(end, -n);
    prevStart = addDays(start, -n); prevEnd = start; prevLabel = `the previous ${n} days`;
  } else if (preset === 'thisYear') {
    start = startOfYear(now); end = addYears(start, 1);
    prevStart = addYears(start, -1); prevEnd = start; prevLabel = 'last year';
  } else if (preset === 'all') {
    return { start: ALL_START, end: ALL_END, prev: null, prevLabel: '', complete: true };
  } else {
    const f = parse(from, 'yyyy-MM-dd', new Date());
    const t = parse(to, 'yyyy-MM-dd', new Date());
    if (isNaN(f) || isNaN(t) || f > t) return null;
    start = startOfDay(f); end = addDays(startOfDay(t), 1);
    const len = differenceInCalendarDays(end, start);
    prevStart = addDays(start, -len); prevEnd = start; prevLabel = 'the previous period';
  }
  // "complete" = the period is over, so comparing totals is fair
  return { start, end, prev: { start: prevStart, end: prevEnd }, prevLabel, complete: end <= tomorrow };
}

// ---------- Number crunching ----------
function summarize(list) {
  const revenue = list.reduce((s, l) => s + (l.rate || 0), 0);
  const miles = list.reduce((s, l) => s + (l.miles || 0), 0);
  const unpaid = list.filter(l => l.status !== 'Paid').reduce((s, l) => s + (l.rate || 0), 0);
  // $/mile only counts loads that have miles, so a load with unknown miles can't inflate it
  const milesRevenue = list.filter(l => l.miles > 0).reduce((s, l) => s + (l.rate || 0), 0);
  return {
    revenue, loads: list.length, miles, unpaid,
    rpm: miles ? milesRevenue / miles : null,
    avg: list.length ? revenue / list.length : null,
  };
}

function groupRows(list, keyOf, nameOf) {
  const map = new Map();
  list.forEach(l => {
    const key = keyOf(l);
    if (key == null) return;
    if (!map.has(key)) map.set(key, { key, name: nameOf(l), loads: 0, miles: 0, revenue: 0, milesRevenue: 0, unpaid: 0 });
    const r = map.get(key);
    r.loads += 1;
    r.miles += l.miles || 0;
    r.revenue += l.rate || 0;
    if (l.miles > 0) r.milesRevenue += l.rate || 0;
    if (l.status !== 'Paid') r.unpaid += l.rate || 0;
  });
  return [...map.values()].map(r => ({
    ...r,
    rpm: r.miles ? r.milesRevenue / r.miles : null,
    avg: r.loads ? r.revenue / r.loads : 0,
  }));
}

const place = p => [p?.city, p?.state].filter(Boolean).join(', ');
const laneKey = l => (l.pickup?.city && l.delivery?.city ? `${place(l.pickup)}|${place(l.delivery)}`.toUpperCase() : null);

// Revenue per day / week / month, depending on how long the range is
function buildSeries(loads, start, end, dateOf) {
  const days = differenceInCalendarDays(end, start);
  const unit = days <= 45 ? 'day' : days <= 200 ? 'week' : 'month';
  const buckets = [];
  if (unit === 'month') {
    for (let s = startOfMonth(start); s < end; s = addMonths(s, 1)) {
      const e = addMonths(s, 1);
      buckets.push({ s, e, label: format(s, 'MMM yy'), title: format(s, 'MMMM yyyy') });
    }
  } else {
    const step = unit === 'week' ? 7 : 1;
    for (let i = 0; i < days; i += step) {
      const s = addDays(start, i);
      const e = addDays(start, Math.min(i + step, days));
      const label = unit === 'week' ? format(s, 'M/d') : days <= 7 ? format(s, 'EEE') : days <= 31 ? format(s, 'd') : format(s, 'M/d');
      const title = unit === 'week' ? `${format(s, 'MMM d')} – ${format(addDays(e, -1), 'MMM d')}` : format(s, 'EEE, MMM d');
      buckets.push({ s, e, label, title });
    }
  }
  const rows = buckets.map(b => ({ ...b, revenue: 0, loads: 0, miles: 0 }));
  loads.forEach(l => {
    const d = dateOf(l);
    const b = rows.find(x => d >= x.s && d < x.e);
    if (b) { b.revenue += l.rate || 0; b.loads += 1; b.miles += l.miles || 0; }
  });
  return rows.map(({ label, title, revenue, loads: n, miles }) => ({ label, title, revenue, loads: n, miles }));
}

// Days since the load was invoiced (or delivered)
function ageDays(l) {
  const ref = l.invoiceDate || l.delivery?.actualTime || l.delivery?.scheduledTime || l.createdAt;
  return Math.max(0, differenceInCalendarDays(new Date(), new Date(ref)));
}
const AGE_BUCKETS = [['0–14 days', 0, 14], ['15–30 days', 15, 30], ['31–45 days', 31, 45], ['46+ days', 46, Infinity]];

// ---------- CSV ----------
function downloadCsv(filename, rows) {
  const esc = v => {
    let s = String(v ?? '');
    if (typeof v === 'string' && /^[=+\-@\t\r]/.test(s)) s = `'${s}`; // stop spreadsheet formulas
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = '\uFEFF' + rows.map(r => r.map(esc).join(',')).join('\r\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}

// ---------- Small components ----------
function StatusBadge({ status }) {
  const map = { 'Pending': 'badge-pending', 'In Transit': 'badge-transit', 'Delivered': 'badge-delivered', 'Invoiced': 'badge-invoiced', 'Paid': 'badge-paid' };
  return <span className={`badge ${map[status] || ''}`}>{status}</span>;
}

function Field({ label, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span style={{ fontSize: 12.5, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</span>
      {children}
    </div>
  );
}

const ctl = { width: 'auto', minWidth: 140, padding: '7px 10px', fontSize: 13 };

function Delta({ cur, prev, fmt, label, complete, invert }) {
  if (prev == null || cur == null) return <div className="stat-sub">&nbsp;</div>;
  if (!complete) return <div className="stat-sub">{label}: {fmt(prev)}</div>;
  if (prev === 0) return <div className="stat-sub">{cur === 0 ? 'no change' : `new vs ${label}`}</div>;
  const change = Math.round(((cur - prev) / Math.abs(prev)) * 100);
  const up = change > 0;
  const flat = change === 0;
  const good = invert ? !up : up;
  return (
    <div className="stat-sub" style={{ color: flat ? 'var(--text-muted)' : good ? 'var(--green)' : 'var(--red)', fontWeight: 600 }}>
      {flat ? '▬' : up ? '▲' : '▼'} {Math.abs(change)}%{' '}
      <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>vs {label}</span>
    </div>
  );
}

function ChartTip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', fontSize: 13 }}>
      <div style={{ color: 'var(--text-muted)', marginBottom: 4 }}>{d.title}</div>
      <div style={{ fontWeight: 700, color: 'var(--accent)' }}>{money(d.revenue)}</div>
      <div style={{ color: 'var(--text-secondary)' }}>
        {d.loads} load{d.loads === 1 ? '' : 's'} · {d.miles.toLocaleString()} mi{d.miles ? ` · $${(d.revenue / d.miles).toFixed(2)}/mi` : ''}
      </div>
    </div>
  );
}

// Table you can sort by clicking a column heading
function DataTable({ columns, rows, initialKey, limit = 10, onRowClick }) {
  const [sort, setSort] = useState({ key: initialKey, dir: 'desc' });
  const [all, setAll] = useState(false);

  const sorted = [...rows].sort((a, b) => {
    const av = a[sort.key];
    const bv = b[sort.key];
    const cmp = typeof av === 'string' ? av.localeCompare(bv) : (av ?? -Infinity) - (bv ?? -Infinity);
    return sort.dir === 'asc' ? cmp : -cmp;
  });
  const shown = all ? sorted : sorted.slice(0, limit);

  const clickHead = key => setSort(s => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: key === 'name' ? 'asc' : 'desc' }));

  return (
    <>
      <div className="table-container">
        <table>
          <thead>
            <tr>
              {columns.map(c => (
                <th key={c.key} onClick={() => clickHead(c.key)} style={{ cursor: 'pointer', whiteSpace: 'nowrap', userSelect: 'none' }}>
                  {c.label}{sort.key === c.key ? (sort.dir === 'asc' ? ' ▲' : ' ▼') : ''}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shown.map(r => (
              <tr key={r.key} style={onRowClick ? { cursor: 'pointer' } : undefined} onClick={onRowClick ? () => onRowClick(r) : undefined}>
                {columns.map(c => <td key={c.key}>{c.render ? c.render(r) : r[c.key]}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length > limit && (
        <div style={{ padding: '10px 16px', borderTop: '1px solid var(--border)' }}>
          <button className="btn btn-ghost btn-sm" onClick={() => setAll(v => !v)}>{all ? `Show top ${limit}` : `Show all ${rows.length}`}</button>
        </div>
      )}
    </>
  );
}

function Section({ title, note, children }) {
  return (
    <div className="card" style={{ padding: 0, minWidth: 0 }}>
      <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ fontWeight: 600, fontSize: 15 }}>{title}</div>
        {note && <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>{note}</div>}
      </div>
      {children}
    </div>
  );
}

// ---------- Page ----------
export default function Analytics() {
  const navigate = useNavigate();
  const [preset, setPreset] = useState('thisMonth');
  const [from, setFrom] = useState(() => format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [to, setTo] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [by, setBy] = useState('pickup');
  const [driver, setDriver] = useState('');
  const [broker, setBroker] = useState('');
  const [status, setStatus] = useState('');
  const [drivers, setDrivers] = useState([]);
  const [brokers, setBrokers] = useState([]);
  const [data, setData] = useState({ loads: [], prev: null });
  const [owed, setOwed] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState(false);

  const period = getPeriod(preset, from, to, new Date());
  const startMs = period ? period.start.getTime() : 0;
  const endMs = period ? period.end.getTime() : 0;

  useEffect(() => {
    driversApi.getAll().then(r => setDrivers(r.data || [])).catch(() => {});
    brokersApi.getAll().then(r => setBrokers(r.data || [])).catch(() => {});
  }, []);

  // Loads for the chosen period, plus the period before it for comparison
  useEffect(() => {
    if (!period) { setData({ loads: [], prev: null }); setLoading(false); setError(false); return; }
    let cancelled = false;
    setFetching(true);
    setError(false);
    const q = r => analyticsApi.getRange({ start: r.start.toISOString(), end: r.end.toISOString(), by, driver, broker, status });
    Promise.all([q(period), period.prev ? q(period.prev).catch(() => null) : Promise.resolve(null)])
      .then(([cur, prev]) => {
        if (!cancelled) setData({ loads: cur.data.loads || [], prev: prev ? (prev.data.loads || []) : null });
      })
      .catch(() => { if (!cancelled) setError(true); })
      .finally(() => { if (!cancelled) { setLoading(false); setFetching(false); } });
    return () => { cancelled = true; };
  }, [startMs, endMs, by, driver, broker, status]);

  // Money still owed to you, regardless of the period (but respecting driver / broker)
  useEffect(() => {
    let cancelled = false;
    analyticsApi.getRange({ start: ALL_START.toISOString(), end: ALL_END.toISOString(), by: 'pickup', driver, broker, status: 'owed' })
      .then(r => { if (!cancelled) setOwed(r.data.loads || []); })
      .catch(() => { if (!cancelled) setOwed([]); });
    return () => { cancelled = true; };
  }, [driver, broker]);

  if (loading) return <div className="page-loader"><div className="spinner" /></div>;

  const { loads, prev } = data;
  const dateOf = l => new Date((by === 'delivery' ? l.delivery?.scheduledTime : l.pickup?.scheduledTime) || l.createdAt);
  const cur = summarize(loads);
  const prevSum = prev ? summarize(prev) : null;
  const filtersActive = !!(driver || broker || status);

  const kpis = [
    { label: 'Revenue', key: 'revenue', fmt: money, color: 'orange' },
    { label: 'Loads', key: 'loads', fmt: v => v, color: 'blue' },
    { label: 'Miles', key: 'miles', fmt: v => v.toLocaleString(), color: 'green' },
    { label: 'Rev / Mile', key: 'rpm', fmt: rpmText, color: 'purple' },
    { label: 'Avg Rate', key: 'avg', fmt: v => (v == null ? '—' : money(v)), color: 'blue' },
    { label: 'Unpaid', key: 'unpaid', fmt: money, color: 'orange', invert: true, hint: 'Loads in this period not yet marked Paid (includes loads not yet delivered)' },
  ];

  // Chart
  let series = [];
  if (period && loads.length) {
    let cs = period.start;
    let ce = period.end;
    if (preset === 'all') {
      const ds = loads.map(dateOf);
      cs = startOfMonth(new Date(Math.min(...ds)));
      ce = addMonths(startOfMonth(new Date(Math.max(...ds))), 1);
    }
    series = buildSeries(loads, cs, ce, dateOf);
  }

  // Breakdowns
  const driverRows = groupRows(loads, l => l.driver?._id || 'none', l => l.driver?.name || 'Unassigned');
  const brokerRows = groupRows(loads, l => l.broker?._id || 'none', l => l.broker?.name || 'No broker');
  const laneRows = groupRows(loads, laneKey, l => `${place(l.pickup)} → ${place(l.delivery)}`);
  const showDrivers = !driver && driverRows.length > 0;
  const showBrokers = !broker && brokerRows.length > 0;

  // Waiting to get paid
  const owedRows = owed.map(l => ({
    key: l._id, id: l._id, name: l.loadNumber, broker: l.broker?.name || '—', driver: l.driver?.name || '—',
    status: l.status, days: ageDays(l), amount: l.rate || 0,
  }));
  const owedTotal = owedRows.reduce((s, r) => s + r.amount, 0);

  const subtitle = !period ? 'Pick a start and end date' : [
    preset === 'all' ? 'All dates' : `${format(period.start, 'MMM d, yyyy')} – ${format(addDays(period.end, -1), 'MMM d, yyyy')}`,
    by === 'delivery' ? 'by delivery date' : 'by pickup date',
    driver ? `Driver: ${driver === 'none' ? 'Unassigned' : (drivers.find(d => d._id === driver)?.name || '…')}` : null,
    broker ? `Broker: ${broker === 'none' ? 'None' : (brokers.find(b => b._id === broker)?.name || '…')}` : null,
    status ? `Status: ${status === 'unpaid' ? 'Unpaid' : status}` : null,
  ].filter(Boolean).join(' · ');

  const exportCsv = () => {
    const f = v => (v ? format(new Date(v), 'yyyy-MM-dd') : '');
    const rows = [['Load #', 'Pickup date', 'Delivery date', 'Driver', 'Broker', 'Pickup city', 'Pickup state', 'Delivery city', 'Delivery state', 'Miles', 'Rate', 'Rate per mile', 'Status']];
    [...loads].sort((a, b) => dateOf(a) - dateOf(b)).forEach(l => rows.push([
      l.loadNumber, f(l.pickup?.scheduledTime), f(l.delivery?.scheduledTime), l.driver?.name || '', l.broker?.name || '',
      l.pickup?.city || '', l.pickup?.state || '', l.delivery?.city || '', l.delivery?.state || '',
      l.miles || 0, l.rate || 0, l.miles ? (l.rate / l.miles).toFixed(2) : '', l.status,
    ]));
    const name = preset === 'all' ? 'loads_all.csv' : `loads_${format(period.start, 'yyyy-MM-dd')}_to_${format(addDays(period.end, -1), 'yyyy-MM-dd')}.csv`;
    downloadCsv(name, rows);
  };

  return (
    <div className="page-enter">
      <div className="page-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <div>
          <h1 className="section-title"><span className="accent">Analytics</span></h1>
          <div style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 2 }}>{subtitle}</div>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={exportCsv} disabled={!loads.length}>
          <Download size={14} /> Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: 16, padding: '14px 16px' }}>
        <div className="filter-row" style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <Field label="Period">
            <select className="form-control" style={ctl} value={preset} onChange={e => setPreset(e.target.value)}>
              {PRESETS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </Field>
          {preset === 'custom' && (
            <>
              <Field label="From"><input type="date" className="form-control" style={ctl} value={from} onChange={e => setFrom(e.target.value)} /></Field>
              <Field label="To"><input type="date" className="form-control" style={ctl} value={to} onChange={e => setTo(e.target.value)} /></Field>
            </>
          )}
          <Field label="Driver">
            <select className="form-control" style={ctl} value={driver} onChange={e => setDriver(e.target.value)}>
              <option value="">All drivers</option>
              {drivers.map(d => <option key={d._id} value={d._id}>{d.name}</option>)}
              <option value="none">Unassigned</option>
            </select>
          </Field>
          <Field label="Broker">
            <select className="form-control" style={ctl} value={broker} onChange={e => setBroker(e.target.value)}>
              <option value="">All brokers</option>
              {[...brokers].sort((a, b) => (a.name || '').localeCompare(b.name || '')).map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
              <option value="none">No broker</option>
            </select>
          </Field>
          <Field label="Status">
            <select className="form-control" style={ctl} value={status} onChange={e => setStatus(e.target.value)}>
              <option value="">All statuses</option>
              <option value="unpaid">Unpaid (not Paid)</option>
              {STATUS_OPTS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="Date basis">
            <select className="form-control" style={ctl} value={by} onChange={e => setBy(e.target.value)}>
              <option value="pickup">Pickup date</option>
              <option value="delivery">Delivery date</option>
            </select>
          </Field>
          {filtersActive && (
            <button className="btn btn-ghost btn-sm" onClick={() => { setDriver(''); setBroker(''); setStatus(''); }}>Clear filters</button>
          )}
        </div>
      </div>

      {!period ? (
        <div className="card" style={{ color: 'var(--text-muted)', fontSize: 14 }}>Choose a start date that is on or before the end date.</div>
      ) : error ? (
        <div className="card" style={{ color: 'var(--text-muted)', fontSize: 14 }}>Could not load analytics. Try again.</div>
      ) : (
        <div style={{ opacity: fetching ? 0.55 : 1, transition: 'opacity .15s' }}>
          {/* KPIs with comparison to the previous period */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 14, marginBottom: 20 }}>
            {kpis.map(k => (
              <div key={k.label} className={`stat-card ${k.color}`} title={k.hint}>
                <div className="stat-label">{k.label}</div>
                <div className="stat-value" style={{ fontSize: 32 }}>{k.fmt(cur[k.key])}</div>
                <Delta cur={cur[k.key]} prev={prevSum ? prevSum[k.key] : null} fmt={k.fmt} label={period.prevLabel} complete={period.complete} invert={k.invert} />
              </div>
            ))}
          </div>

          {loads.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 14, marginBottom: 20 }}>
              No loads match these filters.
            </div>
          ) : (
            <>
              <div className="card" style={{ marginBottom: 20 }}>
                <div style={{ marginBottom: 18, fontSize: 17, fontWeight: 600, letterSpacing: '-0.01em', lineHeight: 1.2 }}>Revenue over time</div>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={series}>
                    <CartesianGrid vertical={false} stroke="var(--border)" />
                    <XAxis dataKey="label" stroke="var(--text-muted)" tick={{ fontSize: 12.5 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                    <YAxis stroke="var(--text-muted)" tick={{ fontSize: 12.5 }} tickLine={false} axisLine={false} tickFormatter={v => (v >= 1000 ? `$${(v / 1000).toFixed(v % 1000 ? 1 : 0)}k` : `$${v}`)} width={52} />
                    <Tooltip content={<ChartTip />} cursor={{ fill: 'var(--accent-dim)' }} />
                    <Bar dataKey="revenue" fill="var(--accent)" radius={[6, 6, 0, 0]} maxBarSize={44} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {(showDrivers || showBrokers) && (
                <div className="analytics-grid" style={{ display: 'grid', gridTemplateColumns: showDrivers && showBrokers ? '1fr 1fr' : '1fr', gap: 20, marginBottom: 20 }}>
                  {showDrivers && (
                    <Section title="By driver" note="Click a heading to sort">
                      <DataTable
                        rows={driverRows}
                        initialKey="revenue"
                        columns={[
                          { key: 'name', label: 'Driver' },
                          { key: 'loads', label: 'Loads' },
                          { key: 'miles', label: 'Miles', render: r => r.miles.toLocaleString() },
                          { key: 'revenue', label: 'Revenue', render: r => <span style={{ color: 'var(--green)', fontWeight: 600 }}>{money(r.revenue)}</span> },
                          { key: 'rpm', label: '$/Mile', render: r => rpmText(r.rpm) },
                          { key: 'avg', label: 'Avg Rate', render: r => money(r.avg) },
                        ]}
                      />
                    </Section>
                  )}
                  {showBrokers && (
                    <Section title="By broker" note="Which brokers pay best, and who still owes you">
                      <DataTable
                        rows={brokerRows}
                        initialKey="revenue"
                        columns={[
                          { key: 'name', label: 'Broker' },
                          { key: 'loads', label: 'Loads' },
                          { key: 'revenue', label: 'Revenue', render: r => <span style={{ color: 'var(--green)', fontWeight: 600 }}>{money(r.revenue)}</span> },
                          { key: 'rpm', label: '$/Mile', render: r => rpmText(r.rpm) },
                          { key: 'avg', label: 'Avg Rate', render: r => money(r.avg) },
                          { key: 'unpaid', label: 'Unpaid', render: r => (r.unpaid ? <span style={{ color: 'var(--yellow)' }}>{money(r.unpaid)}</span> : '—') },
                        ]}
                      />
                    </Section>
                  )}
                </div>
              )}

              {laneRows.length > 0 && (
                <div style={{ marginBottom: 20 }}>
                  <Section title="Lanes" note="Pickup → delivery city pairs. Sort by $/Mile to see which lanes pay best.">
                    <DataTable
                      rows={laneRows}
                      initialKey="revenue"
                      columns={[
                        { key: 'name', label: 'Lane' },
                        { key: 'loads', label: 'Loads' },
                        { key: 'avg', label: 'Avg Rate', render: r => money(r.avg) },
                        { key: 'rpm', label: '$/Mile', render: r => rpmText(r.rpm) },
                        { key: 'revenue', label: 'Revenue', render: r => <span style={{ color: 'var(--green)', fontWeight: 600 }}>{money(r.revenue)}</span> },
                      ]}
                    />
                  </Section>
                </div>
              )}
            </>
          )}

          {/* Money still owed: independent of the period above */}
          <Section title="Waiting to get paid" note="Delivered or invoiced loads not yet marked Paid, across all dates. Days count from the invoice date, or delivery if not invoiced.">
            {owedRows.length === 0 ? (
              <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>Nothing outstanding. You're all caught up.</div>
            ) : (
              <>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', padding: '14px 16px', borderBottom: '1px solid var(--border)', alignItems: 'center' }}>
                  <div style={{ marginRight: 8 }}>
                    <div style={{ fontSize: 12.5, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Total owed</div>
                    <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--yellow)' }}>{money(owedTotal)}</div>
                  </div>
                  {AGE_BUCKETS.map(([label, lo, hi]) => {
                    const inB = owedRows.filter(r => r.days >= lo && r.days <= hi);
                    const amt = inB.reduce((s, r) => s + r.amount, 0);
                    return (
                      <div key={label} style={{ padding: '8px 12px', background: 'var(--bg-secondary)', borderRadius: 8, minWidth: 110, opacity: inB.length ? 1 : 0.5 }}>
                        <div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>{label}</div>
                        <div style={{ fontWeight: 700, fontSize: 15, color: lo >= 46 && inB.length ? 'var(--red)' : undefined }}>{money(amt)}</div>
                        <div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>{inB.length} load{inB.length === 1 ? '' : 's'}</div>
                      </div>
                    );
                  })}
                </div>
                <DataTable
                  rows={owedRows}
                  initialKey="days"
                  limit={10}
                  onRowClick={r => navigate(`/loads/${r.id}`)}
                  columns={[
                    { key: 'name', label: 'Load #', render: r => <span className="mono" style={{ color: 'var(--accent)' }}>{r.name}</span> },
                    { key: 'broker', label: 'Broker' },
                    { key: 'driver', label: 'Driver' },
                    { key: 'status', label: 'Status', render: r => <StatusBadge status={r.status} /> },
                    { key: 'days', label: 'Days waiting', render: r => <span style={{ fontWeight: 600, color: r.days >= 46 ? 'var(--red)' : r.days >= 31 ? 'var(--yellow)' : undefined }}>{r.days}</span> },
                    { key: 'amount', label: 'Amount', render: r => <span style={{ color: 'var(--green)', fontWeight: 600 }}>{money(r.amount)}</span> },
                  ]}
                />
              </>
            )}
          </Section>
        </div>
      )}
    </div>
  );
}
