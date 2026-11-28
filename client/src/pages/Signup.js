import React, { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Lock } from 'lucide-react';
import { authApi, apiError } from '../utils/api';
import { useAuth } from '../auth/AuthContext';
import AuthShell, { AuthTitle, AuthField, PasswordRules, passwordOk, SubmitButton } from '../auth/AuthShell';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Signup() {
  const navigate = useNavigate();
  const { signedIn } = useAuth();
  const [form, setForm] = useState({ name: '', companyName: '', email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const refs = { name: useRef(), companyName: useRef(), email: useRef(), password: useRef() };

  const set = k => e => { setForm(f => ({ ...f, [k]: e.target.value })); setErrors(x => ({ ...x, [k]: undefined })); };

  const validate = () => {
    const x = {};
    if (!form.name.trim()) x.name = 'Enter your name.';
    if (!form.companyName.trim()) x.companyName = 'Enter your company name.';
    if (!EMAIL_RE.test(form.email.trim())) x.email = 'Enter a valid email address.';
    if (!passwordOk(form.password)) x.password = 'Your password needs all three items below.';
    return x;
  };

  const submit = async e => {
    e.preventDefault();
    setError('');
    const x = validate();
    setErrors(x);
    const first = Object.keys(x)[0];
    if (first) { refs[first].current?.focus(); return; }
    setLoading(true);
    try {
      const { data } = await authApi.signup({ ...form, email: form.email.trim() });
      signedIn(data);
      navigate('/dashboard', { replace: true, state: { welcome: true } });
    } catch (err) {
      const field = err.response?.data?.field;
      if (field && refs[field]) { setErrors({ [field]: apiError(err) }); refs[field].current?.focus(); }
      else setError(apiError(err, 'We couldn’t create your account. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      headline={['Your fleet,', 'your books.']}
      lede="Set up TruckFlow for your company in a minute."
      points={[
        'A private workspace for your company. Other companies never see your loads, drivers or customers.',
        'Track loads from pickup to paid, with documents attached.',
        'Invoices made from your own company details.',
      ]}
    >
      <form className="auth-form" onSubmit={submit} noValidate>
        <AuthTitle eyebrow="Get started" title="Create your account" />

        {error && <div className="auth-alert error" role="alert">{error}</div>}

        <AuthField id="su-name" label="Your name" placeholder="Jordan Smith" value={form.name} onChange={set('name')}
          autoComplete="name" error={errors.name} inputRef={refs.name} autoFocus />
        <AuthField id="su-company" label="Company name" placeholder="Smith Trucking LLC" value={form.companyName} onChange={set('companyName')}
          autoComplete="organization" error={errors.companyName} inputRef={refs.companyName} />
        <AuthField id="su-email" label="Work email" type="email" placeholder="you@company.com" value={form.email} onChange={set('email')}
          autoComplete="email" error={errors.email} inputRef={refs.email} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <AuthField id="su-password" label="Password" type="password" placeholder="Choose a password" value={form.password} onChange={set('password')}
            autoComplete="new-password" error={errors.password} inputRef={refs.password} />
          <PasswordRules value={form.password} />
        </div>

        <SubmitButton loading={loading} loadingText="Creating your account…">Create account<ArrowRight size={15} strokeWidth={1.7} /></SubmitButton>

        <div className="auth-fine"><Lock size={13} />Your password is stored only as a secure hash. Nobody at TruckFlow can read it.</div>
        <div className="auth-sep" />
        <div className="auth-foot">Already have an account? <Link className="auth-link" to="/login">Sign in</Link></div>
      </form>
    </AuthShell>
  );
}
