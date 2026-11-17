import React, { useEffect, useState } from 'react';
import { analyticsApi } from '../utils/api';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Legend, PieChart, Pie, Cell
} from 'recharts';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const COLORS = ['#f97316','#3b82f6','#10b981','#8b5cf6','#f59e0b','#ef4444'];

const CustomTooltip = ({ active, payload, label, prefix = '', suffix = '' }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'var(--bg-card)', border: '1px solid var(--border)',
      borderRadius: 8, padding: '10px 14px', fontSize: 13,
    }}>
      <p style={{ color: 'var(--text-muted)', marginBottom: 4 }}>{label}</p>
      {payload.map(p => (
        <p key={p.name} style={{ color: p.color, fontWeight: 600 }}>
          {p.name}: {prefix}{typeof p.value === 'number' ? p.value.toLocaleString() : p.value}{suffix}
        </p>
      ))}
    </div>
  );
};

export default function Analytics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('all');

  useEffect(() => {
    const params = {};
    const now = new Date();
    if (period === '30d') params.startDate = new Date(now - 30 * 86400000).toISOString();
    if (period === '90d') params.startDate = new Date(now - 90 * 86400000).toISOString();
    if (period === 'ytd') params.startDate = new Date(now.getFullYear(), 0, 1).toISOString();
    analyticsApi.getSummary(params).then(r => setData(r.data)).finally(() => setLoading(false));
  }, [period]);

  if (loading) return <div className="page-loader"><div className="spinner" /></div>;

  const t = data?.totals || {};

  // Format monthly data
  const monthlyData = (data?.revenueByMonth || []).map(m => ({
    month: `${MONTHS[m._id.month - 1]} ${m._id.year}`,
    Revenue: m.revenue,
    Loads: m.loads,
    Miles: m.miles,
  }));

  // Status pie
  const pieData = (data?.statusBreakdown || []).map(s => ({ name: s._id, value: s.count }));

  return (
    <div className="page-enter">
      <div className="page-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1 className="section-title"><span className="accent">Analytics</span></h1>
        <div style={{ display: 'flex', gap: 6 }}>
          {[['all','All Time'],['ytd','YTD'],['90d','90 Days'],['30d','30 Days']].map(([v, l]) => (
            <button
              key={v}
              className={`btn ${period === v ? 'btn-primary' : 'btn-secondary'} btn-sm`}
              onClick={() => setPeriod(v)}
            >{l}</button>
          ))}
        </div>
      </div>

      {/* KPI Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 28 }}>
        {[
          { label: 'Total Revenue', value: `$${(t.totalRevenue || 0).toLocaleString()}`, color: 'orange' },
          { label: 'Total Loads', value: (t.totalLoads || 0).toLocaleString(), color: 'blue' },
          { label: 'Total Miles', value: (t.totalMiles || 0).toLocaleString(), color: 'green' },
          { label: 'Avg Rate', value: `$${(t.avgRate || 0).toFixed(0)}`, color: 'purple' },
          { label: 'Avg Rate/Mile', value: `$${(t.avgRatePerMile || 0).toFixed(2)}`, color: 'orange' },
          { label: 'Rev/Mile', value: t.totalMiles ? `$${(t.totalRevenue / t.totalMiles).toFixed(2)}` : '—', color: 'blue' },
        ].map(k => (
          <div key={k.label} className={`stat-card ${k.color}`}>
            <div className="stat-label">{k.label}</div>
            <div className="stat-value" style={{ fontSize: 22 }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Revenue Chart */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ fontWeight: 600, marginBottom: 20, fontSize: 15 }}>Revenue Over Time</div>
        {monthlyData.length === 0 ? (
          <div className="empty-state"><p>No data available yet</p></div>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="month" stroke="var(--text-muted)" tick={{ fontSize: 11 }} />
              <YAxis stroke="var(--text-muted)" tick={{ fontSize: 11 }} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
              <Tooltip content={<CustomTooltip prefix="$" />} />
              <Line type="monotone" dataKey="Revenue" stroke="var(--accent)" strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Two charts */}
      <div className="analytics-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
        <div className="card">
          <div style={{ fontWeight: 600, marginBottom: 20, fontSize: 15 }}>Loads per Month</div>
          {monthlyData.length === 0 ? <div className="empty-state"><p>No data yet</p></div> : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="month" stroke="var(--text-muted)" tick={{ fontSize: 11 }} />
                <YAxis stroke="var(--text-muted)" tick={{ fontSize: 11 }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="Loads" fill="var(--blue)" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card">
          <div style={{ fontWeight: 600, marginBottom: 20, fontSize: 15 }}>Load Status Distribution</div>
          {pieData.length === 0 ? <div className="empty-state"><p>No data yet</p></div> : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent*100).toFixed(0)}%`} labelLine={false} fontSize={11}>
                  {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Leaderboards */}
      <div className="analytics-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <div className="card">
          <div style={{ fontWeight: 600, marginBottom: 16, fontSize: 15 }}>Top Drivers by Revenue</div>
          {(data?.topDrivers || []).length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>No data yet</p>
          ) : (data?.topDrivers || []).map((d, i) => (
            <div key={d._id} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%',
                background: i === 0 ? 'rgba(249,115,22,0.2)' : 'var(--bg-secondary)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 700, color: i === 0 ? 'var(--accent)' : 'var(--text-muted)',
              }}>{i + 1}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 500, fontSize: 14 }}>{d.name}</div>
                <div style={{ display: 'flex', gap: 12, fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                  <span>{d.loads} loads</span>
                  <span>{(d.miles || 0).toLocaleString()} mi</span>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontWeight: 700, color: 'var(--green)' }}>${(d.revenue || 0).toLocaleString()}</div>
                {d.miles > 0 && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>${(d.revenue / d.miles).toFixed(2)}/mi</div>}
              </div>
            </div>
          ))}
        </div>

        <div className="card">
          <div style={{ fontWeight: 600, marginBottom: 16, fontSize: 15 }}>Top Brokers by Revenue</div>
          {(data?.topBrokers || []).length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>No data yet</p>
          ) : (data?.topBrokers || []).map((b, i) => (
            <div key={b._id} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%',
                background: i === 0 ? 'rgba(59,130,246,0.2)' : 'var(--bg-secondary)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 700, color: i === 0 ? 'var(--blue)' : 'var(--text-muted)',
              }}>{i + 1}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 500, fontSize: 14 }}>{b.name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{b.loads} loads</div>
              </div>
              <div style={{ fontWeight: 700, color: 'var(--green)' }}>${(b.revenue || 0).toLocaleString()}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}