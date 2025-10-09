import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { jwtDecode } from 'jwt-decode';

type Form = {
  firstName: string;
  lastName: string;
  gender: string;
  year: string;
  month: string; // 1-12
  day: string;   // 1-31 (validated by year/month)
  birthPlace: string;
  birthTime?: string;
  email?: string;
  gdprConsent: boolean;
};

const initial: Form = { firstName: '', lastName: '', gender: '', year: '', month: '', day: '', birthPlace: '', birthTime: '', email: '', gdprConsent: false };

const Landing: React.FC = () => {
  const [form, setForm] = useState<Form>(initial);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const formRef = useRef<HTMLDivElement | null>(null);
  const { user, setUser } = useAuth();
  const showFocusNotice = (() => {
    const params = new URLSearchParams(location.search);
    return params.get('focus') === 'form';
  })();

  const policyRegex = useMemo(() => /^(?=.*[A-Za-z])(?=.*\d).{8,}$/, []);
  const meetsPolicy = useMemo(() => policyRegex.test(password), [password, policyRegex]);
  const matchOk = useMemo(() => !!confirmPassword && password === confirmPassword, [password, confirmPassword]);

  // If redirected with focus=form, scroll the form into view
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const focus = params.get('focus');
    if (focus === 'form' && formRef.current) {
      // Scroll with room for the sticky header
      formRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      // Small extra offset to avoid clipping under the header
      setTimeout(() => window.scrollBy({ top: -16, left: 0, behavior: 'instant' as ScrollBehavior }), 250);
    }
  }, [location.search]);

  const onChange = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm({ ...form, [k]: e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value });

  const onContinue = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    try {
      // Basic validation
      if (!form.firstName || !form.lastName || !form.gender || !form.year || !form.month || !form.day || !form.birthPlace) {
        throw new Error('Please fill in all required fields');
      }
      if (!form.gdprConsent) {
        throw new Error('Please accept the GDPR disclaimer to continue');
      }

      // Build ISO birthDate and normalized object for generator
      const y = parseInt(form.year, 10);
      const m = parseInt(form.month, 10);
      const d = parseInt(form.day, 10);
      if (Number.isNaN(y) || Number.isNaN(m) || Number.isNaN(d)) throw new Error('Invalid date');
      const daysInMonth = new Date(y, m, 0).getDate();
      if (d < 1 || d > daysInMonth) throw new Error('Invalid day for selected month/year');
      const pad = (n: number) => n.toString().padStart(2, '0');
      const birthDate = `${y}-${pad(m)}-${pad(d)}`;
      const name = `${form.firstName.trim()} ${form.lastName.trim()}`.trim();

      // Build optional birth time HH:mm if both provided
      const hh = (form as any).hour as string | undefined;
      const mm = (form as any).minute as string | undefined;
      const birthTime = hh && mm ? `${hh.padStart(2,'0')}:${mm.padStart(2,'0')}` : undefined;

      const normalized = {
        name,
        gender: form.gender,
        birthDate,
        birthPlace: form.birthPlace,
        birthTime,
        email: (form.email || '').trim() || undefined
      };

      sessionStorage.setItem('horoscopeForm', JSON.stringify(normalized));

      // If not signed in, create an account (email + password) and auto sign-in before continuing
      if (!user?.token) {
        if (!normalized.email) {
          throw new Error('Please provide an email to create your account, or use "Sign in".');
        }
        if (!password || !confirmPassword) throw new Error('Please enter and confirm your password.');
        if (password !== confirmPassword) throw new Error('Passwords do not match.');
        if (!policyRegex.test(password)) throw new Error('Password must be at least 8 characters and include letters and numbers.');

        // 1) Register
        const regRes = await fetch('/api/users/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: normalized.email, username: normalized.email, password, firstName: form.firstName, lastName: form.lastName })
        });
        if (!regRes.ok) {
          let msg = 'Registration failed. If you already have an account, please sign in.';
          try { const t = await regRes.text(); if (t) { try { const o = JSON.parse(t); msg = o.message || o.error || msg; } catch { msg = t; } } } catch {}
          // If backend returns 409 we assume the email is already registered
          try { if (regRes.status === 409) msg = 'Email is already in use. Please sign in.'; } catch {}
          throw new Error(msg);
        }

        // 2) Login
        const loginRes = await fetch('/api/users/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: normalized.email, username: normalized.email, password })
        });
        if (!loginRes.ok) throw new Error('Could not sign in after registration. Please use the Sign in link.');
        const data = await loginRes.json();
        const token = data.accessToken || data.token || data.jwt || data.id_token;
        if (!token) throw new Error('Login failed: invalid server response');
        localStorage.setItem('token', token);
        try {
          const decoded: any = jwtDecode(token);
          const role = decoded?.role;
          const emailFromToken = decoded?.email || decoded?.sub || normalized.email;
          setUser({ token, email: emailFromToken, role });
        } catch {
          setUser({ token });
        }
        try {
          const userInfo = data.user || { firstName: form.firstName, lastName: form.lastName, email: normalized.email };
          if (userInfo && (userInfo.firstName || userInfo.lastName || userInfo.email)) {
            localStorage.setItem('user', JSON.stringify(userInfo));
          }
        } catch {}
        window.dispatchEvent(new Event('auth-changed'));
        setNotice('Account created and signed in. Redirecting…');
      }

      const params = new URLSearchParams(location.search);
      const rt = params.get('returnTo');
      const target = rt ? decodeURIComponent(rt) : '/products';
      setTimeout(() => navigate(target), 800);
    } catch (err: any) {
      setError(err?.message || 'Validation failed');
    }
  };

  return (
    <div>
      <section className="hero" style={{ textAlign: 'center', padding: '1.5rem 0' }}>
        <h1>Your daily AI‑horoscope</h1>
        <p>Your moment of quiet clarity, generated with code and care.</p>
        <div className="hero-image" style={{ marginTop: '.5rem' }}>
          <img src="/hero.jpg" alt="Meditating AI under the moon" />
        </div>
      </section>

      <div ref={formRef} className="card" style={{ maxWidth: 560, margin: '1rem auto', scrollMarginTop: 20 }}>
        {showFocusNotice && (
          <div style={{
            background: 'rgba(34,197,94,.12)',
            border: '1px solid rgba(34,197,94,.35)',
            color: '#bbf7d0',
            padding: '8px 10px',
            borderRadius: 8,
            margin: '10px 0'
          }}>
            You’re almost there — please complete your details to continue to checkout.
          </div>
        )}
        {notice && (
          <div style={{
            background: 'rgba(34,197,94,.12)',
            border: '1px solid rgba(34,197,94,.35)',
            color: '#bbf7d0',
            padding: '8px 10px',
            borderRadius: 8,
            margin: '10px 0'
          }}>
            {notice}
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0 }}>Tell us about you</h2>
          {(() => {
            const params = new URLSearchParams(location.search);
            const rt = params.get('returnTo') || '/products';
            const returnTo = encodeURIComponent(rt);
            return (
              <Link className="btn" to={`/login?returnTo=${returnTo}`}>Already have an account? Sign in here</Link>
            );
          })()}
        </div>
        <form onSubmit={onContinue} className="form-grid">
          <label>First name<input required value={form.firstName} onChange={onChange('firstName')} placeholder="Anna" /></label>
          <label>Last name<input required value={form.lastName} onChange={onChange('lastName')} placeholder="Andersson" /></label>
          <label>Gender
            <select required value={form.gender} onChange={onChange('gender') as any}>
              <option value="">Select…</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other / Prefer not to say</option>
            </select>
          </label>
          <div>
            <div style={{ marginBottom: 4 }}>Birth date</div>
            <div className="segmented" style={{ display: 'flex', gap: '.5rem' }}>
              <select required value={form.year} onChange={onChange('year')} aria-label="Year">
                <option value="">Year</option>
                {Array.from({ length: new Date().getFullYear() - 1899 }, (_, i) => (new Date().getFullYear() - i)).map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
              <select required value={form.month} onChange={onChange('month')} aria-label="Month">
                <option value="">Month</option>
                {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                  <option key={m} value={m}>{m.toString().padStart(2, '0')}</option>
                ))}
              </select>
              <select required value={form.day} onChange={onChange('day')} aria-label="Day">
                <option value="">Day</option>
                {(() => {
                  const y = parseInt(form.year || '0', 10);
                  const m = parseInt(form.month || '0', 10);
                  const days = (!Number.isNaN(y) && !Number.isNaN(m) && m >= 1 && m <= 12) ? new Date(y, m, 0).getDate() : 31;
                  return Array.from({ length: days }, (_, i) => i + 1).map(d => (
                    <option key={d} value={d}>{d.toString().padStart(2, '0')}</option>
                  ));
                })()}
              </select>
            </div>
          </div>
          <label>Birth place<input required value={form.birthPlace} onChange={onChange('birthPlace')} placeholder="Gothenburg" /></label>
          <div>
            <div style={{ marginBottom: 4 }}>Birth time (optional)</div>
            <div className="segmented" style={{ display: 'flex', gap: '.5rem' }}>
              <select value={(form as any).hour || ''} onChange={(e) => setForm({ ...form, ...(form as any), hour: e.target.value })} aria-label="Hour">
                <option value="">Hr</option>
                {Array.from({ length: 24 }, (_, i) => i).map(h => (
                  <option key={h} value={h.toString().padStart(2,'0')}>{h.toString().padStart(2,'0')}</option>
                ))}
              </select>
              <select value={(form as any).minute || ''} onChange={(e) => setForm({ ...form, ...(form as any), minute: e.target.value })} aria-label="Minute">
                <option value="">Min</option>
                {Array.from({ length: 60 }, (_, i) => i).map(m => (
                  <option key={m} value={m.toString().padStart(2,'0')}>{m.toString().padStart(2,'0')}</option>
                ))}
              </select>
            </div>
          </div>
          <label>Email{!user?.token ? ' (required)' : ' (optional)'}<input type="email" value={form.email} onChange={onChange('email')} placeholder="you@example.com" required={!user?.token} /></label>
          {!user?.token && (
            <>
              <label>Password
                <div style={{ display: 'flex', gap: 8 }}>
                  <input type={showPwd ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} required style={{ flex: 1 }} />
                  <button type="button" className="btn" onClick={() => setShowPwd(v => !v)}>{showPwd ? 'Hide' : 'Show'}</button>
                </div>
              </label>
              <label>Confirm password
                <div style={{ display: 'flex', gap: 8 }}>
                  <input type={showConfirmPwd ? 'text' : 'password'} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required style={{ flex: 1 }} />
                  <button type="button" className="btn" onClick={() => setShowConfirmPwd(v => !v)}>{showConfirmPwd ? 'Hide' : 'Show'}</button>
                </div>
              </label>
              <div style={{ display: 'grid', gap: 4, marginTop: 4 }}>
                <small style={{ color: meetsPolicy ? '#22c55e' : '#ef4444' }}>
                  {meetsPolicy ? '✓ Meets password policy' : '• Password must be at least 8 characters and include letters and numbers'}
                </small>
                <small style={{ color: matchOk ? '#22c55e' : '#ef4444' }}>
                  {matchOk ? '✓ Passwords match' : '• Passwords must match'}
                </small>
              </div>
            </>
          )}
          <label style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
            <input type="checkbox" checked={form.gdprConsent} onChange={onChange('gdprConsent')} />
            <span>I consent to the processing of my personal data according to the Privacy Policy (GDPR).</span>
          </label>
          <div style={{ display: 'flex', gap: '.5rem' }}>
            <button className="btn btn-primary" type="submit">Continue</button>
          </div>
        </form>
        {error && <p style={{ color: 'red', marginTop: '.5rem' }}>{error}</p>}
      </div>
    </div>
  );
};

export default Landing;
