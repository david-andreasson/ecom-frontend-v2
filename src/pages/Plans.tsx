import React, { useEffect, useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Plans: React.FC = () => {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  useEffect(() => {
    const hasForm = !!sessionStorage.getItem('horoscopeForm');
    if (!hasForm) {
      setError('Please start from the landing page to provide your details.');
    }
  }, []);

  const handleMockPay = async () => {
    setSubmitting(true);
    setError(null);
    setNotice(null);
    try {
      if (!user?.token) {
        setError('Please sign in to continue… Redirecting to login');
        const returnTo = encodeURIComponent(`${location.pathname}${location.search || ''}`);
        setTimeout(() => navigate(`/login?returnTo=${returnTo}`, { replace: true }), 1200);
        return;
      }
      const res = await fetch('/api/users/me/checkout/mock-pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${user.token}` },
        body: JSON.stringify({ sku: 'HOROSCOPE_PDF' })
      });
      if (!res.ok) throw new Error(await res.text());
      // On success: show short notice, then redirect to generator page
      setNotice('Payment successful. Redirecting…');
      setTimeout(() => navigate('/horoscope'), 1200);
    } catch (err: any) {
      setError(err?.message || 'Payment failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container">
      <h2>Choose your plan</h2>
      <p>Complete your purchase to generate your personalized PDF horoscope.</p>

      {error && <p style={{ color: 'orange' }}>{error} <Link to="/">Go to landing</Link></p>}
      {notice && <p style={{ color: '#16a34a' }}>{notice}</p>}

      <div className="grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
        <div className="card">
          <h3>Single horoscope</h3>
          <p className="muted">One-time purchase</p>
          <p style={{ fontSize: 24 }}><b>$1.99</b></p>
          <button className="btn btn-primary" disabled={submitting} onClick={handleMockPay}>
            {submitting ? 'Processing…' : 'Buy now'}
          </button>
        </div>

        <div className="card" style={{ opacity: .6 }}>
          <h3>Daily email – Weekly</h3>
          <p className="muted">Launching soon</p>
          <p style={{ fontSize: 24 }}><b>$4.99</b></p>
          <button className="btn" disabled>Coming soon</button>
        </div>

        <div className="card" style={{ opacity: .6 }}>
          <h3>Daily email – Yearly</h3>
          <p className="muted">Launching soon</p>
          <p style={{ fontSize: 24 }}><b>$199</b></p>
          <button className="btn" disabled>Coming soon</button>
        </div>
      </div>

      <div style={{ marginTop: '1rem' }}>
        <Link className="btn" to="/">Back</Link>
      </div>
    </div>
  );
};

export default Plans;
