import React, { useMemo, useState } from 'react';
import { useCart } from '../context/CartContext';
import { purchase } from '../services/orderService';
import { useAuth } from '../context/AuthContext';
import { useLocation, useNavigate } from 'react-router-dom';

const Cart: React.FC = () => {
  const { items, updateQty, removeFromCart, clearCart, total } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canCheckout = useMemo(() => items.length > 0 && items.every(i => i.qty > 0), [items]);

  const onCheckout = async () => {
    setLoading(true);
    setMessage(null);
    setError(null);
    try {
      // Kräver inloggning
      if (!user?.token) {
        setMessage('Please complete your details to checkout…');
        const returnTo = encodeURIComponent(`${location.pathname}${location.search || ''}`);
        setTimeout(() => navigate(`/?focus=form&returnTo=${returnTo}`, { replace: true }), 900);
        return;
      }
      const payload = { items: items.map(i => ({ productId: i.id, quantity: i.qty })) };
      const res = await purchase(payload);
      setMessage(`Order created: ${res.orderId || res.orderNumber || ''}`.trim());
      clearCart();
    } catch (e: any) {
      setError(e?.message || 'Checkout failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container" style={{ display: 'grid', gap: 12 }}>
      <h2>Cart</h2>
      {items.length === 0 && <p>Your cart is empty.</p>}
      <div style={{ display: 'grid', gap: 8 }}>
        {items.map(i => (
          <div key={i.id} className="card" style={{ display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'center', gap: 8 }}>
            <div>
              <div style={{ fontWeight: 600 }}>{i.name}</div>
              <div style={{ color: '#9aa3af' }}>{i.price.toFixed(2)} USD</div>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input type="number" min={1} max={99} value={i.qty} onChange={e => updateQty(i.id, Number(e.target.value))} style={{ width: 72 }} />
              <button className="btn" onClick={() => removeFromCart(i.id)}>Remove</button>
            </div>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <strong>Total: {total.toFixed(2)} USD</strong>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn" onClick={clearCart} disabled={items.length === 0}>Clear</button>
          <button className="btn btn-primary" onClick={onCheckout} disabled={!canCheckout || loading}>{loading ? 'Processing…' : 'Checkout'}</button>
        </div>
      </div>
      {message && <p style={{ color: '#16a34a' }}>{message}</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}
    </div>
  );
};

export default Cart;
