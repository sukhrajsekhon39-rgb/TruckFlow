import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { authApi, apiError } from '../utils/api';
import { useAuth } from '../auth/AuthContext';
import AuthShell, { AuthTitle, AuthField, SubmitButton } from '../auth/AuthShell';
import useDocumentTitle from '../utils/useDocumentTitle';

export default function Login() {
  useDocumentTitle('Sign in');
  const navigate = useNavigate();
  const location = useLocation();
  const { signedIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const notice = location.state?.expired ? 'Your session ended. Sign in again to pick up where you left off.'
    : location.state?.reset ? 'Password updated.' : null;

  const submit = async e => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await authApi.login({ email, password });
      signedIn(data);
      const from = location.state?.from;
      navigate(from && from.startsWith('/') && !from.startsWith('//') ? from : '/dashboard', { replace: true });
    } catch (err) {
      setError(apiError(err, 'Sign in failed. Please try again.'));
      setPassword('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell lede="Loads, drivers, brokers and invoices, in one quiet place to run the whole fleet.">
      <form className="auth-form" onSubmit={submit} noValidate>
        <AuthTitle eyebrow="Welcome back" title="Sign in" />

        {notice && !error && <div className="auth-alert info" role="status">{notice}</div>}
        {error && <div className="auth-alert error" role="alert">{error}</div>}

        <AuthField
          id="login-email" label="Email" type="email" placeholder="you@company.com"
          value={email} onChange={e => setEmail(e.target.value)}
          autoComplete="email" autoFocus required
        />
        <AuthField
          id="login-password" label="Password" type="password" placeholder="Your password"
          value={password} onChange={e => setPassword(e.target.value)}
          autoComplete="current-password" required
          aside={<Link className="auth-link" to="/forgot-password" style={{ fontSize: 13.5 }}>Forgot password?</Link>}
        />

        <SubmitButton loading={loading} loadingText="Signing in…">Sign in<ArrowRight size={15} strokeWidth={1.7} /></SubmitButton>

        <div className="auth-sep" />
        <div className="auth-foot">New to TruckFlow? <Link className="auth-link" to="/signup">Create your company account</Link></div>
      </form>
    </AuthShell>
  );
}
