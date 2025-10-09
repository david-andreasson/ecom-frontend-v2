import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';

type Form = {
  name: string;
  gender: string;
  birthDate: string;
  birthPlace: string;
  birthTime?: string;
};

const initial: Form = { name: '', gender: '', birthDate: '', birthPlace: '', birthTime: '' };

const HoroscopePage: React.FC = () => {
  const [form, setForm] = useState<Form>(initial);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [id, setId] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const { user } = useAuth();

  // Prefill from landing form (stored in sessionStorage)
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('horoscopeForm');
      if (!raw) return;
      const d = JSON.parse(raw) || {};
      setForm({
        name: d.name || '',
        gender: d.gender || '',
        birthDate: d.birthDate || '',
        birthPlace: d.birthPlace || '',
        birthTime: d.birthTime || ''
      });
    } catch (_) { /* ignore parse errors */ }
  }, []);

  const onChange = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [k]: e.target.value });

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setId(null);
    try {
      if (!user?.token) {
        setError('Please sign in to generate your horoscope… Redirecting to login');
        const returnTo = encodeURIComponent('/horoscope');
        setTimeout(() => { window.location.href = `/login?returnTo=${returnTo}`; }, 1200);
        return;
      }
      const payload: any = {
        name: form.name.trim(),
        gender: form.gender.trim(),
        birthDate: form.birthDate.trim(),
        birthPlace: form.birthPlace.trim()
      };
      if (form.birthTime && form.birthTime.trim()) payload.birthTime = form.birthTime.trim();

      const res = await fetch('/api/horoscope', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${user.token}` },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      const newId = data?.id || null;
      setId(newId);
      if (newId) setShowPreview(true);
    } catch (err: any) {
      setError(err?.message || 'Request failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card" style={{ maxWidth: 560, margin: '1rem auto' }}>
      <h2>Personal AI Horoscope (PDF)</h2>
      {!id && (
        <form onSubmit={onSubmit} className="form-grid">
          <label>Name<input required value={form.name} onChange={onChange('name')} placeholder="Anna Andersson" /></label>
          <label>Gender<input required value={form.gender} onChange={onChange('gender')} placeholder="female" /></label>
          <label>Birth date<input required value={form.birthDate} onChange={onChange('birthDate')} placeholder="1990-07-12" /></label>
          <label>Birth place<input required value={form.birthPlace} onChange={onChange('birthPlace')} placeholder="Gothenburg" /></label>
          <label>Birth time (optional)<input value={form.birthTime} onChange={onChange('birthTime')} placeholder="13:45" /></label>
          <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
            <button className="btn btn-primary" type="submit" disabled={loading}>{loading ? 'Generating…' : 'Generate PDF'}</button>
          </div>
        </form>
      )}

      {id && (
        <>
          <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap', marginTop: '.5rem' }}>
            <button className="btn" type="button" onClick={() => setShowPreview(v => !v)}>
              {showPreview ? 'Hide inline preview' : 'Show inline preview'}
            </button>
            <a className="btn" href={`/api/horoscope/${id}/download`}>Download PDF</a>
            <a className="btn" href={`/api/horoscope/${id}/download?inline=true`} target="_blank" rel="noreferrer">Open PDF in new tab</a>
          </div>
          {showPreview && (
            <div style={{ marginTop: '1rem' }}>
              <iframe
                title="Horoscope PDF"
                src={`/api/horoscope/${id}/download?inline=true#zoom=page-width`}
                style={{ width: '100%', height: '70vh', border: '1px solid #333', borderRadius: 6 }}
              />
            </div>
          )}
        </>
      )}

      {error && <p style={{ color: 'red', marginTop: '.5rem' }}>{error}</p>}
    </div>
  );
};

export default HoroscopePage;
