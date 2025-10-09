import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';

const Profile: React.FC = () => {
  const { user, logout } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [me, setMe] = useState<{ firstName?: string; lastName?: string; email?: string } | null>(null);

  useEffect(() => {
    const run = async () => {
      setError(null);
      if (!user?.token) return;
      setLoading(true);
      try {
        const res = await fetch('/api/users/me', {
          headers: { 'Accept': 'application/json', 'Authorization': `Bearer ${user.token}` }
        });
        if (!res.ok) throw new Error(`Kunde inte hämta profil (${res.status})`);
        const data = await res.json();
        setMe(data);
      } catch (e: any) {
        setError(e?.message || 'Kunde inte hämta profil');
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [user?.token]);

  if (!user?.token) {
    return (
      <div className="card" style={{ maxWidth: 520, margin: '1rem auto' }}>
        <h2>User profile</h2>
        <p>You are not logged in.</p>
      </div>
    );
  }

  return (
    <div className="card" style={{ maxWidth: 520, margin: '1rem auto' }}>
      <h2>User profile</h2>
      {loading ? <p>Loading…</p> : (
        <>
          {error && <p style={{ color: 'red' }}>{error}</p>}
          <p><strong>Email:</strong> {me?.email || '—'}</p>
          <p><strong>Name:</strong> {(me?.firstName || '') + ' ' + (me?.lastName || '')}</p>
          <div style={{ display: 'flex', gap: '.5rem', marginTop: '.5rem' }}>
            <a className="btn" href="/orders">Order history</a>
            <button className="btn" onClick={logout}>Log out</button>
          </div>
        </>
      )}
    </div>
  );
};

export default Profile;
