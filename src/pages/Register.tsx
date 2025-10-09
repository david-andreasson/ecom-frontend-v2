import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const Register: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password !== confirmPassword) { setError('Passwords do not match.'); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/users/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, username: email, password, firstName, lastName })
      });
      if (!res.ok) {
        let msg = 'Registration failed.';
        try {
          const text = await res.text();
          if (text) { try { const obj = JSON.parse(text); msg = obj.message || obj.error || msg; } catch { msg = text; } }
        } catch {}
        throw new Error(msg);
      }
      // Always redirect to login after successful registration
      try { localStorage.removeItem('token'); } catch {}
      navigate('/login');
    } catch (err: any) {
      setError(err?.message || 'Something went wrong. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card" style={{ maxWidth: 520, margin: '1rem auto' }}>
      <h2>Create a new account</h2>
      <form onSubmit={onSubmit} className="form-grid">
        <label>Email<input type="email" value={email} onChange={e => setEmail(e.target.value)} required /></label>
        <label>Password<input type="password" value={password} onChange={e => setPassword(e.target.value)} required /></label>
        <label>Confirm password<input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required /></label>
        <label>First name<input value={firstName} onChange={e => setFirstName(e.target.value)} required /></label>
        <label>Last name<input value={lastName} onChange={e => setLastName(e.target.value)} required /></label>
        <button className="btn btn-primary" type="submit" disabled={loading}>{loading ? 'Registering…' : 'Register'}</button>
      </form>
      {error && <p style={{ color: 'red', marginTop: '.5rem' }}>{error}</p>}
    </div>
  );
};

export default Register;
