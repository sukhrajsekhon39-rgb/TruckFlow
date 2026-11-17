import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { Save } from 'lucide-react';

export default function Settings() {
  const [company, setCompany] = useState(() => {
    try { return JSON.parse(localStorage.getItem('companyInfo') || '{}'); }
    catch { return {}; }
  });

  const set = (k, v) => setCompany(c => ({ ...c, [k]: v }));

  const save = () => {
    localStorage.setItem('companyInfo', JSON.stringify(company));
    toast.success('Settings saved!');
  };

  return (
    <div className="page-enter">
      <div style={{ marginBottom: 24 }}>
        <h1 className="section-title"><span className="accent">Settings</span></h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginTop: 4 }}>Company info used on invoices and reports</p>
      </div>

      <div style={{ maxWidth: 600 }}>
        <div className="card">
          <div style={{ fontWeight: 600, marginBottom: 20, fontSize: 15 }}>Company Information</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Company Name</label>
                <input className="form-control" value={company.name || ''} onChange={e => set('name', e.target.value)} placeholder="Smith Trucking LLC" />
              </div>
              <div className="form-group">
                <label className="form-label">Phone</label>
                <input className="form-control" value={company.phone || ''} onChange={e => set('phone', e.target.value)} placeholder="555-000-0000" />
              </div>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input className="form-control" type="email" value={company.email || ''} onChange={e => set('email', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Website</label>
                <input className="form-control" value={company.website || ''} onChange={e => set('website', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">MC Number</label>
                <input className="form-control mono" value={company.mc || ''} onChange={e => set('mc', e.target.value)} placeholder="MC-123456" />
              </div>
              <div className="form-group">
                <label className="form-label">DOT Number</label>
                <input className="form-control mono" value={company.dot || ''} onChange={e => set('dot', e.target.value)} placeholder="1234567" />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Company Address</label>
              <input className="form-control" value={company.address || ''} onChange={e => set('address', e.target.value)} placeholder="123 Main St, Chicago, IL 60601" />
            </div>
          </div>
          <div style={{ marginTop: 20 }}>
            <button className="btn btn-primary" onClick={save}><Save size={15} /> Save Settings</button>
          </div>
        </div>

        <div className="card" style={{ marginTop: 20 }}>
          <div style={{ fontWeight: 600, marginBottom: 12, fontSize: 15 }}>About TruckFlow</div>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
            TruckFlow is a local-first trucking management system built with React, Node.js, and MongoDB.
            Your data is stored locally on your machine. No cloud, no subscriptions.
          </p>
          <div style={{ marginTop: 16, display: 'flex', gap: 16, fontSize: 13, color: 'var(--text-muted)' }}>
            <span>Version 1.0.0</span>
            <span>·</span>
            <span>React + Node.js + MongoDB</span>
          </div>
        </div>
      </div>
    </div>
  );
}
