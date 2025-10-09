import React, { useEffect, useMemo, useState } from 'react';
import { productService, type ProductResponse } from '../services/productService';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useLocation, useNavigate } from 'react-router-dom';

const Products: React.FC = () => {
  const [items, setItems] = useState<ProductResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);
  const { addToCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await productService.listAllProducts();
        if (active) setItems(data);
      } catch (e: any) {
        if (active) setError(e?.message || 'Kunde inte ladda produkter');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  const pick = useMemo(() => {
    const byName = items.find(p => (p.name || '').toLowerCase().includes('horoscope'));
    return byName || items[0];
  }, [items]);

  const mainCard = useMemo(() => {
    if (!pick) {
      return (
        <div className="card" style={{ display: 'grid', gap: 12 }}>
          <img src="/horoscope-placeholder.svg" alt="AI Horoscope" style={{ width: '100%', borderRadius: 8 }} />
          <div style={{ fontWeight: 700, fontSize: 18 }}>AI Horoscope (PDF)</div>
          <div style={{ color: '#9aa3af' }}>Personalized AI horoscope delivered as a downloadable PDF.</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>— USD</span>
            <button className="btn" disabled title="Product not yet available in backend">Unavailable</button>
          </div>
        </div>
      );
    }
    const price = Number(pick.price) || 0;
    const currency = pick.currency || 'SEK';
    const image = (Array.isArray(pick.images) && pick.images[0]) || pick.imageUrl || pick.thumbnailUrl || '/horoscope-placeholder.svg';
    const onAdd = () => {
      // Allow guests to add items to the cart
      addToCart({ id: pick.id, name: pick.name, price });
    };

    const onBuyNow = async () => {
      setError(null);
      setNotice(null);
      if (!user?.token) {
        const returnTo = encodeURIComponent(`${location.pathname}${location.search || ''}`);
        setNotice('Please complete your details to continue…');
        setTimeout(() => navigate(`/?focus=form&returnTo=${returnTo}`, { replace: true }), 900);
        return;
      }
      try {
        setPaying(true);
        const res = await fetch('/api/users/me/checkout/mock-pay', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${user.token}` },
          body: JSON.stringify({ sku: 'HOROSCOPE_PDF' })
        });
        if (!res.ok) throw new Error(await res.text());
        setNotice('Payment successful. Redirecting…');
        setTimeout(() => navigate('/horoscope'), 1200);
      } catch (e: any) {
        setError(e?.message || 'Purchase failed');
      } finally {
        setPaying(false);
      }
    };
    return (
      <div className="card" style={{ display: 'grid', gap: 12 }}>
        <img src={image} alt={pick.name} style={{ width: '100%', borderRadius: 8 }} onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/horoscope-placeholder.svg'; }} />
        <div style={{ fontWeight: 700, fontSize: 18 }}>{pick.name}</div>
        <div style={{ color: '#9aa3af' }}>{pick.description || 'Personalized horoscope as PDF.'}</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
          <span>{price.toFixed(2)} {currency}</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn" onClick={onAdd}>Add to cart</button>
            <button className="btn btn-primary" onClick={onBuyNow} disabled={paying}>{paying ? 'Processing…' : 'Buy now'}</button>
          </div>
        </div>
      </div>
    );
  }, [pick, addToCart]);

  const subscriptionCard = (
    <div className="card" style={{ display: 'grid', gap: 12, position: 'relative', opacity: 0.9 }}>
      <img src="/horoscope-placeholder.svg" alt="AI Horoscope Subscription" style={{ width: '100%', borderRadius: 8, filter: 'grayscale(30%)' }} />
      <div style={{ fontWeight: 700, fontSize: 18, display: 'flex', alignItems: 'center', gap: 8 }}>
        AI Horoscope Subscription (Daily PDF)
        <span style={{ fontSize: 12, background: '#334155', color: '#e5e7eb', padding: '2px 8px', borderRadius: 999 }}>Coming soon</span>
      </div>
      <div style={{ color: '#9aa3af' }}>Get a personalized AI horoscope in your inbox every day. Launching soon.</div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>— USD/month</span>
        <button className="btn" disabled title="Launching soon">Not available yet</button>
      </div>
    </div>
  );

  const yearlySubscriptionCard = (
    <div className="card" style={{ display: 'grid', gap: 12, position: 'relative', opacity: 0.9 }}>
      <img src="/horoscope-placeholder.svg" alt="AI Horoscope Subscription (Yearly)" style={{ width: '100%', borderRadius: 8, filter: 'grayscale(30%)' }} />
      <div style={{ fontWeight: 700, fontSize: 18, display: 'flex', alignItems: 'center', gap: 8 }}>
        AI Horoscope Subscription (Yearly PDF)
        <span style={{ fontSize: 12, background: '#334155', color: '#e5e7eb', padding: '2px 8px', borderRadius: 999 }}>Coming soon</span>
      </div>
      <div style={{ color: '#9aa3af' }}>Yearly plan with daily personalized AI horoscope emails. Launching soon.</div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>— USD/year</span>
        <button className="btn" disabled title="Launching soon">Not available yet</button>
      </div>
    </div>
  );

  return (
    <div className="container" style={{ display: 'grid', gap: 12 }}>
      <h2>Products</h2>
      {loading && <p>Loading…</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {notice && <p style={{ color: '#16a34a' }}>{notice}</p>}
      <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fill,minmax(320px,1fr))' }}>
        {mainCard}
        {subscriptionCard}
        {yearlySubscriptionCard}
      </div>
    </div>
  );
};

export default Products;
