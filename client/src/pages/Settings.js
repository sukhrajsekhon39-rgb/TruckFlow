import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Save, Building2, UserRound, KeyRound, MonitorSmartphone, AlertTriangle } from 'lucide-react';
import { authApi, apiError } from '../utils/api';
import { useAuth } from '../auth/AuthContext';
import { PasswordRules, passwordOk } from '../auth/AuthShell';
import useDocumentTitle from '../utils/useDocumentTitle';

function Section({ icon: Icon, title, sub, children, danger }) {
  return (
    <section className="card settings-card" style={danger ? { borderColor: 'var(--red-border)' } : undefined}>
      <div className="settings-head">
        <span className={`settings-icon${danger ? ' is-danger' : ''}`}><Icon size={17} strokeWidth={1.8} /></span>
        <div>
          <h2>{title}</h2>
          {sub && <p>{sub}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

function Field({ id, label, error, hint, children }) {
  return (
    <div className="form-group">
      <label className="form-label" htmlFor={id}>{label}</label>
      {children}
      {error ? <div className="settings-error">{error}</div> : hint ? <div className="settings-hint">{hint}</div> : null}
    </div>
  );
}

// ── Company profile (printed on invoices) ──
function CompanySection() {
  const { company, user, setCompany } = useAuth();
  const isOwner = user?.role === 'owner';
  const [form, setForm] = useState(() => ({ ...company }));
  const [prefilled, setPrefilled] = useState(false);
  const [saving, setSaving] = useState(false);

  // Earlier versions kept invoice details in this browser only. Offer them once.
  useEffect(() => {
    try {
      const old = JSON.parse(localStorage.getItem('companyInfo') || 'null');
      if (!old) return;
      const empty = ['phone', 'address', 'mc', 'dot', 'website'].every(k => !company?.[k]);
      if (empty) {
        setForm(f => ({ ...f, ...Object.fromEntries(Object.entries(old).filter(([k, v]) => v && ['phone', 'address', 'mc', 'dot', 'website', 'email'].includes(k))) }));
        setPrefilled(true);
      }
    } catch {}
  }, [company]);

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));
  const save = async e => {
    e.preventDefault();
    if (!form.name?.trim()) { toast.error('Company name can’t be empty.'); return; }
    setSaving(true);
    try {
      const { data } = await authApi.updateCompany(form);
      setCompany(data.company);
      setForm(data.company);
      try { localStorage.removeItem('companyInfo'); } catch {}
      setPrefilled(false);
      toast.success('Company details saved');
    } catch (err) { toast.error(apiError(err)); }
    finally { setSaving(false); }
  };

  return (
    <Section icon={Building2} title="Company" sub="Shown on your invoices. Only people in your company can see it.">
      {prefilled && <div className="settings-note">We filled in details saved in this browser by an earlier version. Save to keep them.</div>}
      <form onSubmit={save} className="settings-form">
        <fieldset disabled={!isOwner} className="settings-fieldset">
          <div className="grid-2">
            <Field id="co-name" label="Company name"><input id="co-name" className="form-control" value={form.name || ''} onChange={set('name')} autoComplete="organization" /></Field>
            <Field id="co-phone" label="Phone"><input id="co-phone" className="form-control" value={form.phone || ''} onChange={set('phone')} placeholder="555-000-0000" autoComplete="tel" /></Field>
            <Field id="co-email" label="Billing email"><input id="co-email" className="form-control" type="email" value={form.email || ''} onChange={set('email')} /></Field>
            <Field id="co-web" label="Website"><input id="co-web" className="form-control" value={form.website || ''} onChange={set('website')} /></Field>
            <Field id="co-mc" label="MC number"><input id="co-mc" className="form-control mono" value={form.mc || ''} onChange={set('mc')} placeholder="MC-123456" /></Field>
            <Field id="co-dot" label="DOT number"><input id="co-dot" className="form-control mono" value={form.dot || ''} onChange={set('dot')} placeholder="1234567" /></Field>
          </div>
          <Field id="co-address" label="Address"><input id="co-address" className="form-control" value={form.address || ''} onChange={set('address')} placeholder="123 Main St, Chicago, IL 60601" autoComplete="street-address" /></Field>
        </fieldset>
        {isOwner
          ? <div><button className="btn btn-primary" disabled={saving}>{saving ? <div className="spinner" /> : <Save size={15} />} Save company</button></div>
          : <div className="settings-hint">Only the account owner can change company details.</div>}
      </form>
    </Section>
  );
}

// ── Your profile ──
function ProfileSection() {
  const { user, setUser } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const emailChanged = email.trim().toLowerCase() !== (user?.email || '');

  const save = async e => {
    e.preventDefault();
    setErrors({});
    setSaving(true);
    try {
      const { data } = await authApi.updateMe({ name, email: email.trim(), currentPassword: emailChanged ? currentPassword : undefined });
      setUser(data.user);
      setCurrentPassword('');
      toast.success('Profile saved');
    } catch (err) {
      const field = err.response?.data?.field;
      if (field) setErrors({ [field]: apiError(err) }); else toast.error(apiError(err));
    } finally { setSaving(false); }
  };

  return (
    <Section icon={UserRound} title="Your profile" sub="How you sign in and how you appear in TruckFlow.">
      <form onSubmit={save} className="settings-form">
        <div className="grid-2">
          <Field id="me-name" label="Name" error={errors.name}><input id="me-name" className="form-control" value={name} onChange={e => setName(e.target.value)} autoComplete="name" /></Field>
          <Field id="me-email" label="Sign-in email" error={errors.email}><input id="me-email" className="form-control" type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" /></Field>
        </div>
        {emailChanged && (
          <Field id="me-pw" label="Current password" error={errors.currentPassword} hint="Needed to change your sign-in email.">
            <input id="me-pw" className="form-control" type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} autoComplete="current-password" />
          </Field>
        )}
        <div><button className="btn btn-primary" disabled={saving}>{saving ? <div className="spinner" /> : <Save size={15} />} Save profile</button></div>
      </form>
    </Section>
  );
}

