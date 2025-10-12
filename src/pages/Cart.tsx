import React, { useMemo, useState } from 'react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useLocation, useNavigate } from 'react-router-dom';

const Cart: React.FC = () => {
  const { items, updateQty, removeFromCart, clearCart, total } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canCheckout = useMemo(() => items.length > 0 && items.every(i => i.qty > 0), [items]);

  const onCheckout = () => {
    setMessage(null);
    setError(null);
    if (!user?.token) {
      setMessage('Please complete your details to checkout…');
      const returnTo = encodeURIComponent(`${location.pathname}${location.search || ''}`);
      setTimeout(() => navigate(`/?focus=form&returnTo=${returnTo}`, { replace: true }), 900);
      return;
    }
    navigate('/checkout');
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
              <div style={{ color: '#9aa3af' }}>{i.price.toFixed(2)} SEK</div>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input type="number" min={1} max={99} value={i.qty} onChange={e => updateQty(i.id, Number(e.target.value))} style={{ width: 72 }} />
              <button className="btn" onClick={() => removeFromCart(i.id)}>Remove</button>
            </div>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <strong>Total: {total.toFixed(2)} SEK</strong>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn" onClick={clearCart} disabled={items.length === 0}>Clear</button>
          <button className="btn btn-primary" onClick={onCheckout} disabled={!canCheckout}>Checkout</button>
        </div>
      </div>
      {message && <p style={{ color: '#16a34a' }}>{message}</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}
    </div>
  );
};

export default Cart;
