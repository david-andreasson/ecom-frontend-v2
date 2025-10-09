import React, { useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import { useAuth } from '../context/AuthContext';

const Login: React.FC = () => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const returnTo = useMemo(() => {
    const params = new URLSearchParams(location.search);
    const rt = params.get('returnTo');
    return rt ? decodeURIComponent(rt) : '/';
  }, [location.search]);
  const { setUser } = useAuth();

  const signIn = async (signinEmail: string, signinPassword: string) => {
    const res = await fetch('/api/users/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: signinEmail, username: signinEmail, password: signinPassword })
    });
    if (!res.ok) throw new Error('Incorrect email or password');
    const data = await res.json();
    const token = data.accessToken || data.token || data.jwt || data.id_token;
    if (!token) throw new Error('Login failed: invalid server response');
    localStorage.setItem('token', token);
    try {
      const decoded: any = jwtDecode(token);
      const role = decoded?.role;
      const emailFromToken = decoded?.email || decoded?.sub || signinEmail;
      setUser({ token, email: emailFromToken, role });
    } catch {
      setUser({ token });
    }
    try {
      const userInfo = data.user || { firstName: data.firstName, lastName: data.lastName, email: data.email || signinEmail };
      if (userInfo && (userInfo.firstName || userInfo.lastName || userInfo.email)) {
        localStorage.setItem('user', JSON.stringify(userInfo));
      }
    } catch {}
    window.dispatchEvent(new Event('auth-changed'));
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (mode === 'register') {
        if (password !== confirmPassword) throw new Error('Passwords do not match');
        const resp = await fetch('/api/users/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, username: email, password, firstName, lastName })
        });
        if (!resp.ok) {
          let msg = 'Registration failed';
          try { const t = await resp.text(); if (t) { try { const o = JSON.parse(t); msg = o.message || o.error || msg; } catch { msg = t; } } } catch {}
          throw new Error(msg);
        }
        // Auto‑sign‑in after successful registration
        await signIn(email, password);
      } else {
        await signIn(email, password);
      }
      navigate(returnTo || '/', { replace: true });
    } catch (err: any) {
      setError(err?.message || 'Could not sign in. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card" style={{ maxWidth: 520, margin: '1rem auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0 }}>{mode === 'login' ? 'Sign in' : 'Create account'}</h2>
        <button type="button" className="btn" onClick={() => { setError(null); setMode(mode === 'login' ? 'register' : 'login'); }}>
          {mode === 'login' ? 'New here? Create account' : 'Already have an account? Sign in here'}
        </button>
      </div>
      <form onSubmit={onSubmit} className="form-grid" style={{ marginTop: 12 }}>
        <label>Email<input type="email" value={email} onChange={e => setEmail(e.target.value)} required /></label>
        <label>Password<input type="password" value={password} onChange={e => setPassword(e.target.value)} required /></label>
        {mode === 'register' && (
          <>
            <label>Confirm password<input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required /></label>
            <label>First name<input value={firstName} onChange={e => setFirstName(e.target.value)} required /></label>
            <label>Last name<input value={lastName} onChange={e => setLastName(e.target.value)} required /></label>
          </>
        )}
        <button className="btn btn-primary" type="submit" disabled={loading}>
          {loading ? (mode === 'login' ? 'Signing in…' : 'Creating account…') : (mode === 'login' ? 'Sign in' : 'Create account')}
        </button>
      </form>
      {error && <p style={{ color: 'red', marginTop: '.5rem' }}>{error}</p>}
    </div>
  );
};

export default Login;