// ── Password ──
function PasswordSection() {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const save = async e => {
    e.preventDefault();
    if (!passwordOk(next)) { setErrors({ newPassword: 'Your new password needs all three items below.' }); return; }
    setErrors({});
    setSaving(true);
    try {
      await authApi.changePassword(current, next);
      setCurrent(''); setNext('');
      toast.success('Password changed. Other devices were signed out.');
    } catch (err) {
      const field = err.response?.data?.field;
      if (field) setErrors({ [field]: apiError(err) }); else toast.error(apiError(err));
    } finally { setSaving(false); }
  };

  return (
    <Section icon={KeyRound} title="Password" sub="Changing it signs out every other device.">
      <form onSubmit={save} className="settings-form">
        <div className="grid-2">
          <Field id="pw-current" label="Current password" error={errors.currentPassword}>
            <input id="pw-current" className="form-control" type="password" value={current} onChange={e => setCurrent(e.target.value)} autoComplete="current-password" />
          </Field>
          <Field id="pw-new" label="New password" error={errors.newPassword}>
            <input id="pw-new" className="form-control" type="password" value={next} onChange={e => setNext(e.target.value)} autoComplete="new-password" />
          </Field>
        </div>
        <PasswordRules value={next} />
        <div><button className="btn btn-primary" disabled={saving || !current || !next}>{saving ? <div className="spinner" /> : <KeyRound size={15} />} Change password</button></div>
      </form>
    </Section>
  );
}

// ── Sessions ──
function SessionsSection() {
  const { signedOut } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const run = async () => {
    setBusy(true);
    try { await authApi.logoutAll(); signedOut(); navigate('/login', { replace: true }); }
    catch (err) { toast.error(apiError(err)); setBusy(false); }
  };
  return (
    <Section icon={MonitorSmartphone} title="Signed-in devices" sub="Lost a phone or used a shared computer? End every session, including this one.">
      <div><button className="btn btn-secondary" onClick={run} disabled={busy}>{busy ? <div className="spinner" /> : null} Sign out everywhere</button></div>
    </Section>
  );
}

// ── Delete company ──
function DangerSection() {
  const { company, user, signedOut } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  if (user?.role !== 'owner') return null;
  const matches = typed.trim() === (company?.name || '').trim();

  const run = async e => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await authApi.deleteAccount(password);
      signedOut();
      navigate('/', { replace: true });
      toast.success('Your company and its data were deleted.');
    } catch (err) { setError(apiError(err)); setBusy(false); }
  };

  return (
    <Section icon={AlertTriangle} title="Delete company" sub="Permanently deletes your company, its loads, drivers, trucks, trailers, brokers, documents and every account in it." danger>
      {!open ? (
        <div><button className="btn btn-danger" onClick={() => setOpen(true)}>Delete company…</button></div>
      ) : (
        <form onSubmit={run} className="settings-form">
          <div className="settings-note is-danger">This can’t be undone. Download anything you need first.</div>
          <div className="grid-2">
            <Field id="del-name" label={`Type “${company?.name}” to confirm`}>
              <input id="del-name" className="form-control" value={typed} onChange={e => setTyped(e.target.value)} autoComplete="off" />
            </Field>
            <Field id="del-pw" label="Your password" error={error}>
              <input id="del-pw" className="form-control" type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" />
            </Field>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button type="button" className="btn btn-secondary" onClick={() => { setOpen(false); setTyped(''); setPassword(''); setError(''); }}>Cancel</button>
            <button className="btn btn-danger" disabled={!matches || !password || busy}>{busy ? <div className="spinner" /> : null} Delete permanently</button>
          </div>
        </form>
      )}
    </Section>
  );
}

export default function Settings() {
  useDocumentTitle('Settings');
  const { company } = useAuth();
  return (
    <div className="page-enter">
      <div style={{ marginBottom: 24 }}>
        <h1 className="section-title"><span className="accent">Settings</span></h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginTop: 4 }}>{company?.name}</p>
      </div>
      <div className="settings-stack">
        <CompanySection />
        <ProfileSection />
        <PasswordSection />
        <SessionsSection />
        <DangerSection />
      </div>
    </div>
  );
}
